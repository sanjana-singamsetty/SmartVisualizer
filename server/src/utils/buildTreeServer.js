/**
 * Server-side version of buildTree — same logic as the client util but
 * runs in Node from the GitHub git/trees flat array.
 */
export function buildTreeServer(items) {
  const root = { name: "root", children: [] };

  for (const item of items) {
    if (item.type !== "blob") continue;

    const parts = item.path.split("/");
    let node = root;

    for (let i = 0; i < parts.length - 1; i++) {
      let child = node.children?.find((c) => c.name === parts[i]);
      if (!child) {
        child = { name: parts[i], children: [] };
        node.children = node.children || [];
        node.children.push(child);
      }
      node = child;
    }

    const fileName = parts[parts.length - 1];
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "";

    node.children = node.children || [];
    node.children.push({
      name: fileName,
      ext,
      value: item.size || 1,
      path: item.path,
    });
  }

  return root;
}
