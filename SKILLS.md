# SmartVisualizer — Skills & Tech Tracker

This file is updated as the project is built. Each entry records what was added,
why it was chosen, and the interview-relevant angle.

---

## Frontend

### Vite + React 18
- **Added:** Project scaffold (Phase 1)
- **Why:** Fast HMR, native ESM, zero-config for React
- **Interview angle:** Chose Vite over CRA for build performance and modern ESM output

### Mantine UI v7
- **Added:** Project scaffold (Phase 1)
- **Why:** Rich component library with dark mode, no Tailwind dependency, hooks
  included (`@mantine/hooks`)
- **Interview angle:** Deliberately chose Mantine over shadcn/Tailwind — fewer
  class collisions, better TypeScript types, built-in notification system

### D3.js v7 — Circle Packing (`d3.pack()`)
- **Added:** StructureView (Phase 1)
- **Why:** `d3.hierarchy()` + `d3.pack()` is purpose-built for nested circle
  packing; no other library matches it for this visualization style
- **Interview angle:** Chose D3 over React Flow / vis.js — those are node graphs,
  not circle-packing; explained the difference in architecture doc

### Chart.js + react-chartjs-2 — Bubble Chart
- **Added:** CommitsView (Phase 3)
- **Why:** Lightweight, already understood by the team, bubble/scatter charts
  are first-class
- **Interview angle:** x=week, y=author lane, r=sqrt(lines changed) — the radius
  encoding intentionally uses sqrt to avoid very large commits visually dominating

### D3.js — Custom Git Graph (BranchesView)
- **Added:** BranchesView (Phase 4)
- **Why:** `@gitgraph/js` was replaced — Vite resolves dynamic imports at build
  time even for lazy `import()`, so the missing package caused a build error.
  The library is also partially unmaintained.
- **Implementation:** horizontal SVG lanes with cubic bezier branch-off/merge paths,
  commit circles, color-coded by branch index. ~80 lines of D3.
- **Interview angle:** Evaluated gitgraph.js, hit a real constraint (Vite
  build-time import resolution), switched to a custom D3 implementation. Shows
  pragmatic decision-making about dependencies.

### React Context (`RepoContext`)
- **Added:** Project scaffold
- **Why:** Single shared state for repoId, repoData, activeTab, selectedNode —
  no Redux needed at this scale
- **Interview angle:** Chose Context over Zustand/Redux — the state is simple and
  mostly set in one place; no need for selectors or middleware

---

## Backend

### Node.js + Express
- **Added:** Project scaffold
- **Why:** Lightweight, minimal boilerplate, easy to add middleware
- **Interview angle:** Stateless API server; the heavy work runs in the BullMQ worker,
  not the request thread

### Mongoose + MongoDB Atlas
- **Added:** Project scaffold
- **Why:** Repo data is deeply nested and variable-shaped — a poor fit for rigid
  SQL schemas; MongoDB's flexible documents map directly to the GitHub API response shape
- **Interview angle:** "I chose MongoDB because treeData is a nested JSON blob
  with variable depth — normalizing that into SQL tables would require recursive
  JOINs and a lot of schema overhead for no benefit."
- **Collections:** `repos`, `queries`

### Redis (ioredis)
- **Added:** `services/cache.js` (Phase 2)
- **Why:** L1 cache in front of MongoDB; sub-millisecond reads for recently
  analyzed repos; also serves as BullMQ's job queue backend
- **Interview angle:** L1/L2 cache hierarchy — Redis (1hr TTL, ephemeral) in front
  of MongoDB (persistent). Cache-aside pattern with automatic L1 re-warming on L2 hit.
  Redis is non-fatal if unavailable — all cache ops have try/catch fallthrough.

### BullMQ (Redis-backed job queue)
- **Added:** `services/queue.js`, `workers/repoWorker.js` (Phase 2)
- **Why:** Repo analysis takes 5–15s for large repos. Returning a jobId immediately
  and polling is more reliable than a long-held HTTP request (timeout risk, no progress)
- **Interview angle:** "I use BullMQ to decouple the API response from the analysis
  work. The client gets a jobId in <100ms, then polls /api/jobs/:id at 2s intervals
  with a progress bar. This is how production job pipelines work."
- **Concurrency:** Worker runs 3 jobs in parallel (`concurrency: 3`)
- **Retry:** 2 attempts with exponential backoff on failure

### OpenAI SDK (gpt-4o-mini default)
- **Added:** `services/llm.js`
- **Why:** Structured JSON output support, reliable tool-calling, cheap with
  gpt-4o-mini for the volume of calls this app makes
- **Interview angle:** 3 LLM call patterns used:
  1. Plain text overview summaries (low temperature, 200 tokens)
  2. Context Q&A per node (fixed system prompt + swappable question slot)
  3. Two-agent debate (sequential calls where Agent B receives Agent A's output)
     + Synthesizer with forced JSON output (`response_format: { type: "json_object" }`)

---

## AI / Agentic Patterns

### Two-Agent Debate (Insights tab)
- **Pattern:** Advocate → Critic (with A's output in context) → Synthesizer (JSON)
- **Why it's impressive:** Sequential LLM calls where each agent has a distinct
  persona and the second agent's input depends on the first agent's output — this
  is the "debate/reflection" pattern from agentic AI literature
- **Interview angle:** "I chained 3 LLM calls where Agent B explicitly receives
  Agent A's argument as prior context. The Synthesizer uses forced JSON output to
  extract exactly 3 bullets. This mirrors how production agentic systems work —
  structured handoffs between agents with typed outputs."

### Auto-Topic Detection
- **Pattern:** Signal-based prompt selection in `detectDebateTopic.js`
- **Why:** The debate is more interesting when the topic is tailored to what's
  actually in the repo (DB files → schema debate; monorepo → architecture debate)
- **Interview angle:** "I inspect the repo's signals — presence of migration files,
  monorepo indicators, file size distribution — to pick the debate topic dynamically.
  This is a simple but real example of context-aware prompt selection."

### Cache-Aside + RAG-Adjacent Context Selection
- **Pattern:** Pull relevant subtree for clicked node, inject into prompt
- **Why:** Sending the full repo to the LLM would be expensive and noisy; only
  the clicked folder/file's contents are sent
- **Interview angle:** "I don't use a vector store, but the principle is the same
  as RAG — retrieve the relevant chunk (subtree), inject it into the prompt,
  return a grounded answer. I can explain the tradeoff vs. a full vector search."

---

## Data Flow Summary

```
User pastes URL
  → POST /api/repo
    → Redis L1 check → MongoDB L2 check → BullMQ job enqueue
  → Client polls GET /api/jobs/:id (2s interval, progress bar)
  → Worker: GitHub API (parallel) → filterNoise → buildTree
           → 3x overview LLM calls (parallel)
           → setCachedRepo (MongoDB + Redis)
  → Client renders: Structure (D3) | Commits (Chart.js) | Branches (gitgraph.js)
  → User clicks node → POST /api/context → Redis → MongoDB → LLM → cache
  → User opens Insights → POST /api/debate → 3 chained LLM calls → cache
```

---

*Last updated: Project scaffold complete (all phases 1–4 scaffolded)*
