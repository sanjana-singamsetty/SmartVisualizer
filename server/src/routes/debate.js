import { Router } from "express";
import Repo from "../models/Repo.js";
import { getCachedDebate, setCachedDebate } from "../services/cache.js";
import { runDebate } from "../services/llm.js";
import { detectDebateTopic } from "../utils/detectDebateTopic.js";

const router = Router();

router.post("/", async (req, res) => {
  const { repoId, force } = req.body;
  if (!repoId) return res.status(400).json({ error: "repoId is required" });

  try {
    // Serve from cache only if it has actual content (skip cache when force=true)
    if (!force) {
      const cached = await getCachedDebate(repoId);
      if (cached?.advocate && cached?.critic) return res.json(cached);
    }

    const doc = await Repo.findById(repoId).lean();
    if (!doc) return res.status(404).json({ error: "repo_not_found" });
    if (doc.status !== "completed") {
      return res.status(400).json({ error: "repo_not_ready" });
    }

    // Pick topic based on repo signals
    const topic = detectDebateTopic(doc);

    // Build concise repo context for the LLM (don't send full tree)
    const repoContext = buildDebateContext(doc);

    // Run 3-call debate pipeline
    const { advocate, critic, synthesis } = await runDebate(topic, repoContext);

    const debate = {
      topic,
      advocate,
      critic,
      synthesis,
      generatedAt: new Date(),
    };

    await setCachedDebate(repoId, debate);

    return res.json(debate);
  } catch (err) {
    console.error("[debate] Error:", err.message);
    const isRateLimit = err.status === 429 || err.message?.includes("rate");
    return res.status(500).json({
      error: "debate_error",
      message: isRateLimit
        ? "Groq API rate limit hit — wait 30s and retry"
        : err.message,
    });
  }
});

function buildDebateContext(doc) {
  const lines = [
    `Repo: ${doc.owner}/${doc.name}`,
    `Files: ${doc.fileCount ?? "?"}, Total size: ${doc.totalLines?.toLocaleString() ?? "?"}  bytes`,
    `Branches: ${doc.branchesData?.branches?.length ?? "?"} (default: ${doc.branchesData?.defaultBranch ?? "main"})`,
    `Commits: ${doc.commitsData?.length ?? "?"}`,
  ];

  // Top-level folders
  const topFolders = doc.treeData?.children
    ?.filter((c) => c.children)
    .map((c) => c.name)
    .join(", ");
  if (topFolders) lines.push(`Top-level folders: ${topFolders}`);

  return lines.join("\n");
}

export default router;
