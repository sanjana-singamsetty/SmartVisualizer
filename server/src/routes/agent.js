import { Router } from "express";
import Repo from "../models/Repo.js";
import { runReActAgent } from "../services/reactAgent.js";
import { getMemoryContext, extractAndStoreFacts } from "../services/memory.js";

const router = Router();

router.post("/", async (req, res) => {
  const { repoId, question } = req.body;
  if (!repoId || !question?.trim()) {
    return res.status(400).json({ error: "repoId and question are required" });
  }

  try {
    const doc = await Repo.findById(repoId)
      .select("owner name fileCount treeData commitsData branchesData overviewSummary ragReady")
      .lean();

    if (!doc) return res.status(404).json({ error: "repo_not_found" });

    // Build repo context
    const topFolders = doc.treeData?.children
      ?.filter(c => c.children).map(c => c.name).join(", ") || "none";

    const memoryContext = await getMemoryContext(repoId);

    const repoContext = [
      `Repo: ${doc.owner}/${doc.name}`,
      `Files: ${doc.fileCount ?? "?"}`,
      `Top folders: ${topFolders}`,
      `Structure: ${doc.overviewSummary?.structure || ""}`,
      `Commits: ${doc.overviewSummary?.commits || ""}`,
      memoryContext,
    ].filter(Boolean).join("\n");

    const { answer, trace } = await runReActAgent(question.trim(), repoContext, repoId);

    // Fire-and-forget memory extraction
    extractAndStoreFacts(repoId, question, answer);

    return res.json({ answer, trace });
  } catch (err) {
    console.error("[agent] Error:", err.message);
    const isRateLimit = err.status === 429 || err.message?.includes("rate");
    return res.status(500).json({
      error: "agent_error",
      message: isRateLimit
        ? "Groq rate limit hit — wait 30s and retry"
        : err.message,
    });
  }
});

export default router;
