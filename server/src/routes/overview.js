import { Router } from "express";
import Repo from "../models/Repo.js";

const router = Router();

router.get("/", async (req, res) => {
  const { repoId, view } = req.query;

  if (!repoId || !view) {
    return res.status(400).json({ error: "repoId and view are required" });
  }

  const validViews = ["structure", "commits", "branches"];
  if (!validViews.includes(view)) {
    return res.status(400).json({ error: "view must be one of: " + validViews.join(", ") });
  }

  const doc = await Repo.findById(repoId).select("overviewSummary").lean();
  if (!doc) return res.status(404).json({ error: "repo_not_found" });

  const summary = doc.overviewSummary?.[view];
  if (!summary) return res.status(404).json({ error: "summary_not_ready" });

  return res.json({ summary });
});

export default router;
