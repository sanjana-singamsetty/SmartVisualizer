import "dotenv/config";
import mongoose from "mongoose";
import { Worker } from "bullmq";
import Repo from "../src/models/Repo.js";
import { getTree, getCommits, getBranches, getLatestSHA, getFileContents } from "../src/services/github.js";
import { generateOverview } from "../src/services/llm.js";
import { setCachedRepo } from "../src/services/cache.js";
import { filterNoise } from "../src/utils/filterNoise.js";
import { buildTreeServer } from "../src/utils/buildTreeServer.js";
import { chunkText } from "../src/services/tfidf.js";
import { storeChunks } from "../src/services/vectorStore.js";

import { URL } from "url";
const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
const connection = {
  host:     redisUrl.hostname,
  port:     Number(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  tls:      redisUrl.protocol === "rediss:" ? {} : undefined,
};

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("[worker] MongoDB connected"))
  .catch((err) => console.error("[worker] MongoDB error:", err));

// Helper: update both BullMQ progress + MongoDB stage label
async function setStage(job, repoId, progress, label) {
  await job.updateProgress(progress);
  await Repo.findByIdAndUpdate(repoId, { stage: label });
}

const worker = new Worker(
  "repoAnalysis",
  async (job) => {
    const { url, owner, repo, repoId } = job.data;
    console.log(`[worker] Starting analysis: ${owner}/${repo}`);

    try {
      // ─── 1. Fetch GitHub data ─────────────────────────────────────────
      await setStage(job, repoId, 10, "Fetching file tree…");
      const [rawTree, commits, branchesData, latestSHA] = await Promise.all([
        getTree(owner, repo),
        getCommits(owner, repo),
        getBranches(owner, repo),
        getLatestSHA(owner, repo),
      ]);

      // ─── 2. Process tree ──────────────────────────────────────────────
      await setStage(job, repoId, 35, "Analyzing structure…");
      const filtered = filterNoise(rawTree);
      const treeData = buildTreeServer(filtered);
      const fileCount = filtered.filter((i) => i.type === "blob").length;
      const totalLines = filtered.reduce((sum, i) => sum + (i.size || 0), 0);

      // ─── 3. LLM overview summaries ────────────────────────────────────
      await setStage(job, repoId, 55, "Running AI on commits…");
      const treeContext = `${fileCount} files, top folders: ${treeData.children?.filter(c => c.children).map(c => c.name).join(", ")}`;
      const commitContext = commits.slice(0, 50).map(
        (c) => `${c.commit?.author?.date?.slice(0, 10)} ${c.commit?.author?.name}: ${c.commit?.message?.split("\n")[0]}`
      ).join("\n");
      const branchContext = `Default: ${branchesData.defaultBranch}. Branches: ${branchesData.branches.map(b => b.name).join(", ")}`;

      await setStage(job, repoId, 65, "Running AI on structure…");
      const [structureSummary, commitsSummary, branchesSummary] = await Promise.all([
        generateOverview("structure", treeContext),
        generateOverview("commits",   commitContext),
        generateOverview("branches",  branchContext),
      ]);

      // ─── 4. RAG indexing: fetch file contents + chunk + TF-IDF index ──
      await setStage(job, repoId, 72, "Indexing files for RAG…");
      let ragReady = false;
      try {
        const blobPaths = filtered
          .filter((i) => i.type === "blob")
          .sort((a, b) => (a.size || 0) - (b.size || 0)) // smaller files first
          .slice(0, 45)                                    // max 45 files
          .map((i) => i.path);

        const files = await getFileContents(owner, repo, blobPaths);
        const chunks = [];
        for (const { path, content } of files) {
          const ext = path.split(".").pop()?.toLowerCase() || "";
          const textChunks = chunkText(content);
          for (let i = 0; i < textChunks.length; i++) {
            chunks.push({ path, ext, chunk: textChunks[i], chunkIndex: i });
          }
        }
        await storeChunks(repoId, chunks);
        ragReady = chunks.length > 0;
        console.log(`[worker] RAG: indexed ${chunks.length} chunks from ${files.length} files`);
      } catch (ragErr) {
        // RAG indexing is non-fatal — chat still works with summary context
        console.warn("[worker] RAG indexing skipped:", ragErr.message);
      }

      // ─── 5. Persist to MongoDB + Redis ───────────────────────────────
      await setStage(job, repoId, 88, "Saving results…");
      const update = {
        status: "completed",
        stage: "",
        analyzedAt: new Date(),
        latestSHA,
        fileCount,
        totalLines,
        treeData,
        commitsData: commits,
        branchesData,
        overviewSummary: {
          structure: structureSummary,
          commits:   commitsSummary,
          branches:  branchesSummary,
        },
        ragReady,
      };

      await setCachedRepo(url, { ...update, _id: repoId, url, owner, name: repo });
      await job.updateProgress(100);
      console.log(`[worker] Done: ${owner}/${repo}`);
    } catch (err) {
      await Repo.findByIdAndUpdate(repoId, { status: "failed", stage: "" });
      throw err;
    }
  },
  { connection, concurrency: 3 }
);

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});
