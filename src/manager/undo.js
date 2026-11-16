import { remapSpaces } from "../lib/spaces.js";
import { loadSpaceFolderIds, loadSpaceStyles, saveSpaces } from "../lib/store.js";
import { isFolder } from "../lib/tree.js";

async function loadSpaces() {
  const [spaceFolderIds, spaceStyles] = await Promise.all([loadSpaceFolderIds(), loadSpaceStyles()]);
  return { spaceFolderIds, spaceStyles };
}

async function createAt(parentId, index, node) {
  const details = { parentId, title: node.title, url: node.url };
  try {
    return await chrome.bookmarks.create({ ...details, index });
  } catch {
    return chrome.bookmarks.create(details);
  }
}

async function restoreNode(node, parentId, index, idMap) {
  const created = await createAt(parentId, index, node);
  idMap.set(node.id, created.id);
  for (const child of node.children ?? []) {
    await restoreNode(child, created.id, undefined, idMap);
  }
}

async function removeNode(node, recursive) {
  if (recursive && isFolder(node)) {
    await chrome.bookmarks.removeTree(node.id);
    return;
  }
  await chrome.bookmarks.remove(node.id);
}

export async function removeWithUndo(views, { recursive }) {
  const before = await loadSpaces();
  const removed = views.flatMap((view) => view.sources.map((source) => source.node));
  for (const node of removed) {
    await removeNode(node, recursive);
  }
  return async () => {
    const idMap = new Map();
    const ordered = [...removed].sort((left, right) => left.index - right.index);
    for (const node of ordered) {
      await restoreNode(node, node.parentId, node.index, idMap);
    }
    const remapped = remapSpaces(before, await loadSpaces(), idMap);
    if (remapped.changed) {
      await saveSpaces(remapped.spaceFolderIds, remapped.spaceStyles);
    }
  };
}
