/**
 * tools.js — Tool definitions and implementations for the ReAct agent.
 *
 * Tools are backed by data already in MongoDB (FileChunk, Repo.treeData,
 * Repo.commitsData) — no extra GitHub API calls needed at query time.
 *
 * Interview talking point:
 * "I used Groq's native function-calling API rather than text-parsing ReAct,
 *  so tool dispatch is reliable and structured regardless of how the model
 *  phrases its response."
 */

import FileChunk from "../models/FileChunk.js";
import Repo from "../models/Repo.js";
import { searchChunks } from "./vectorStore.js";

// ── OpenAI-compatible tool definitions (passed in `tools` param) ─────────────

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read the content of a specific file in the repository. Use when you need to inspect actual code.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to repo root, e.g. src/app.js",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_code",
      description:
        "Search for code related to a topic or keyword across all indexed files. Returns the most relevant code snippets.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural-language query, e.g. 'authentication middleware' or 'database connection'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description:
        "List the files and subdirectories inside a directory path. Use to explore the project structure.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory path relative to repo root, e.g. 'src' or 'src/routes'. Use '' for root.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_commits",
      description:
        "Get recent commit messages and authors. Useful for understanding recent changes or contributors.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of most recent commits to return (max 20)",
          },
        },
        required: [],
      },
    },
  },
];

// ── Tool implementations ─────────────────────────────────────────────────────

/**
 * Execute a named tool and return the observation string.
 */
export async function executeTool(toolName, args, repoId) {
  switch (toolName) {
    case "read_file":     return await toolReadFile(args.path, repoId);
    case "search_code":   return await toolSearchCode(args.query, repoId);
    case "list_directory":return await toolListDirectory(args.path || "", repoId);
    case "get_commits":   return await toolGetCommits(args.limit, repoId);
    default:
      return `Unknown tool: ${toolName}`;
  }
}

async function toolReadFile(path, repoId) {
  if (!path) return "Error: path is required";

  // Prefer longest stored chunk that matches the path
  const chunks = await FileChunk.find({ repoId, path }).sort({ chunkIndex: 1 }).lean();
  if (!chunks.length) return `File not found in index: ${path}. Try list_directory to see available files.`;

  const content = chunks.map(c => c.chunk).join("\n…\n");
  return `File: ${path}\n\`\`\`\n${content.slice(0, 2000)}${content.length > 2000 ? "\n…(truncated)" : ""}\n\`\`\``;
}

async function toolSearchCode(query, repoId) {
  if (!query) return "Error: query is required";

  const results = await searchChunks(repoId, query, 4);
  if (!results.length) return "No relevant code found for that query.";

  return results.map((r, i) =>
    `[${i + 1}] ${r.path}\n\`\`\`\n${r.chunk.slice(0, 400)}${r.chunk.length > 400 ? "\n…" : ""}\n\`\`\``
  ).join("\n\n");
}

async function toolListDirectory(dirPath, repoId) {
  const doc = await Repo.findById(repoId).select("treeData").lean();
  if (!doc?.treeData) return "Tree data not available";

  const node = findNode(doc.treeData, dirPath);
  if (!node) return `Directory not found: "${dirPath || "root"}"`;

  const items = (node.children || []).map(c =>
    c.children ? `📁 ${c.name}/` : `📄 ${c.name}${c.ext ? "" : ""} (${formatBytes(c.value || 0)})`
  );

  return `Contents of ${dirPath || "/"} (${items.length} items):\n${items.join("\n")}`;
}

async function toolGetCommits(limit = 10, repoId) {
  const doc = await Repo.findById(repoId).select("commitsData").lean();
  const commits = (doc?.commitsData || [])
    .slice(0, Math.min(Number(limit) || 10, 20));

  if (!commits.length) return "No commits found.";

  return commits.map(c => {
    const date    = c.commit?.author?.date?.slice(0, 10) || "?";
    const author  = c.commit?.author?.name || "?";
    const message = c.commit?.message?.split("\n")[0] || "?";
    return `${date} [${author}] ${message}`;
  }).join("\n");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function findNode(node, targetPath) {
  if (!node) return null;
  if (!targetPath || targetPath === "" || targetPath === "/") return node;

  const parts = targetPath.replace(/^\//, "").split("/");
  let current = node;
  for (const part of parts) {
    const child = (current.children || []).find(c => c.name === part);
    if (!child) return null;
    current = child;
  }
  return current;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
