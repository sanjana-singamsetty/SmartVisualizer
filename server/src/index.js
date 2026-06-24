import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import repoRouter    from "./routes/repo.js";
import overviewRouter from "./routes/overview.js";
import contextRouter from "./routes/context.js";
import debateRouter  from "./routes/debate.js";
import jobsRouter    from "./routes/jobs.js";
import chatRouter    from "./routes/chat.js";
import readmeRouter  from "./routes/readme.js";
import scoreRouter   from "./routes/score.js";
import agentRouter   from "./routes/agent.js";

const app = express();

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.FRONTEND_URL,       // explicit override (Render / custom domain)
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Same-origin requests (curl, health checks) have no Origin header — always allow.
    if (!origin) return cb(null, true);
    // Allow all Vercel preview + production URLs automatically.
    if (origin.endsWith(".vercel.app") || origin.includes("vercel.app")) return cb(null, true);
    // Allow any explicitly listed origin.
    if (ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/repo",     repoRouter);
app.use("/api/overview", overviewRouter);
app.use("/api/context",  contextRouter);
app.use("/api/debate",   debateRouter);
app.use("/api/jobs",     jobsRouter);
app.use("/api/chat",     chatRouter);
app.use("/api/readme",   readmeRouter);
app.use("/api/score",    scoreRouter);
app.use("/api/agent",    agentRouter);

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// On Vercel, the function runtime manages the process — no listen() needed.
// Locally and on Render, we start a real HTTP server.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
