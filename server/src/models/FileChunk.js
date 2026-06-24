import mongoose from "mongoose";

/**
 * FileChunk — one text chunk from an indexed source file.
 * Stores the raw text (for showing as a source snippet) and
 * a sparse TF map (for TF-IDF scoring at query time).
 *
 * We store TF, not TF-IDF, because IDF is computed at query time
 * across the full set of chunks for the repo.
 */
const FileChunkSchema = new mongoose.Schema({
  repoId:     { type: mongoose.Schema.Types.ObjectId, ref: "Repo", required: true, index: true },
  path:       { type: String, required: true },
  ext:        { type: String, default: "" },
  chunkIndex: { type: Number, default: 0 },
  chunk:      { type: String, required: true },     // raw text for display
  tfVec:      { type: mongoose.Schema.Types.Mixed }, // { term: normalizedTF }
});

export default mongoose.model("FileChunk", FileChunkSchema);
