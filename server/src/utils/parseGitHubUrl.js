/**
 * Parses a GitHub repo URL into { owner, repo }.
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   github.com/owner/repo
 */
export function parseGitHubUrl(url) {
  const match = url
    .replace(/\.git$/, "")
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//, "")
    .split("/");

  if (match.length < 2) throw new Error("Invalid GitHub URL");

  return { owner: match[0], repo: match[1] };
}
