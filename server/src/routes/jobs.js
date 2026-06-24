import { Router } from "express";
import Repo from "../models/Repo.js";

const router = Router();

router.get("/:jobId", async (req, res) => {
  const { jobId } = req.params;

  // On Vercel jobs are synchronous — no BullMQ queue to poll.
  if (process.env.VERCEL) {
    return res.status(404).json({ error: "job_not_found" });
  }

  try {
    // Lazy-import keeps queue.js (and its ioredis connection) out of Vercel cold starts.
    const { repoQueue } = await import("../services/queue.js");
    const job = await repoQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "job_not_found" });
    }

    const state    = await job.getState();
    const progress = job.progress || 0;

    if (state === "completed") {
      const result = await Repo.findById(job.data.repoId).lean();
      return res.json({ jobId, status: "completed", progress: 100, result });
    }

    if (state === "failed") {
      return res.json({ jobId, status: "failed", progress, error: job.failedReason });
    }

    // Return current stage label from MongoDB
    const repoDoc = await Repo.findById(job.data.repoId).select("stage").lean();
    const stage = repoDoc?.stage || "";
    return res.json({ jobId, status: "processing", progress, stage });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
