import { Router } from "express";
import Repo from "../models/Repo.js";
import { parseGitHubUrl } from "../utils/parseGitHubUrl.js";
import { getLatestSHA, parseGitHubError } from "../services/github.js";
import { getCachedRepo } from "../services/cache.js";
import { analyzeRepo } from "../services/analyzeRepo.js";

// Only import the queue on non-Vercel environments (avoids Redis connection error on Vercel)
let repoQueue = null;
if (!process.env.VERCEL) {
  const { repoQueue: q } = await import("../services/queue.js");
  repoQueue = q;
}

const router = Router();

router.post("/", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  let owner, repo;
  try {
    ({ owner, repo } = parseGitHubUrl(url));
  } catch {
    return res.status(400).json({ error: "invalid_github_url" });
  }

  try {
    // ── Cache check (always) ──────────────────────────────────────────────
    const cached = await getCachedRepo(url);
    if (cached) {
      const latestSHA = await getLatestSHA(owner, repo).catch(() => null);
      if (!latestSHA || cached.latestSHA === latestSHA) {
        return res.json({ ...cached, repoId: cached._id, status: "completed" });
      }
    }

    // ── Upsert Repo doc ───────────────────────────────────────────────────
    const doc = await Repo.findOneAndUpdate(
      { url },
      { url, owner, name: repo, status: "processing", stage: "" },
      { upsert: true, new: true }
    );
    const repoId = doc._id.toString();

    // ── Vercel: synchronous processing ────────────────────────────────────
    if (process.env.VERCEL) {
      const result = await analyzeRepo({ url, owner, repo, repoId });
      return res.json({ ...result, repoId, status: "completed" });
    }

    // ── Non-Vercel: queue via BullMQ ──────────────────────────────────────
    // Check if already queued
    const existing = await Repo.findOne({ url, status: "processing", _id: { $ne: doc._id } });
    if (existing) {
      return res.json({ jobId: existing._id.toString(), status: "processing" });
    }

    const job = await repoQueue.add("analyzeRepo", { url, owner, repo, repoId });
    return res.json({ jobId: job.id, repoId, status: "processing" });
  } catch (err) {
    const ghErr = parseGitHubError(err);
    if (ghErr.error !== "github_error") return res.status(400).json(ghErr);
    console.error("[repo route]", err.message);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
});

export default router;
