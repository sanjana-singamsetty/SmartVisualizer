/**
 * memory.js — per-repo agent memory.
 *
 * Facts are short strings extracted by the LLM after each chat exchange.
 * They're injected into the system prompt on future sessions so the agent
 * "remembers" what it learned previously.
 *
 * Interview talking point:
 * "I implemented a simple episodic memory store — the LLM extracts facts
 *  from each conversation and they persist across sessions per repo."
 */

import AgentMemory from "../models/AgentMemory.js";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";

const MAX_FACTS = 12; // cap per repo so prompt doesn't bloat

/**
 * Get stored memory facts for a repo as an injected prompt string.
 * Returns empty string if no facts yet.
 */
export async function getMemoryContext(repoId) {
  const mem = await AgentMemory.findOne({ repoId }).lean();
  if (!mem?.facts?.length) return "";

  const factLines = mem.facts
    .sort((a, b) => new Date(b.learnedAt) - new Date(a.learnedAt))
    .slice(0, MAX_FACTS)
    .map((f) => `• ${f.text}`)
    .join("\n");

  return `\n\n--- What I remember about this repo ---\n${factLines}`;
}

/**
 * Extract new facts from a completed conversation turn and persist them.
 * Fire-and-forget: call without await so it doesn't block the response.
 */
export async function extractAndStoreFacts(repoId, userMessage, assistantReply) {
  try {
    const { choices: [res] } = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a memory extraction system. Given a Q&A exchange about a code repository, " +
            "extract 0–3 concrete, specific facts worth remembering for future sessions. " +
            "Only extract genuinely useful facts (specific files, patterns, bugs, tech choices found). " +
            "Skip if the exchange was generic. " +
            'Respond with ONLY valid JSON: {"facts": ["fact1", "fact2"]} or {"facts": []}',
        },
        {
          role: "user",
          content: `Q: ${userMessage}\nA: ${assistantReply}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const { facts } = JSON.parse(res.message.content);
    if (!Array.isArray(facts) || facts.length === 0) return;

    const newFacts = facts
      .filter((f) => typeof f === "string" && f.trim().length > 10)
      .map((f) => ({ text: f.trim(), learnedAt: new Date() }));

    if (!newFacts.length) return;

    await AgentMemory.findOneAndUpdate(
      { repoId },
      {
        $push: {
          facts: {
            $each: newFacts,
            $slice: -MAX_FACTS, // keep only the most recent MAX_FACTS
          },
        },
      },
      { upsert: true }
    );
  } catch (err) {
    // Memory extraction is non-fatal
    console.warn("[memory] extraction failed:", err.message);
  }
}
