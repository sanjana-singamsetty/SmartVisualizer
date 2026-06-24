import { Router } from "express";
import Repo from "../models/Repo.js";
import { getCachedContext, setCachedContext } from "../services/cache.js";
import { askContext } from "../services/llm.js";

const router = Router();

router.post("/", async (req, res) => {
  const { repoId, path, questionType, customQuestion } = req.body;

  if (!repoId || !path || !questionType) {
    return res.status(400).json({ error: "repoId, path, questionType are required" });
  }

  try {
    // Check cache first
    const cached = await getCachedContext(repoId, path, questionType);
    if (cached) return res.json({ answer: cached, cached: true });

    // Pull subtree from MongoDB (no GitHub re-fetch)
    const doc = await Repo.findById(repoId).select("treeData").lean();
    if (!doc) return res.status(404).json({ error: "repo_not_found" });

    // Build a file list for the requested path
    const fileList = buildFileList(doc.treeData, path);

    // Ask the LLM
    const answer = await askContext({
      path,
      fileList,
      questionType,
      customQuestion: questionType === "custom" ? customQuestion : null,
    });

    // Cache the answer
    const question =
      customQuestion ||
      {
        what_does_it_do: "What does this do?",
        connections: "What does it connect to?",
        refactor: "Anything worth refactoring?",
      }[questionType] ||
      "General overview";

    await setCachedContext(repoId, path, questionType, question, answer);

    return res.json({ answer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "llm_error", message: err.message });
  }
});

/**
 * Walks the tree to find the node at `path` and returns a formatted file list.
 */
function buildFileList(tree, path) {
  const parts = path.split("/");
  let node = tree;
  for (const part of parts) {
    if (!node?.children) break;
    node = node.children.find((c) => c.name === part) || null;
  }
  if (!node) return path;

  if (!node.children) {
    return `${node.name} (${node.value?.toLocaleString()} bytes)`;
  }

  return node.children
    .map((c) => `${c.name} — ${c.value?.toLocaleString() ?? "?"}  bytes`)
    .join("\n");
}

export default router;
