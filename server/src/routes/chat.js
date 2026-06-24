import { Router } from "express";
import Repo from "../models/Repo.js";
import { chatAboutRepo } from "../services/llm.js";
import { searchChunks } from "../services/vectorStore.js";
import { getMemoryContext, extractAndStoreFacts } from "../services/memory.js";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";

const router = Router();

router.post("/", async (req, res) => {
  const { repoId, messages } = req.body;

  if (!repoId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "repoId and messages are required" });
  }

  try {
    const doc = await Repo.findById(repoId)
      .select("owner name fileCount totalLines treeData commitsData branchesData overviewSummary ragReady")
      .lean();

    if (!doc) return res.status(404).json({ error: "repo_not_found" });

    // ── Base context (always included) ──────────────────────────────
    const topFolders = doc.treeData?.children
      ?.filter((c) => c.children)
      .map((c) => c.name)
      .join(", ") || "none";

    const topAuthors = [...new Set(
      (doc.commitsData || []).slice(0, 20).map((c) => c.commit?.author?.name).filter(Boolean)
    )].join(", ");

    const baseContext = [
      `Repo: ${doc.owner}/${doc.name}`,
      `Files: ${doc.fileCount ?? "?"}, Total size: ${doc.totalLines?.toLocaleString() ?? "?"} bytes`,
      `Top-level folders: ${topFolders}`,
      `Contributors: ${topAuthors || "unknown"}`,
      `Branches: ${doc.branchesData?.branches?.length ?? "?"} (default: ${doc.branchesData?.defaultBranch ?? "main"})`,
      `Structure summary: ${doc.overviewSummary?.structure || ""}`,
      `Commits summary: ${doc.overviewSummary?.commits || ""}`,
    ].join("\n");

    // ── RAG retrieval — find relevant file chunks ────────────────────
    const userQuery = messages.filter((m) => m.role === "user").at(-1)?.content || "";
    let sources = [];
    let ragContext = "";

    if (doc.ragReady && userQuery) {
      sources = await searchChunks(repoId, userQuery, 5);
      if (sources.length) {
        const snippets = sources
          .map((s, i) =>
            `[Source ${i + 1}] ${s.path}\n\`\`\`\n${s.chunk.slice(0, 400)}${s.chunk.length > 400 ? "\n…" : ""}\n\`\`\``
          )
          .join("\n\n");
        ragContext = `\n\n--- Relevant file contents (retrieved via TF-IDF) ---\n${snippets}`;
      }
    }

    // ── Agent memory injection ───────────────────────────────────────
    const memoryContext = await getMemoryContext(repoId);
    const fullContext = baseContext + ragContext + memoryContext;

    // Keep last 10 messages to stay within context limits
    const trimmedHistory = messages.slice(-10);
    const reply = await chatAboutRepo(fullContext, trimmedHistory);

    // Fire-and-forget: extract facts from this exchange for future sessions
    extractAndStoreFacts(repoId, userQuery, reply);

    // Return sources alongside the reply so the UI can display them
    return res.json({
      reply,
      sources: sources.map((s) => ({
        path:    s.path,
        ext:     s.path.split(".").pop()?.toLowerCase() || "",
        snippet: s.chunk.slice(0, 200),
        score:   Math.round(s.score * 100) / 100,
      })),
    });
  } catch (err) {
    console.error("chat error:", err.message);
    return res.status(500).json({ error: "chat_error", message: err.message });
  }
});

// ── Streaming endpoint — SSE, text appears token-by-token ────────────────────
router.post("/stream", async (req, res) => {
  const { repoId, messages } = req.body;
  if (!repoId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "repoId and messages are required" });
  }

  // SSE headers
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    const doc = await Repo.findById(repoId)
      .select("owner name fileCount totalLines treeData commitsData branchesData overviewSummary ragReady")
      .lean();

    if (!doc) { send({ type: "error", message: "repo_not_found" }); return res.end(); }

    const topFolders = doc.treeData?.children?.filter(c => c.children).map(c => c.name).join(", ") || "none";
    const topAuthors = [...new Set((doc.commitsData || []).slice(0, 20).map(c => c.commit?.author?.name).filter(Boolean))].join(", ");

    const baseContext = [
      `Repo: ${doc.owner}/${doc.name}`,
      `Files: ${doc.fileCount ?? "?"}, Total size: ${doc.totalLines?.toLocaleString() ?? "?"} bytes`,
      `Top-level folders: ${topFolders}`,
      `Contributors: ${topAuthors || "unknown"}`,
      `Branches: ${doc.branchesData?.branches?.length ?? "?"} (default: ${doc.branchesData?.defaultBranch ?? "main"})`,
      `Structure summary: ${doc.overviewSummary?.structure || ""}`,
      `Commits summary: ${doc.overviewSummary?.commits || ""}`,
    ].join("\n");

    const userQuery = messages.filter(m => m.role === "user").at(-1)?.content || "";
    let sources = [];
    let ragContext = "";

    if (doc.ragReady && userQuery) {
      sources = await searchChunks(repoId, userQuery, 5);
      if (sources.length) {
        const snippets = sources.map((s, i) =>
          `[Source ${i + 1}] ${s.path}\n\`\`\`\n${s.chunk.slice(0, 400)}${s.chunk.length > 400 ? "\n…" : ""}\n\`\`\``
        ).join("\n\n");
        ragContext = `\n\n--- Relevant file contents ---\n${snippets}`;
      }
    }

    // Send sources first so the UI can show them while text streams
    if (sources.length) {
      send({
        type: "sources",
        data: sources.map(s => ({
          path:    s.path,
          ext:     s.path.split(".").pop()?.toLowerCase() || "",
          snippet: s.chunk.slice(0, 200),
          score:   Math.round(s.score * 100) / 100,
        })),
      });
    }

    const memoryContext = await getMemoryContext(repoId);
    const fullContext = baseContext + ragContext + memoryContext;
    const trimmedHistory = messages.slice(-10);

    // Stream the LLM response token by token
    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert code reviewer helping someone understand a GitHub repository. " +
            "Answer concisely and specifically. " +
            "If asked something not answerable from the provided context, say so honestly.\n\n" +
            `REPO CONTEXT:\n${fullContext}`,
        },
        ...trimmedHistory,
      ],
      max_tokens: 600,
      temperature: 0.4,
      stream: true,
    });

    let fullReply = "";
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        fullReply += token;
        send({ type: "token", text: token });
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

    // Fire-and-forget memory extraction
    extractAndStoreFacts(repoId, userQuery, fullReply);
  } catch (err) {
    console.error("[chat/stream] error:", err.message);
    send({ type: "error", message: err.message });
    res.end();
  }
});

export default router;
