import mongoose from "mongoose";

/**
 * AgentMemory — persistent facts the agent has learned about a repo.
 * One document per repo. Facts are extracted after each chat turn and
 * injected into the system prompt on future sessions.
 */
const AgentMemorySchema = new mongoose.Schema(
  {
    repoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repo",
      required: true,
      unique: true,
      index: true,
    },
    facts: [
      {
        text:       { type: String, required: true },
        learnedAt:  { type: Date, default: Date.now },
        confidence: { type: Number, default: 1 }, // 0-1, reserved for future scoring
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("AgentMemory", AgentMemorySchema);
