import { withoutSpaces } from "./spaces.js";

const SPACES_KEY = "spaceFolderIds";
const SPACE_STYLES_KEY = "spaceStyles";
const MERGE_ROOTS_KEY = "mergeRoots";
const KNOWN_LOCAL_KEYS = [SPACES_KEY, SPACE_STYLES_KEY, MERGE_ROOTS_KEY];
const KNOWN_SYNC_KEYS = [];

export async function loadSpaceFolderIds() {
  const stored = await chrome.storage.local.get(SPACES_KEY);
  return stored[SPACES_KEY] ?? [];
}

export async function loadSpaceStyles() {
  const stored = await chrome.storage.local.get(SPACE_STYLES_KEY);
  return stored[SPACE_STYLES_KEY] ?? {};
}

export function saveSpaceStyles(styles) {
  return chrome.storage.local.set({ [SPACE_STYLES_KEY]: styles });
}

export function saveSpaces(spaceFolderIds, spaceStyles) {
  return chrome.storage.local.set({ [SPACES_KEY]: spaceFolderIds, [SPACE_STYLES_KEY]: spaceStyles });
}

export async function forgetSpaces(removedIds) {
  const [spaceFolderIds, spaceStyles] = await Promise.all([loadSpaceFolderIds(), loadSpaceStyles()]);
  const result = withoutSpaces(spaceFolderIds, spaceStyles, removedIds);
  if (result.changed) {
    await saveSpaces(result.spaceFolderIds, result.spaceStyles);
  }
}

export async function loadMergeRoots() {
  const stored = await chrome.storage.local.get(MERGE_ROOTS_KEY);
  return stored[MERGE_ROOTS_KEY] ?? true;
}

export function saveMergeRoots(merged) {
  return chrome.storage.local.set({ [MERGE_ROOTS_KEY]: merged });
}

export function onStoreChanged(handler) {
  chrome.storage.onChanged.addListener(handler);
}

async function removeUnknownFrom(area, knownKeys) {
  const unknown = Object.keys(await area.get(null)).filter((key) => !knownKeys.includes(key));
  if (unknown.length) {
    await area.remove(unknown);
  }
}

export async function removeUnknownKeys() {
  await removeUnknownFrom(chrome.storage.local, KNOWN_LOCAL_KEYS);
  await removeUnknownFrom(chrome.storage.sync, KNOWN_SYNC_KEYS);
}
