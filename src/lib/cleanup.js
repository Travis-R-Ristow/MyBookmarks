import { isFolder } from "./tree.js";
import { normalizeUrl } from "./urls.js";

export function findDuplicateGroups(entries) {
  const groups = new Map();
  entries
    .filter((entry) => !isFolder(entry.node))
    .forEach((entry) => {
      const key = normalizeUrl(entry.node.url);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(entry);
    });
  return [...groups]
    .filter(([, items]) => items.length > 1)
    .map(([url, items]) => ({ url, items }));
}

export function extraEntries(groups) {
  return groups.flatMap((group) => group.items.slice(1));
}

export function findEmptyFolders(entries) {
  return entries.filter((entry) => {
    const removable = entry.ancestors.length > 0;
    return removable && isFolder(entry.node) && (entry.node.children ?? []).length === 0;
  });
}
