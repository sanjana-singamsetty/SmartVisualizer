import { Router } from "express";
import { repoQueue } from "../services/queue.js";
import Repo from "../models/Repo.js";

const router = Router();

router.get("/:jobId", async (req, res) => {
  const { jobId } = req.params;

  try {
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
