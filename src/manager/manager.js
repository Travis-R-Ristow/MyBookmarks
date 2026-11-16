import { el, icon, spaceChip } from "../lib/dom.js";
import { buildViewRoots, hasTwinRoots, primarySource, sourceIds } from "../lib/merge.js";
import {
  defaultSpaceStyle,
  normalizeColor,
  normalizeIcon,
  readableTextColor,
  resolveSpaceStyle,
  spaceStyleFields,
  withoutSpaces,
} from "../lib/spaces.js";
import {
  loadMergeRoots,
  loadSpaceFolderIds,
  loadSpaceStyles,
  onStoreChanged,
  saveMergeRoots,
  saveSpaceStyles,
  saveSpaces,
} from "../lib/store.js";
import { countBookmarks, flattenTree, isFolder, pathLabel } from "../lib/tree.js";
import { guarded, moveInto } from "./actions.js";
import { openFolderPicker, openFormDialog } from "./dialogs.js";
import { showSuccess } from "./toasts.js";
import { makeDropTarget } from "./drag.js";
import { renderBrowse, renderSearchResults } from "./views/browse.js";
import { renderCleanup } from "./views/cleanup.js";
import { renderShortcuts } from "./views/shortcuts.js";

const RELOAD_DEBOUNCE_MS = 60;
const FOLDER_ROUTE = "folder/";
const TOOL_VIEWS = { cleanup: renderCleanup, shortcuts: renderShortcuts };
const BOOKMARK_EVENTS = ["onCreated", "onRemoved", "onChanged", "onMoved", "onChildrenReordered", "onImportEnded"];

const container = document.getElementById("view");
const spaceList = document.getElementById("space-list");
const searchInput = document.getElementById("search");
const mergeRow = document.getElementById("merge-row");
const mergeToggle = document.getElementById("merge-toggle");
const toolButtons = [...document.querySelectorAll("[data-view]")];

const state = {
  roots: [],
  entries: [],
  byId: new Map(),
  spaceFolderIds: [],
  spaceStyles: {},
  canMerge: false,
  merged: true,
  query: "",
};

let reloadTimer = null;

function readRoute() {
  const hash = location.hash.slice(1);
  if (TOOL_VIEWS[hash]) {
    return { tool: hash, folderId: null };
  }
  if (hash.startsWith(FOLDER_ROUTE)) {
    return { tool: null, folderId: hash.slice(FOLDER_ROUTE.length) };
  }
  return { tool: null, folderId: null };
}

function currentFolder(route) {
  const entry = state.byId.get(route.folderId);
  if (entry && isFolder(entry.node)) {
    return entry.node;
  }
  return state.roots[0];
}

function nodeById(id) {
  return state.byId.get(id)?.node ?? null;
}

function spaces() {
  const rootIds = new Set(state.roots.map((root) => root.id));
  const pinned = new Set(state.spaceFolderIds.map(nodeById).filter((node) => !rootIds.has(node.id)));
  return [...state.roots, ...pinned];
}

function styleKey(node) {
  return sourceIds(node).find((sourceId) => state.spaceStyles[sourceId]) ?? node.id;
}

function savedStyle(node) {
  return state.spaceStyles[styleKey(node)];
}

function styleFrom(values) {
  return { color: normalizeColor(values.color), icon: normalizeIcon(values.icon) };
}

function canMoveInto(id, folderId) {
  const target = state.byId.get(folderId);
  if (!target || id === folderId) {
    return false;
  }
  return !target.ancestors.some((ancestor) => ancestor.id === id);
}

function clearSearch() {
  state.query = "";
  searchInput.value = "";
}

function navigate(hash) {
  clearSearch();
  if (location.hash.slice(1) === hash) {
    render();
    return;
  }
  location.hash = hash;
}

function navigateToFolder(id) {
  navigate(`${FOLDER_ROUTE}${id}`);
}

function folderHref(id) {
  return `#${FOLDER_ROUTE}${id}`;
}

function moveNode(view) {
  return guarded(async () => {
    const folders = state.entries
      .filter((entry) => isFolder(entry.node) && !entry.node.unmodifiable && canMoveInto(view.id, entry.node.id))
      .map((entry) => ({
        id: entry.node.id,
        title: entry.node.title,
        depth: entry.ancestors.length,
        path: pathLabel(entry),
        current: entry.node.id === view.parentId,
      }));
    const targetId = await openFolderPicker({ title: `Move "${view.title || view.url}"`, folders });
    if (targetId) {
      await moveInto(view, nodeById(targetId));
    }
  });
}

function pinSpace(id) {
  const node = nodeById(id);
  const style = savedStyle(node) ?? defaultSpaceStyle(node, spaces().length);
  return guarded(async () => {
    await saveSpaces([...state.spaceFolderIds, id], { ...state.spaceStyles, [styleKey(node)]: style });
    showSuccess(`"${node.title}" is now a space.`);
  });
}

function unpinSpace(id) {
  const remaining = withoutSpaces(state.spaceFolderIds, state.spaceStyles, sourceIds(nodeById(id)));
  return guarded(async () => {
    await saveSpaces(remaining.spaceFolderIds, remaining.spaceStyles);
    showSuccess("Space removed. The folder is still in your bookmarks.");
  });
}

function spaceStyle(id) {
  const list = spaces();
  const index = list.findIndex((space) => space.id === id);
  return resolveSpaceStyle(savedStyle(list[index]), list[index], index);
}

function saveSpaceStyle(id, values) {
  return saveSpaceStyles({ ...state.spaceStyles, [styleKey(nodeById(id))]: styleFrom(values) });
}

function styleError(values) {
  if (!normalizeColor(values.color)) {
    return "Pick a color.";
  }
  return normalizeIcon(values.icon) ? null : "Choose an icon: an emoji, up to 2 characters, or an image.";
}

function applyTint(color) {
  const rootStyle = document.documentElement.style;
  if (color) {
    rootStyle.setProperty("--space", color);
    rootStyle.setProperty("--on-accent", readableTextColor(color));
    return;
  }
  rootStyle.removeProperty("--space");
  rootStyle.removeProperty("--on-accent");
}

function addSpace() {
  return guarded(async () => {
    const values = await openFormDialog({
      title: "New space",
      submitLabel: "Create",
      fields: [
        { name: "title", label: "Name", placeholder: "Work, Personal, Reading", hint: "Creates a bookmark folder and pins it here." },
        ...spaceStyleFields(defaultSpaceStyle({}, spaces().length)),
      ],
      validate: (candidate) => (candidate.title ? styleError(candidate) : "Name is required."),
    });
    if (!values) {
      return;
    }
    const parent = state.roots.find((root) => root.folderType === "other") ?? state.roots.at(-1);
    const folder = await chrome.bookmarks.create({ parentId: primarySource(parent).id, title: values.title });
    await saveSpaces([...state.spaceFolderIds, folder.id], { ...state.spaceStyles, [folder.id]: styleFrom(values) });
    navigateToFolder(folder.id);
    showSuccess(`Space "${values.title}" created.`);
  });
}

async function renameSpace(node, title) {
  for (const sourceId of sourceIds(node)) {
    await chrome.bookmarks.update(sourceId, { title });
  }
}

function customizeSpace(id) {
  return guarded(async () => {
    const node = nodeById(id);
    const renamable = !state.roots.includes(node);
    const nameFields = renamable ? [{ name: "title", label: "Name", value: node.title }] : [];
    const values = await openFormDialog({
      title: `Customize ${node.title}`,
      fields: [...nameFields, ...spaceStyleFields(spaceStyle(id))],
      validate: (candidate) => (renamable && !candidate.title ? "Name is required." : styleError(candidate)),
    });
    if (!values) {
      return;
    }
    if (renamable && values.title !== node.title) {
      await renameSpace(node, values.title);
    }
    await saveSpaceStyle(id, values);
    showSuccess("Space updated.");
  });
}

function buildContext(route) {
  const folder = currentFolder(route);
  const lineage = [...state.byId.get(folder.id).ancestors, folder];
  const spaceIds = new Set(spaces().map((space) => space.id));
  const spaceIndex = lineage.findLastIndex((node) => spaceIds.has(node.id));
  return {
    state,
    container,
    folder,
    chain: lineage.slice(spaceIndex),
    activeSpaceId: lineage[spaceIndex].id,
    spaceStyle: spaceStyle(lineage[spaceIndex].id),
    isSpace: spaceIndex === lineage.length - 1,
    customizeSpace,
    isRootFolder: lineage.length === 1,
    isPinned: sourceIds(folder).some((id) => state.spaceFolderIds.includes(id)),
    canMoveInto,
    nodeById,
    moveNode,
    folderHref,
    navigateToFolder,
    pinSpace,
    unpinSpace,
  };
}

function renderSidebar(route, context) {
  const browsing = !route.tool && !state.query;
  const items = spaces().map((space) => {
    const active = browsing && context.activeSpaceId === space.id;
    const item = el("button", { class: `sidebar-item${active ? " active" : ""}`, type: "button", onclick: () => navigateToFolder(space.id) }, [
      spaceChip(spaceStyle(space.id)),
      el("span", { class: "sidebar-label", text: space.title }),
      el("span", { class: "sidebar-count", text: String(countBookmarks(space)) }),
    ]);
    makeDropTarget(item, {
      canAccept: (id) => canMoveInto(id, space.id),
      onDrop: (id) => moveInto(nodeById(id), space),
    });
    return item;
  });
  spaceList.replaceChildren(...items);
  mergeRow.hidden = !state.canMerge;
  mergeToggle.checked = state.merged;
  toolButtons.forEach((button) => {
    button.classList.toggle("active", !state.query && route.tool === button.dataset.view);
  });
}

function render() {
  if (!state.roots.length) {
    return;
  }
  const route = readRoute();
  const context = buildContext(route);
  renderSidebar(route, context);
  applyTint(state.query || route.tool ? null : context.spaceStyle.color);
  if (state.query) {
    renderSearchResults(context);
    return;
  }
  if (route.tool) {
    TOOL_VIEWS[route.tool](context);
    return;
  }
  renderBrowse(context);
}

async function reload() {
  const [tree, spaceFolderIds, spaceStyles, merged] = await Promise.all([
    chrome.bookmarks.getTree(),
    loadSpaceFolderIds(),
    loadSpaceStyles(),
    loadMergeRoots(),
  ]);
  const realRoots = tree[0].children ?? [];
  state.canMerge = hasTwinRoots(realRoots);
  state.merged = merged;
  state.roots = buildViewRoots(realRoots, merged);
  state.entries = flattenTree(state.roots);
  state.byId = new Map(state.entries.flatMap((entry) => sourceIds(entry.node).map((id) => [id, entry])));
  state.spaceFolderIds = spaceFolderIds.filter((id) => {
    const entry = state.byId.get(id);
    return entry && isFolder(entry.node) && entry.ancestors.length > 0;
  });
  state.spaceStyles = spaceStyles;
  render();
}

function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => guarded(reload), RELOAD_DEBOUNCE_MS);
}

searchInput.addEventListener("input", () => {
  state.query = searchInput.value.trim();
  render();
});
document.getElementById("add-space").addEventListener("click", addSpace);
mergeToggle.addEventListener("change", () => guarded(() => saveMergeRoots(mergeToggle.checked)));
toolButtons.forEach((button) => {
  button.prepend(icon(button.dataset.view));
  button.addEventListener("click", () => navigate(button.dataset.view));
});
window.addEventListener("hashchange", render);
BOOKMARK_EVENTS.forEach((eventName) => chrome.bookmarks[eventName].addListener(scheduleReload));
onStoreChanged(scheduleReload);
guarded(reload);
