/**
 * Converts the flat GitHub tree API response into a nested JSON tree
 * compatible with d3.hierarchy() and d3.pack().
 *
 * Input: array of { path, type, size } from GitHub's git/trees endpoint
 * Output: { name: "root", children: [...] } where leaves have { name, ext, value }
 */
export function buildTree(items) {
  const root = { name: "root", children: [] };

  for (const item of items) {
    if (item.type !== "blob") continue;

    const parts = item.path.split("/");
    let node = root;

    // Walk/create intermediate folder nodes
    for (let i = 0; i < parts.length - 1; i++) {
      let child = node.children?.find((c) => c.name === parts[i]);
      if (!child) {
        child = { name: parts[i], children: [] };
        node.children = node.children || [];
        node.children.push(child);
      }
      node = child;
    }

    // Leaf file node
    const fileName = parts[parts.length - 1];
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
    const value = item.size || 1; // GitHub returns size in bytes; use as proxy for LOC

    node.children = node.children || [];
    node.children.push({ name: fileName, ext, value, path: item.path });
  }

  return root;
}
