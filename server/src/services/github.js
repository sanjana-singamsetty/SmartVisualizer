import axios from "axios";

const BASE = "https://api.github.com";

function headers() {
  return process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {};
}

/** Fetch the full recursive file tree */
export async function getTree(owner, repo) {
  const { data } = await axios.get(
    `${BASE}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers: headers() }
  );
  return data.tree || [];
}

/** Fetch commit list (paginated, max 300) */
export async function getCommits(owner, repo) {
  const commits = [];
  let page = 1;

  while (commits.length < 300) {
    const { data } = await axios.get(
      `${BASE}/repos/${owner}/${repo}/commits?per_page=100&page=${page}`,
      { headers: headers() }
    );
    if (!data.length) break;
    commits.push(...data);
    if (data.length < 100) break;
    page++;
  }

  return commits;
}

/** Fetch branch list */
export async function getBranches(owner, repo) {
  const { data: branches } = await axios.get(
    `${BASE}/repos/${owner}/${repo}/branches`,
    { headers: headers() }
  );
  const { data: repoMeta } = await axios.get(
    `${BASE}/repos/${owner}/${repo}`,
    { headers: headers() }
  );
  return {
    branches,
    defaultBranch: repoMeta.default_branch || "main",
  };
}

/** Get only the latest commit SHA (cheap staleness check) */
export async function getLatestSHA(owner, repo) {
  const { data } = await axios.get(
    `${BASE}/repos/${owner}/${repo}/commits?per_page=1`,
    { headers: headers() }
  );
  return data[0]?.sha || null;
}

// Extensions we'll embed — skip binary/lock/generated files
const CODE_EXTS = new Set([
  "js","ts","jsx","tsx","py","go","java","rb","php","cs","cpp","c","h",
  "rs","swift","kt","vue","svelte","html","css","scss","sass","less",
  "json","yaml","yml","toml","md","sh","bash","env","prisma","graphql","sql",
]);

/**
 * Fetch raw content for a list of file paths.
 * Returns { path, content }[] — silently skips files that fail.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string[]} paths  — relative file paths from tree
 * @param {number} maxBytes — skip files larger than this (default 60KB)
 */
export async function getFileContents(owner, repo, paths, maxBytes = 60_000) {
  // Filter to code files only — no point embedding binaries
  const codePaths = paths.filter((p) => {
    const ext = p.split(".").pop()?.toLowerCase();
    return CODE_EXTS.has(ext);
  });

  // Fetch in batches of 8 to stay well under rate limits
  const BATCH = 8;
  const results = [];
  for (let i = 0; i < codePaths.length; i += BATCH) {
    const batch = codePaths.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (path) => {
        const { data } = await axios.get(
          `${BASE}/repos/${owner}/${repo}/contents/${path}`,
          { headers: headers() }
        );
        // GitHub returns base64-encoded content
        if (!data.content || data.size > maxBytes) return null;
        const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
        return { path, content: decoded };
      })
    );
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
  }
  return results;
}

/** Map GitHub API errors to friendly codes */
export function parseGitHubError(err) {
  const status = err.response?.status;
  if (status === 404) return { error: "repo_not_found" };
  if (status === 403 || status === 429) {
    const reset = err.response?.headers?.["x-ratelimit-reset"];
    return { error: "rate_limited", resetAt: reset ? Number(reset) * 1000 : null };
  }
  if (status === 401) return { error: "private_repo" };
  return { error: "github_error", message: err.message };
}
