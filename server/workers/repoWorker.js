import "dotenv/config";
import mongoose from "mongoose";
import { Worker } from "bullmq";
import Repo from "../src/models/Repo.js";
import { analyzeRepo } from "../src/services/analyzeRepo.js";

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

const worker = new Worker(
  "repoAnalysis",
  async (job) => {
    const { url, owner, repo, repoId } = job.data;
    console.log(`[worker] Starting analysis: ${owner}/${repo}`);

    try {
      await analyzeRepo({
        url, owner, repo, repoId,
        onProgress: async (pct, label) => {
          await job.updateProgress(pct);
          if (label !== undefined) {
            await Repo.findByIdAndUpdate(repoId, { stage: label });
          }
        },
      });
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
