/**
 * vectorStore.js — store and search TF-IDF chunk vectors in MongoDB.
 *
 * storeChunks(repoId, chunks) — index a repo's file chunks
 * searchChunks(repoId, query, topK) — retrieve most relevant chunks
 */

import FileChunk from "../models/FileChunk.js";
import { tokenize, tf, buildIDF, tfidfVec, cosineSim } from "./tfidf.js";

/**
 * Index all chunks for a repo.
 * Replaces any previously indexed chunks for the same repo.
 *
 * @param {string} repoId
 * @param {{ path, ext, chunk, chunkIndex }[]} chunks  — pre-chunked text pieces
 */
export async function storeChunks(repoId, chunks) {
  if (!chunks.length) return;

  // Delete stale index for this repo
  await FileChunk.deleteMany({ repoId });

  const docs = chunks.map(({ path, ext, chunk, chunkIndex }) => {
    const tokens = tokenize(chunk);
    return {
      repoId,
      path,
      ext,
      chunkIndex,
      chunk,
      tfVec: tf(tokens),
    };
  });

  await FileChunk.insertMany(docs);
  console.log(`[vectorStore] Indexed ${docs.length} chunks for repo ${repoId}`);
}

/**
 * Find the top-k most relevant chunks for a query string.
 *
 * @param {string} repoId
 * @param {string} query
 * @param {number} topK
 * @returns {{ path, ext, chunk, score }[]}
 */
export async function searchChunks(repoId, query, topK = 5) {
  const allChunks = await FileChunk.find({ repoId }).lean();
  if (!allChunks.length) return [];

  // Build IDF from stored TF vectors
  const allTokenArrays = allChunks.map((c) => Object.keys(c.tfVec || {}));
  const idf = buildIDF(allTokenArrays);

  // Compute TF-IDF vector for the query
  const queryTokens = tokenize(query);
  const queryTF     = tf(queryTokens);
  const queryVec    = tfidfVec(queryTF, idf);

  // Score each chunk
  const scored = allChunks.map((c) => {
    const chunkVec = tfidfVec(c.tfVec || {}, idf);
    return {
      path:  c.path,
      ext:   c.ext,
      chunk: c.chunk,
      score: cosineSim(queryVec, chunkVec),
    };
  });

  // Sort descending, dedupe by path (keep best chunk per file), return topK
  scored.sort((a, b) => b.score - a.score);

  const seen = new Set();
  const results = [];
  for (const s of scored) {
    if (s.score < 0.01) break; // skip irrelevant
    if (!seen.has(s.path)) {
      seen.add(s.path);
      results.push(s);
    }
    if (results.length >= topK) break;
  }

  return results;
}
