import mongoose from "mongoose";

const querySchema = new mongoose.Schema(
  {
    repoId:       { type: mongoose.Schema.Types.ObjectId, ref: "Repo", required: true },
    path:         { type: String, required: true },
    questionType: {
      type: String,
      enum: ["what_does_it_do", "connections", "refactor", "custom"],
      required: true,
    },
    question: String,
    answer:   String,
    askedAt:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for cache lookups
querySchema.index({ repoId: 1, path: 1, questionType: 1 });

export default mongoose.model("Query", querySchema);
