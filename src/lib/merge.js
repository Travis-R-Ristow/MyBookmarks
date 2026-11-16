import { isFolder } from "./tree.js";
import { normalizeUrl } from "./urls.js";

export const ORIGIN_ACCOUNT = "account";
export const ORIGIN_DEVICE = "device";
export const ORIGIN_LABELS = { [ORIGIN_ACCOUNT]: "Account", [ORIGIN_DEVICE]: "This device" };

const TWIN_SUFFIXES = { [ORIGIN_ACCOUNT]: "account", [ORIGIN_DEVICE]: "this device" };

function twinKey(root) {
  return root.folderType ?? root.title;
}

function originOf(root) {
  return root.syncing ? ORIGIN_ACCOUNT : ORIGIN_DEVICE;
}

function hasChildren(root) {
  return (root.children ?? []).length > 0;
}

function twinsOf(root, roots) {
  return roots.filter((other) => twinKey(other) === twinKey(root));
}

function childKey(node) {
  return isFolder(node) ? `folder:${node.title}` : `url:${normalizeUrl(node.url)}`;
}

function buildView(parts, tagged, parentId) {
  const [{ node: primary }] = parts;
  const view = {
    id: primary.id,
    parentId: parentId ?? primary.parentId,
    title: primary.title,
    url: primary.url,
    folderType: primary.folderType,
    unmodifiable: primary.unmodifiable,
    sources: parts,
    tagged,
  };
  if (isFolder(primary)) {
    view.children = mergeChildren(parts, tagged, view.id);
  }
  return view;
}

function mergeChildren(parts, tagged, parentId) {
  const groups = [];
  const groupsByKey = new Map();
  parts.forEach(({ node, origin }) => {
    (node.children ?? []).forEach((child) => {
      const key = childKey(child);
      const candidates = groupsByKey.get(key) ?? [];
      const match = candidates.find((group) => !group.some((part) => part.origin === origin));
      if (match) {
        match.push({ node: child, origin });
        return;
      }
      const group = [{ node: child, origin }];
      groups.push(group);
      groupsByKey.set(key, [...candidates, group]);
    });
  });
  return groups.map((group) => buildView(group, tagged, parentId));
}

function accountFirst(left, right) {
  return Number(right.origin === ORIGIN_ACCOUNT) - Number(left.origin === ORIGIN_ACCOUNT);
}

export function hasTwinRoots(roots) {
  return roots.some((root) => twinsOf(root, roots).filter(hasChildren).length > 1);
}

export function displayRoots(roots) {
  return roots.flatMap((root) => {
    const twins = twinsOf(root, roots);
    if (twins.length === 1) {
      return [root];
    }
    const populated = twins.filter(hasChildren);
    const visible = populated.length ? populated : [twins.find((twin) => twin.syncing) ?? twins[0]];
    if (!visible.includes(root)) {
      return [];
    }
    if (visible.length === 1) {
      return [root];
    }
    return [{ ...root, title: `${root.title} (${TWIN_SUFFIXES[originOf(root)]})` }];
  });
}

export function buildViewRoots(roots, merged) {
  if (!merged) {
    return displayRoots(roots).map((root) => buildView([{ node: root, origin: originOf(root) }], false));
  }
  const keys = [...new Set(roots.map(twinKey))];
  return keys.map((key) => {
    const parts = roots
      .filter((root) => twinKey(root) === key)
      .map((node) => ({ node, origin: originOf(node) }))
      .sort(accountFirst);
    return buildView(parts, parts.length > 1);
  });
}

export function sourceIds(view) {
  return view.sources.map((source) => source.node.id);
}

export function origins(view) {
  return view.sources.map((source) => source.origin);
}

export function primarySource(view) {
  return view.sources[0].node;
}

export function sourceMatching(view, origin) {
  return view.sources.find((source) => source.origin === origin)?.node ?? null;
}
