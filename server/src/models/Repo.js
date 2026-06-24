import mongoose from "mongoose";

const repoSchema = new mongoose.Schema(
  {
    url:        { type: String, required: true, unique: true, index: true },
    owner:      String,
    name:       String,
    latestSHA:  String,
    analyzedAt: Date,
    fileCount:  Number,
    totalLines: Number,
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    stage: { type: String, default: "" }, // current pipeline stage label
    treeData:    mongoose.Schema.Types.Mixed,
    commitsData: [mongoose.Schema.Types.Mixed],
    branchesData: mongoose.Schema.Types.Mixed,
    overviewSummary: {
      structure: String,
      commits:   String,
      branches:  String,
    },
    generatedReadme: String,
    ragReady: { type: Boolean, default: false },
    qualityScore: {
      scores: {
        readability:     Number,
        testCoverage:    Number,
        security:        Number,
        maintainability: Number,
        modularity:      Number,
      },
      explanations: {
        readability:     String,
        testCoverage:    String,
        security:        String,
        maintainability: String,
        modularity:      String,
      },
      overall:     Number,
      generatedAt: Date,
    },
    debate: {
      topic:       String,
      advocate:    String,
      critic:      String,
      synthesis:   [String],
      generatedAt: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Repo", repoSchema);
