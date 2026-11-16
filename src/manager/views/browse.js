import { el, faviconUrl, icon, iconButton, spaceChip, textButton } from "../../lib/dom.js";
import { countBookmarks, isFolder, matchesQuery, pathLabel } from "../../lib/tree.js";
import { isWebUrl } from "../../lib/urls.js";
import { createBookmark, createFolder, deleteConfirmLabel, deleteNode, editNode, moveBeside, moveInto, plural, sortFolder } from "../actions.js";
import { confirmButton } from "../confirm-button.js";
import { ZONE_INTO, makeDraggable, makeDropTarget, makeRowDropTarget } from "../drag.js";
import { originTags } from "../tags.js";

const MAX_SEARCH_RESULTS = 300;

function nodeIcon(node) {
  if (isFolder(node)) {
    return el("span", { class: "row-icon row-icon-folder" }, icon("folder", 18));
  }
  if (!isWebUrl(node.url)) {
    return el("span", { class: "row-icon" }, icon("bookmark", 18));
  }
  return el("img", { class: "row-icon", src: faviconUrl(node.url), alt: "", loading: "lazy", draggable: "false" });
}

function hostLabel(url) {
  return isWebUrl(url) ? new URL(url).host : url;
}

function rowActions(node, context) {
  if (node.unmodifiable) {
    return null;
  }
  return el("div", { class: "row-actions" }, [
    iconButton("edit", "Edit", () => editNode(node)),
    iconButton("move", "Move to…", () => context.moveNode(node)),
    confirmButton({ label: "Delete", confirmLabel: deleteConfirmLabel(node), onConfirm: () => deleteNode(node) }),
  ]);
}

function visibleChildren(folder, context) {
  return (folder.children ?? []).filter((child) => !context.isPinnedSpace(child));
}

function folderMain(node, context) {
  const total = countBookmarks(node, context.isPinnedSpace);
  return el("a", { class: "row-main", href: context.folderHref(node.id), draggable: "false" }, [
    nodeIcon(node),
    el("span", { class: "row-title", text: node.title || "Untitled folder" }),
    el("span", { class: "row-meta", text: `${total} bookmark${total === 1 ? "" : "s"}` }),
    ...originTags(node),
  ]);
}

function bookmarkMain(node, metaText) {
  return el("a", { class: "row-main", href: node.url, target: "_blank", rel: "noopener noreferrer", draggable: "false" }, [
    nodeIcon(node),
    el("span", { class: "row-title", text: node.title || node.url }),
    el("span", { class: "row-meta", text: metaText }),
    ...originTags(node),
  ]);
}

function canDrop(id, zone, node, context) {
  if (zone === ZONE_INTO) {
    return context.canMoveInto(id, node.id);
  }
  return id !== node.id && context.canMoveInto(id, node.parentId);
}

function dropOn(id, zone, node, context) {
  const dragged = context.nodeById(id);
  if (zone === ZONE_INTO) {
    return moveInto(dragged, node);
  }
  return moveBeside(dragged, node, context.folder, zone);
}

function renderRow(node, context) {
  const main = isFolder(node) ? folderMain(node, context) : bookmarkMain(node, hostLabel(node.url));
  const row = el("li", { class: "row" }, [main, rowActions(node, context)]);
  if (node.unmodifiable) {
    return row;
  }
  makeDraggable(row, node.id);
  makeRowDropTarget(row, {
    allowInto: isFolder(node),
    canAccept: (id, zone) => canDrop(id, zone, node, context),
    onDrop: (id, zone) => dropOn(id, zone, node, context),
  });
  return row;
}

function renderBreadcrumb(context) {
  const lastIndex = context.chain.length - 1;
  const crumbs = context.chain.flatMap((node, index) => {
    if (index === lastIndex) {
      return [el("h1", { class: "crumb crumb-current", text: node.title })];
    }
    const crumb = el("button", { class: "crumb", type: "button", text: node.title, onclick: () => context.navigateToFolder(node.id) });
    makeDropTarget(crumb, {
      canAccept: (id) => context.canMoveInto(id, node.id),
      onDrop: (id) => moveInto(context.nodeById(id), node),
    });
    return [crumb, el("span", { class: "crumb-separator" }, icon("chevron", 14))];
  });
  return el("nav", { class: "breadcrumb", "aria-label": "Folder path" }, crumbs);
}

function spaceToggle(context) {
  if (context.isRootFolder) {
    return null;
  }
  if (context.isPinned) {
    return textButton("Remove space", () => context.unpinSpace(context.folder.id), { icon: "pin" });
  }
  return textButton("Make space", () => context.pinSpace(context.folder.id), { icon: "pin" });
}

function renderActions(context) {
  const { folder } = context;
  return el("div", { class: "view-actions" }, [
    context.isSpace ? textButton("Customize", () => context.customizeSpace(folder.id), { icon: "cleanup" }) : null,
    spaceToggle(context),
    confirmButton({ label: "Sort A to Z", confirmLabel: "Confirm sort", iconName: "sort", neutral: true, onConfirm: () => sortFolder(folder) }),
    textButton("New folder", () => createFolder(folder), { icon: "folder" }),
    textButton("Add bookmark", () => createBookmark(folder), { icon: "plus", variant: "primary" }),
  ]);
}

function emptyState(emoji, title, detail) {
  return el("div", { class: "empty" }, [
    el("p", { class: "empty-emoji", "aria-hidden": "true", text: emoji }),
    el("p", { class: "empty-title", text: title }),
    el("p", { class: "empty-detail", text: detail }),
  ]);
}

function renderHero(context) {
  const folderTotal = visibleChildren(context.folder, context).filter(isFolder).length;
  const summary = `${plural(countBookmarks(context.folder, context.isPinnedSpace), "bookmark")} · ${plural(folderTotal, "folder")}`;
  return el("header", { class: "hero" }, [
    spaceChip(context.spaceStyle, "space-chip-large"),
    el("div", { class: "hero-text" }, [renderBreadcrumb(context), el("p", { class: "hero-meta", text: summary })]),
    renderActions(context),
  ]);
}

export function renderBrowse(context) {
  const children = visibleChildren(context.folder, context);
  const body = children.length
    ? el("ul", { class: "rows" }, children.map((child) => renderRow(child, context)))
    : emptyState("📭", "This folder is empty", "Add a bookmark, create a folder, or drag items here from another folder.");
  context.container.replaceChildren(
    renderHero(context),
    body,
  );
}

export function renderSearchResults(context) {
  const { state, container } = context;
  const matches = state.entries.filter((entry) => !isFolder(entry.node) && matchesQuery(entry.node, state.query));
  const shown = matches.slice(0, MAX_SEARCH_RESULTS);
  const summary = matches.length > shown.length ? `Showing ${shown.length} of ${matches.length} results` : `${matches.length} result${matches.length === 1 ? "" : "s"}`;
  const body = shown.length
    ? el("ul", { class: "rows" }, shown.map((entry) => el("li", { class: "row" }, [bookmarkMain(entry.node, pathLabel(entry)), rowActions(entry.node, context)])))
    : emptyState("🔍", "No bookmarks found", "Try a different word from the title or the address.");
  container.replaceChildren(
    el("div", { class: "view-head" }, [
      el("h1", { class: "crumb crumb-current", text: `Search: ${state.query}` }),
      el("span", { class: "view-summary", text: summary }),
    ]),
    body,
  );
}
