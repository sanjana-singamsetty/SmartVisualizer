import { Router } from "express";
import Repo from "../models/Repo.js";
import { scoreRepo } from "../services/llm.js";

const router = Router();

router.post("/", async (req, res) => {
  const { repoId, force } = req.body;
  if (!repoId) return res.status(400).json({ error: "repoId is required" });

  try {
    const doc = await Repo.findById(repoId).lean();
    if (!doc) return res.status(404).json({ error: "repo_not_found" });
    if (doc.status !== "completed") return res.status(400).json({ error: "repo_not_ready" });

    // Serve cached score unless force refresh
    if (!force && doc.qualityScore?.scores?.readability != null) {
      return res.json(doc.qualityScore);
    }

    // Build scoring context — include signals the judge needs
    const topFolders = doc.treeData?.children?.filter(c => c.children).map(c => c.name).join(", ") || "none";
    const exts = collectExtensions(doc.treeData);
    const testCount  = Object.keys(exts).filter(e => e.match(/test|spec/i)).length;
    const totalFiles = doc.fileCount || 1;

    const context = [
      `Repo: ${doc.owner}/${doc.name}`,
      `Files: ${totalFiles}, Total size: ${doc.totalLines?.toLocaleString()} bytes`,
      `Top folders: ${topFolders}`,
      `File types present: ${Object.entries(exts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`${k}(${v})`).join(", ")}`,
      `Test files detected: ${testCount} (${((testCount/totalFiles)*100).toFixed(1)}%)`,
      `Commits: ${doc.commitsData?.length || "?"}`,
      `Branches: ${doc.branchesData?.branches?.length || "?"}`,
      `Structure summary: ${doc.overviewSummary?.structure || ""}`,
      `Commits summary: ${doc.overviewSummary?.commits || ""}`,
    ].join("\n");

    const result = await scoreRepo(context);
    const qualityScore = { ...result, generatedAt: new Date() };

    await Repo.findByIdAndUpdate(repoId, { qualityScore });
    return res.json(qualityScore);
  } catch (err) {
    console.error("[score] Error:", err.message);
    return res.status(500).json({ error: "score_error", message: err.message });
  }
});

// Walk treeData and count file extensions
function collectExtensions(node, counts = {}) {
  if (!node) return counts;
  if (!node.children && node.ext) counts[node.ext] = (counts[node.ext] || 0) + 1;
  (node.children || []).forEach(c => collectExtensions(c, counts));
  return counts;
}

export default router;
