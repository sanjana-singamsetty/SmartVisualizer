# SmartVisualizer — Build Comments & Dev Notes

Running log of decisions, gotchas, TODOs, and things to explain in interviews.
Update this file as you build, debug, and extend the project.

---

## Phase 1 — Structure View

### Scaffold complete
- All directories and files created.
- Client: Vite + React + Mantine, RepoContext, all views stubbed, D3 circle-packing
  implemented in StructureView.jsx.
- Server: Express, Mongoose models, Redis cache service (L1/L2), BullMQ queue +
  worker, all 5 routes wired up.

### Things to do before Phase 1 is "done"
- [ ] `npm install` in both `client/` and `server/`
- [ ] Create `.env` files in `client/` and `server/` from the `.env.example` files
- [ ] Start Redis locally: `redis-server` (or use Redis Cloud free tier)
- [ ] Start MongoDB Atlas cluster and paste URI into `server/.env`
- [ ] Run `npm run dev` in `client/` and `npm run dev` in `server/` simultaneously
- [ ] Run worker: `npm run worker` in `server/`
- [ ] Test with a small public repo (e.g. `https://github.com/expressjs/express`)

### Known issue — BullMQ + ioredis connection config
BullMQ and ioredis use slightly different connection config objects.
`services/queue.js` uses `{ host, port }` (BullMQ format).
`services/cache.js` uses the full `REDIS_URL` string (ioredis format).
These must be kept in sync via env vars — don't hardcode.

### D3 circle-packing notes
- `d3.pack()` requires `.sum()` and `.sort()` called on the hierarchy before
  packing — this order matters; calling pack() before sum() gives all radii = 0.
- Folder circles use `fill: none` + stroke. File circles use `fill: colorForExt(ext)`.
- Click handler calls `setSelectedNode` which opens the ContextBox Drawer.
- SVG width/height are read from the container's `clientWidth` on mount — this
  means the SVG won't resize on window resize without a ResizeObserver (TODO for polish).

### Chart.js bubble chart notes
- Chart.js 4 requires all controllers/scales to be registered explicitly —
  `BubbleController, LinearScale, PointElement, Tooltip, Legend` are registered
  in CommitsView.jsx. Missing any one causes a silent render failure.
- The y-axis tick callback uses the authors array from parseCommits to show
  author names instead of index numbers. This requires the array to be in scope
  inside the options object — closed over from the useMemo above.

### Branches view — D3 custom (not gitgraph.js)
- Replaced `@gitgraph/js` with a custom D3 SVG renderer. Reason: Vite resolves
  dynamic imports at build time, so even a lazy `import()` fails if the package
  isn't installed. `@gitgraph/js` is also partially abandoned.
- The D3 implementation draws horizontal lane lines with commit circles and
  curved branch-off/merge-back paths using cubic bezier (`C` path command).
- Interview angle: "I evaluated gitgraph.js but the dynamic import caused build
  issues and the package is unmaintained. I built a lightweight D3 version instead —
  it's ~80 lines and handles the lanes/merge visuals we need."
- The GitHub branches API doesn't return merge commit ancestry — merge lines are
  currently approximated visually. For real ancestry, use
  `GET /repos/{owner}/{repo}/compare/{base}...{head}`.

---

## Phase 2 — MongoDB Caching (TODO)

- [ ] Test the L1→L2 cache fallthrough by analyzing a repo twice
- [ ] Verify Redis TTL with `redis-cli TTL repo:<url>`
- [ ] Add staleness check logic: if `latestSHA` changed, invalidate and re-analyze

---

## Phase 3 — Commits View (TODO)

- [ ] GitHub commits endpoint doesn't include `stats` (additions/deletions) by
  default — need individual `GET /repos/{o}/{r}/commits/{sha}` calls to get stats.
  This is expensive (1 API call per commit). Options:
  a) Only fetch stats for the last 20 commits
  b) Skip stats and use commit count as bubble size instead
  c) Use GraphQL API which returns stats in one call (requires OAuth token)
  Recommendation: go with (a) for the MVP.

---

## Phase 4 — Branches View (TODO)

- [ ] Install `@gitgraph/js` in client
- [ ] Wire up the GitHub compare API to detect merged branches
- [ ] The BranchesView currently hardcodes one commit per branch — replace with
  real branch history from the compare endpoint

---

## Phase 5 — Polish + Deploy (TODO)

- [ ] Add ResizeObserver to StructureView so the D3 SVG redraws on window resize
- [ ] Add loading skeletons for CommitsView and InsightsView
- [ ] Deploy client to Vercel (connect GitHub repo, set VITE_API_BASE_URL env var)
- [ ] Deploy server to Render (set all server env vars in Render dashboard)
- [ ] Run worker as a separate Render background service
- [ ] Use Redis Cloud free tier for production Redis

---

## Interview talking points to prepare

1. **Why Redis + MongoDB + (Postgres)?**
   Practice the 1-minute answer: each store is chosen for a specific data shape
   and access pattern. Redis = ephemeral hot cache + job queue; MongoDB = nested
   variable blobs; Postgres = relational user rows.

2. **Explain the two-agent debate**
   3 sequential LLM calls. Agent B's system prompt says "you've just read Agent A's
   argument." The Synthesizer uses `response_format: json_object` for typed output.
   Mention the debate/reflection pattern from agentic AI research.

3. **Why BullMQ instead of doing analysis synchronously?**
   Large repos take 8–15s. A 2min request timeout is bad UX. Returning a jobId
   + progress polling decouples the response from the work, exactly like production
   job pipelines (Sidekiq, Celery, etc.).

4. **Cache-aside pattern**
   Check L1 (Redis) → check L2 (MongoDB) → on miss, fetch+store → return.
   Re-warm L1 on L2 hit. TTL = 1hr for repo data, 24hr for LLM answers.
   Redis cache ops are non-fatal (try/catch fallthrough) — app works without Redis.

5. **D3 circle-packing vs. React Flow**
   D3 pack() is specifically designed for space-filling circle hierarchies.
   React Flow is a node-graph library. These are different visual metaphors for
   different insights — circle packing shows relative file size and folder structure
   simultaneously; node graphs show connectivity.

---

*Add new entries below as you build.*
