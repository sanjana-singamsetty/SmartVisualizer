import Redis from "ioredis";
import Repo from "../models/Repo.js";
import Query from "../models/Query.js";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
});

redis.on("error", (err) => {
  // Non-fatal — fall through to MongoDB if Redis is unavailable
  console.warn("Redis unavailable:", err.message);
});

const REPO_TTL    = 60 * 60;        // 1 hour
const CONTEXT_TTL = 60 * 60 * 24;  // 24 hours
const DEBATE_TTL  = 60 * 60 * 24;  // 24 hours

// ─── Repo cache ───────────────────────────────────────────────────────────────

export async function getCachedRepo(url) {
  try {
    const hit = await redis.get(`repo:${url}`);
    if (hit) return JSON.parse(hit); // L1 hit
  } catch { /* Redis down — skip */ }

  // L2 — MongoDB
  const doc = await Repo.findOne({ url, status: "completed" }).lean();
  if (doc) {
    try {
      await redis.setex(`repo:${url}`, REPO_TTL, JSON.stringify(doc)); // re-warm L1
    } catch { /* ignore */ }
    return doc;
  }

  return null; // full miss
}

export async function setCachedRepo(url, doc) {
  await Repo.findOneAndUpdate({ url }, doc, { upsert: true, new: true });
  try {
    await redis.setex(`repo:${url}`, REPO_TTL, JSON.stringify(doc));
  } catch { /* ignore */ }
}

// ─── Context (LLM answer) cache ──────────────────────────────────────────────

export async function getCachedContext(repoId, path, questionType) {
  const key = `context:${repoId}:${path}:${questionType}`;
  try {
    const hit = await redis.get(key);
    if (hit) return hit;
  } catch { /* ignore */ }

  const doc = await Query.findOne({ repoId, path, questionType }).lean();
  return doc?.answer || null;
}

export async function setCachedContext(repoId, path, questionType, question, answer) {
  const key = `context:${repoId}:${path}:${questionType}`;
  await Query.create({ repoId, path, questionType, question, answer });
  try {
    await redis.setex(key, CONTEXT_TTL, answer);
  } catch { /* ignore */ }
}

// ─── Debate cache ─────────────────────────────────────────────────────────────

export async function getCachedDebate(repoId) {
  const key = `debate:${repoId}`;
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch { /* ignore */ }

  const doc = await Repo.findById(repoId).select("debate").lean();
  return doc?.debate || null;
}

export async function setCachedDebate(repoId, debate) {
  await Repo.findByIdAndUpdate(repoId, { debate });
  const key = `debate:${repoId}`;
  try {
    await redis.setex(key, DEBATE_TTL, JSON.stringify(debate));
  } catch { /* ignore */ }
}
