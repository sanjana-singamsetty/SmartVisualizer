/**
 * Converts raw GitHub commit list into Chart.js-ready bubble chart data.
 * x = week number (ISO), y = author index (lane), r = sqrt(additions+deletions)
 */
export function parseCommits(commits) {
  const authorMap = {};
  let authorIndex = 0;

  const startDate = new Date(
    commits[commits.length - 1]?.commit?.author?.date || Date.now()
  );

  const points = commits.map((c) => {
    const author = c.commit?.author?.name || "Unknown";
    if (!(author in authorMap)) authorMap[author] = authorIndex++;

    const date = new Date(c.commit?.author?.date || Date.now());
    const weeksDiff = Math.floor(
      (date - startDate) / (1000 * 60 * 60 * 24 * 7)
    );
    const lines = (c.stats?.additions || 0) + (c.stats?.deletions || 0);
    const radius = Math.max(4, Math.min(20, Math.sqrt(lines)));

    return {
      x: weeksDiff,
      y: authorMap[author],
      r: radius,
      author,
      message: c.commit?.message?.split("\n")[0] || "",
      sha: c.sha?.slice(0, 7),
      date: date.toLocaleDateString(),
    };
  });

  const authors = Object.keys(authorMap);
  return { points, authors };
}
