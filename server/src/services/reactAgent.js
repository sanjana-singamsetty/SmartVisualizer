/**
 * reactAgent.js — ReAct agent loop using Groq's native function-calling.
 *
 * Pattern: Think → call tool → observe result → think again → repeat → answer
 * Max 6 tool-call turns to prevent runaway costs.
 *
 * Returns { answer, trace } where trace is the array of steps for UI display.
 *
 * Interview talking point:
 * "Unlike text-parsing ReAct, I use the model's structured tool_calls field
 *  so the dispatch is always well-formed. The trace records every Thought +
 *  Action + Observation triplet which the UI renders as a reasoning chain."
 */

import OpenAI from "openai";
import { TOOL_DEFINITIONS, executeTool } from "./tools.js";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";
const MAX_TURNS = 6;

/**
 * Run the ReAct agent loop.
 *
 * @param {string} question   — user's question
 * @param {string} repoContext — base repo summary
 * @param {string} repoId      — MongoDB repo ID for tool execution
 * @returns {{ answer: string, trace: TraceStep[] }}
 */
export async function runReActAgent(question, repoContext, repoId) {
  const trace = [];

  const systemPrompt =
    "You are a code analysis agent with access to tools that let you read actual files " +
    "from the repository. Use them to give precise, evidence-based answers. " +
    "Call tools to find what you need — don't guess. " +
    "When you have enough information, provide a thorough final answer.\n\n" +
    `REPO CONTEXT:\n${repoContext}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: question },
  ];

  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      max_tokens: 600,
      temperature: 0.3,
    });

    const msg = response.choices[0].message;
    messages.push(msg); // add assistant message to history

    // ── No tool calls → final answer ───────────────────────────────────
    if (!msg.tool_calls?.length) {
      const answer = msg.content?.trim() || "I was unable to find a definitive answer.";
      trace.push({ type: "answer", content: answer });
      return { answer, trace };
    }

    // ── Execute each tool call ─────────────────────────────────────────
    for (const toolCall of msg.tool_calls) {
      const { name, arguments: argsStr } = toolCall.function;
      let args = {};
      try { args = JSON.parse(argsStr); } catch { /* ignore bad JSON */ }

      // Record the action step
      trace.push({
        type:   "action",
        tool:   name,
        args,
        callId: toolCall.id,
      });

      // Execute
      const observation = await executeTool(name, args, repoId);

      // Record observation
      trace.push({
        type:        "observation",
        tool:        name,
        content:     observation.slice(0, 800), // cap for UI display
        callId:      toolCall.id,
      });

      // Feed result back as a tool message
      messages.push({
        role:         "tool",
        tool_call_id: toolCall.id,
        content:      observation,
      });
    }
  }

  // Exhausted turns — ask for a final answer with what we have
  const finalResponse = await client.chat.completions.create({
    model: MODEL,
    messages: [
      ...messages,
      {
        role:    "user",
        content: "Based on everything you've found, please give your final answer now.",
      },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });

  const answer = finalResponse.choices[0].message.content?.trim() ||
    "Analysis complete. Please see the reasoning trace for details.";
  trace.push({ type: "answer", content: answer });
  return { answer, trace };
}
