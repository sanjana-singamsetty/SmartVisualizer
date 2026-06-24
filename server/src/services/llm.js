import OpenAI from "openai";

// Groq is OpenAI-API-compatible — just swap the baseURL and key
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";

const QUESTION_MAP = {
  what_does_it_do:
    "In plain English, what is the purpose of this folder/file? Explain as if to a new engineer on the team.",
  connections:
    "What does this folder/file depend on, and what depends on it? Base your answer on visible imports and requires.",
  refactor:
    "Are there any code smells, oversized files, duplicated logic, or structural concerns worth addressing? Be specific, not generic.",
};

/**
 * Answer a context question about a specific path in the repo.
 */
export async function askContext({ path, fileList, snippets = "", questionType, customQuestion }) {
  const question =
    customQuestion || QUESTION_MAP[questionType] || "Give a general overview.";

  const userMessage = `Path: ${path}
Files: ${fileList}
Key snippets: ${snippets || "none available"}

QUESTION: ${question}`;

  const { choices } = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are analyzing a single folder/file from a code repository. " +
          "Answer ONLY the specific question asked, in 3–5 sentences max. " +
          "Do not repeat the file list back to the user.",
      },
      { role: "user", content: userMessage },
    ],
    max_tokens: 300,
    temperature: 0.3,
  });

  return choices[0].message.content.trim();
}

/**
 * Generate an overview summary for a specific view (structure / commits / branches).
 */
export async function generateOverview(view, context) {
  const prompts = {
    structure:
      "You are given the file tree of a GitHub repo. Write a 2–3 sentence plain-English summary of what this project appears to be and how it is organized.",
    commits:
      "You are given a list of commits with authors and dates. Summarize the development activity: how active is this project, who are the main contributors, and what phases of work are visible?",
    branches:
      "You are given the branch list and default branch of a repo. Summarize the branching strategy and what active work appears to be in flight.",
  };

  const { choices } = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: prompts[view] },
      { role: "user",   content: context },
    ],
    max_tokens: 200,
    temperature: 0.4,
  });

  return choices[0].message.content.trim();
}

/**
 * Multi-turn chat about the repo. Takes conversation history + repo context.
 */
export async function chatAboutRepo(repoContext, messages) {
  const { choices } = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert code reviewer helping someone understand a specific GitHub repository. " +
          "ONLY answer questions that are directly related to this repository — its code, structure, commits, contributors, branches, or files. " +
          "If the user asks anything unrelated to this repository (general programming questions, other languages, other projects, trivia, etc.), " +
          "respond with: 'I can only answer questions about this repository. Please ask something related to its code, structure, or history.' " +
          "Do NOT provide general coding help, tutorials, or information outside the scope of this repo.\n\n" +
          `REPO CONTEXT:\n${repoContext}`,
      },
      ...messages,
    ],
    max_tokens: 500,
    temperature: 0.4,
  });
  return choices[0].message.content.trim();
}

/**
 * Generate a full README.md for the repo.
 */
export async function generateReadme(repoContext) {
  const { choices } = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a technical writer. Generate a professional, well-structured README.md " +
          "for the GitHub repository described below. Include: project title, description, " +
          "tech stack (inferred from file types), getting started instructions, project structure, " +
          "and a contributing section. Use proper markdown formatting with headings, code blocks, and badges where appropriate.",
      },
      {
        role: "user",
        content: `Generate a README.md for this repo:\n\n${repoContext}`,
      },
    ],
    max_tokens: 1200,
    temperature: 0.5,
  });
  return choices[0].message.content.trim();
}

/**
 * LLM-as-judge: score a repo across 5 dimensions (0–10 each).
 * Returns { scores: {...}, explanations: {...}, overall }
 */
export async function scoreRepo(repoContext) {
  const { choices: [res] } = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert code reviewer acting as an impartial judge. " +
          "Given a repo's structure, commits, and stats, score it across 5 dimensions (0–10 each). " +
          "Be critical and realistic — most repos score 4–7. " +
          "Respond with ONLY valid JSON matching this schema exactly:\n" +
          '{"scores":{"readability":N,"testCoverage":N,"security":N,"maintainability":N,"modularity":N},' +
          '"explanations":{"readability":"1 sentence","testCoverage":"1 sentence","security":"1 sentence","maintainability":"1 sentence","modularity":"1 sentence"},' +
          '"overall":N}',
      },
      {
        role: "user",
        content: `Score this repository:\n\n${repoContext}`,
      },
    ],
    max_tokens: 400,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(res.message.content);
  // Clamp all scores 0-10
  for (const k of Object.keys(parsed.scores || {})) {
    parsed.scores[k] = Math.min(10, Math.max(0, Math.round(parsed.scores[k])));
  }
  parsed.overall = Math.min(10, Math.max(0, Math.round(parsed.overall)));
  return parsed;
}

/**
 * Two-agent debate pipeline. Returns { advocate, critic, synthesis[] }.
 * Agent B receives Agent A's full output as context.
 */
export async function runDebate(topic, repoContext) {
  // Agent A — The Advocate
  const { choices: [aRes] } = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are The Advocate — an experienced software engineer who argues that the repository's design choices are sound and well-reasoned. " +
          "Be specific to the actual code structure provided. 4–6 sentences.",
      },
      {
        role: "user",
        content: `Debate topic: ${topic}\n\nRepo context:\n${repoContext}`,
      },
    ],
    max_tokens: 350,
    temperature: 0.6,
  });
  const advocate = aRes.message.content.trim();

  // Agent B — The Critic (receives A's argument)
  const { choices: [bRes] } = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are The Critic — a senior engineer who challenges weak design decisions and raises concrete concerns. " +
          "You have just read The Advocate's argument. Challenge the weakest points specifically. 4–6 sentences.",
      },
      {
        role: "user",
        content: `Debate topic: ${topic}\n\nRepo context:\n${repoContext}\n\nThe Advocate said:\n${advocate}`,
      },
    ],
    max_tokens: 350,
    temperature: 0.6,
  });
  const critic = bRes.message.content.trim();

  // Synthesizer — extract 3 key takeaways as JSON
  const { choices: [sRes] } = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a synthesis engine. Given a debate between The Advocate and The Critic about a codebase, " +
          "extract exactly 3 actionable insights an engineer should walk away with. " +
          'Respond with valid JSON: { "synthesis": ["...", "...", "..."] }. No other text.',
      },
      {
        role: "user",
        content: `Topic: ${topic}\nAdvocate: ${advocate}\nCritic: ${critic}`,
      },
    ],
    max_tokens: 250,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  let synthesis = [];
  try {
    const parsed = JSON.parse(sRes.message.content);
    synthesis = parsed.synthesis || [];
  } catch {
    synthesis = [sRes.message.content.trim()];
  }

  return { advocate, critic, synthesis };
}
