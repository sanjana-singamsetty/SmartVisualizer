import { Router } from "express";
import Repo from "../models/Repo.js";
import { generateReadme } from "../services/llm.js";

const router = Router();

router.post("/", async (req, res) => {
  const { repoId } = req.body;
  if (!repoId) return res.status(400).json({ error: "repoId is required" });

  try {
    const doc = await Repo.findById(repoId).lean();
    if (!doc) return res.status(404).json({ error: "repo_not_found" });

    // Return cached readme if it exists
    if (doc.generatedReadme) return res.json({ readme: doc.generatedReadme });

    const topFolders = doc.treeData?.children
      ?.filter((c) => c.children)
      .map((c) => `${c.name}/`)
      .join(", ") || "none";

    const extensions = [...new Set(
      flattenExts(doc.treeData)
    )].slice(0, 12).join(", ");

    const repoContext = [
      `Repo name: ${doc.name}`,
      `Owner: ${doc.owner}`,
      `Total files: ${doc.fileCount ?? "?"}`,
      `Top-level folders: ${topFolders}`,
      `File extensions found: ${extensions}`,
      `Contributors: ${[...new Set((doc.commitsData || []).slice(0, 30).map(c => c.commit?.author?.name).filter(Boolean))].join(", ")}`,
      `Total commits: ${doc.commitsData?.length ?? "?"}`,
      `Branches: ${doc.branchesData?.branches?.map(b => b.name).join(", ") || "main"}`,
      `Overview: ${doc.overviewSummary?.structure || ""}`,
    ].join("\n");

    const readme = await generateReadme(repoContext);

    // Cache it on the repo doc
    await Repo.findByIdAndUpdate(repoId, { generatedReadme: readme });

    return res.json({ readme });
  } catch (err) {
    console.error("readme error:", err.message);
    return res.status(500).json({ error: "readme_error", message: err.message });
  }
});

function flattenExts(node, exts = new Set()) {
  if (!node) return exts;
  if (node.ext) exts.add(`.${node.ext}`);
  (node.children || []).forEach((c) => flattenExts(c, exts));
  return [...exts];
}

export default router;
