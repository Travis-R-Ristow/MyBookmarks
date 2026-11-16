export function isFolder(node) {
  return node.url === undefined;
}

export function flattenTree(nodes, ancestors = []) {
  return nodes.flatMap((node) => {
    const entry = { node, ancestors };
    if (!isFolder(node)) {
      return [entry];
    }
    return [entry, ...flattenTree(node.children ?? [], [...ancestors, node])];
  });
}

export function countBookmarks(node, isHidden = () => false) {
  if (!isFolder(node)) {
    return 1;
  }
  return (node.children ?? [])
    .filter((child) => !isHidden(child))
    .reduce((total, child) => total + countBookmarks(child, isHidden), 0);
}

export function pathLabel(entry) {
  return entry.ancestors.map((ancestor) => ancestor.title).join(" / ");
}

export function matchesQuery(node, query) {
  const haystack = `${node.title ?? ""} ${node.url ?? ""}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function sortedChildren(folder) {
  return [...(folder.children ?? [])].sort((left, right) => {
    if (isFolder(left) !== isFolder(right)) {
      return isFolder(left) ? -1 : 1;
    }
    return (left.title ?? "").localeCompare(right.title ?? "", undefined, { sensitivity: "base", numeric: true });
  });
}
