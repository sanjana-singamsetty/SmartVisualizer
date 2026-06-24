/**
 * Inspects cached repo data and picks the most relevant debate topic.
 * Returns a topic string fed to the LLM debate prompts.
 */
export function detectDebateTopic(repoDoc) {
  const tree = repoDoc.treeData;
  const commits = repoDoc.commitsData || [];
  const branches = repoDoc.branchesData?.branches || [];

  const allPaths = flattenPaths(tree);

  // Signal: DB / schema files present
  const hasDbFiles = allPaths.some((p) =>
    /migration|schema|models?\//i.test(p)
  );
  if (hasDbFiles) {
    return "Is this database schema designed to scale? Consider normalization, indexing strategy, and query patterns.";
  }

  // Signal: monorepo (multiple package.json files)
  const pkgCount = allPaths.filter((p) => p.endsWith("package.json")).length;
  if (pkgCount > 1) {
    return "Monorepo vs. separate services — is this the right architecture for this project's scale and team size?";
  }

  // Signal: large files (size > 50KB used as proxy for >500 LOC)
  const hasLargeFiles = hasBigFiles(tree, 50000);
  if (hasLargeFiles) {
    return "Where is the biggest tech debt risk in this codebase, and what should be tackled first?";
  }

  // Signal: many branches
  if (branches.length > 10) {
    return "Is this branching strategy sustainable as the team grows, or is it creating integration risk?";
  }

  // Signal: high test coverage (many *.test.* files)
  const testCount = allPaths.filter((p) => /\.(test|spec)\.[jt]sx?$/.test(p)).length;
  if (testCount / Math.max(allPaths.length, 1) > 0.2) {
    return "Is this test strategy actually giving the team confidence, or is it creating false safety?";
  }

  // Fallback
  return "If you inherited this codebase tomorrow, what would you prioritize in the first sprint and why?";
}

function flattenPaths(node, paths = []) {
  if (!node) return paths;
  if (node.path) paths.push(node.path);
  if (node.children) node.children.forEach((c) => flattenPaths(c, paths));
  return paths;
}

function hasBigFiles(node, threshold) {
  if (!node) return false;
  if (!node.children && node.value > threshold) return true;
  return (node.children || []).some((c) => hasBigFiles(c, threshold));
}
