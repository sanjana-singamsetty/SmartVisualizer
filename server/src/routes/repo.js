import { Router } from "express";
import Repo from "../models/Repo.js";
import { parseGitHubUrl } from "../utils/parseGitHubUrl.js";
import { getLatestSHA, parseGitHubError } from "../services/github.js";
import { getCachedRepo } from "../services/cache.js";
import { repoQueue } from "../services/queue.js";

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
    // L1+L2 cache check
    const cached = await getCachedRepo(url);
    if (cached) {
      // Staleness check (cheap — one API call)
      const latestSHA = await getLatestSHA(owner, repo).catch(() => null);
      if (!latestSHA || cached.latestSHA === latestSHA) {
        return res.json({ ...cached, repoId: cached._id, status: "completed" });
      }
      // Stale — fall through to re-analyze
    }

    // Check if already processing
    const existing = await Repo.findOne({ url, status: "processing" });
    if (existing) {
      return res.json({ jobId: existing._id.toString(), status: "processing" });
    }

    // Enqueue new analysis job
    const doc = await Repo.findOneAndUpdate(
      { url },
      { url, owner, name: repo, status: "processing" },
      { upsert: true, new: true }
    );

    const job = await repoQueue.add("analyzeRepo", { url, owner, repo, repoId: doc._id.toString() });

    return res.json({ jobId: job.id, repoId: doc._id.toString(), status: "processing" });
  } catch (err) {
    const ghErr = parseGitHubError(err);
    if (ghErr.error !== "github_error") return res.status(400).json(ghErr);
    console.error(err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
