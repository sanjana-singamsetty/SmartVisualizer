/**
 * analyzeRepo.js — core analysis pipeline, shared by:
 *   - repoWorker.js  (BullMQ async path — Render / local)
 *   - routes/repo.js (sync path — Vercel serverless)
 *
 * Interview talking point:
 * "I extracted the analysis logic into a pure service so the same code
 *  runs both in a BullMQ worker (Render) and synchronously in a
 *  serverless function (Vercel) without duplication."
 */

import Repo from "../models/Repo.js";
import { getTree, getCommits, getBranches, getLatestSHA, getFileContents } from "./github.js";
import { generateOverview } from "./llm.js";
import { setCachedRepo } from "./cache.js";
import { filterNoise } from "../utils/filterNoise.js";
import { buildTreeServer } from "../utils/buildTreeServer.js";
import { chunkText } from "./tfidf.js";
import { storeChunks } from "./vectorStore.js";

/**
 * Run the full repo analysis pipeline.
 *
 * @param {object} params
 * @param {string} params.url       — canonical GitHub URL
 * @param {string} params.owner     — repo owner
 * @param {string} params.repo      — repo name
 * @param {string} params.repoId    — MongoDB _id string
 * @param {Function} [params.onProgress] — optional progress callback (progress%, label)
 * @returns {Promise<object>} — the completed repo document
 */
export async function analyzeRepo({ url, owner, repo, repoId, onProgress = () => {} }) {
  const report = (pct, label) => onProgress(pct, label);

  // ─── 1. Fetch GitHub data ─────────────────────────────────────────────────
  report(10, "Fetching file tree…");
  const [rawTree, commits, branchesData, latestSHA] = await Promise.all([
    getTree(owner, repo),
    getCommits(owner, repo),
    getBranches(owner, repo),
    getLatestSHA(owner, repo),
  ]);

  // ─── 2. Process tree ──────────────────────────────────────────────────────
  report(35, "Analyzing structure…");
  const filtered  = filterNoise(rawTree);
  const treeData  = buildTreeServer(filtered);
  const fileCount = filtered.filter(i => i.type === "blob").length;
  const totalLines = filtered.reduce((s, i) => s + (i.size || 0), 0);

  // ─── 3. LLM overview summaries ────────────────────────────────────────────
  report(55, "Running AI on commits…");
  const treeContext = `${fileCount} files, top folders: ${
    treeData.children?.filter(c => c.children).map(c => c.name).join(", ")
  }`;
  const commitContext = commits.slice(0, 50).map(
    c => `${c.commit?.author?.date?.slice(0, 10)} ${c.commit?.author?.name}: ${c.commit?.message?.split("\n")[0]}`
  ).join("\n");
  const branchContext = `Default: ${branchesData.defaultBranch}. Branches: ${branchesData.branches.map(b => b.name).join(", ")}`;

  report(65, "Running AI on structure…");
  const [structureSummary, commitsSummary, branchesSummary] = await Promise.all([
    generateOverview("structure", treeContext),
    generateOverview("commits",   commitContext),
    generateOverview("branches",  branchContext),
  ]);

  // ─── 4. RAG indexing ──────────────────────────────────────────────────────
  report(72, "Indexing files for RAG…");
  let ragReady = false;
  try {
    const blobPaths = filtered
      .filter(i => i.type === "blob")
      .sort((a, b) => (a.size || 0) - (b.size || 0))
      .slice(0, 45)
      .map(i => i.path);

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
  } catch (ragErr) {
    console.warn("[analyzeRepo] RAG skipped:", ragErr.message);
  }

  // ─── 5. Persist to MongoDB + Redis ────────────────────────────────────────
  report(88, "Saving results…");
  const update = {
    status:    "completed",
    stage:     "",
    analyzedAt: new Date(),
    latestSHA,
    fileCount,
    totalLines,
    treeData,
    commitsData:  commits,
    branchesData,
    overviewSummary: {
      structure: structureSummary,
      commits:   commitsSummary,
      branches:  branchesSummary,
    },
    ragReady,
  };

  const savedDoc = await Repo.findByIdAndUpdate(
    repoId,
    { $set: update },
    { new: true }
  );

  await setCachedRepo(url, { ...update, _id: repoId, url, owner, name: repo });
  report(100, "");

  return savedDoc?.toObject() ?? { ...update, _id: repoId, url, owner, name: repo };
}
