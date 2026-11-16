import { extraEntries, findDuplicateGroups, findEmptyFolders } from "../../lib/cleanup.js";
import { el } from "../../lib/dom.js";
import { isFolder, pathLabel } from "../../lib/tree.js";
import { removeEntries } from "../actions.js";
import { confirmButton } from "../confirm-button.js";
import { originTags } from "../tags.js";

const TONE_INFO = "#2f7df6";
const TONE_NEUTRAL = "#9333ea";
const TONE_CLEAN = "#16a34a";
const TONE_ATTENTION = "#d97706";
const NOUN_DUPLICATE = "duplicate";
const NOUN_EMPTY_FOLDER = "empty folder";

function issueTone(total) {
  return total ? TONE_ATTENTION : TONE_CLEAN;
}

function stat(label, value, emoji, tone) {
  const card = el("div", { class: "stat" }, [
    el("span", { class: "stat-emoji", "aria-hidden": "true", text: emoji }),
    el("span", { class: "stat-value", text: String(value) }),
    el("span", { class: "stat-label", text: label }),
  ]);
  card.style.setProperty("--chip", tone);
  return card;
}

function removeOneButton(entry, label, noun) {
  const button = confirmButton({ label, onConfirm: () => removeEntries([entry], noun) });
  return el("div", { class: "row-actions row-actions-visible" }, button);
}

function removeAllButton(entries, label, noun) {
  if (!entries.length) {
    return null;
  }
  return confirmButton({
    label,
    confirmLabel: `Confirm: remove ${entries.length}`,
    showLabel: true,
    onConfirm: () => removeEntries(entries, noun),
  });
}

function duplicateItem(entry, index) {
  return el("li", { class: "row" }, [
    el("div", { class: "row-main row-static" }, [
      el("span", { class: "row-title", text: entry.node.title || entry.node.url }),
      el("span", { class: "row-meta", text: pathLabel(entry) }),
      ...originTags(entry.node),
      index === 0 ? el("span", { class: "badge", text: "Kept" }) : null,
    ]),
    removeOneButton(entry, "Remove this copy", NOUN_DUPLICATE),
  ]);
}

function duplicateGroup(group) {
  return el("section", { class: "card" }, [
    el("header", { class: "card-head" }, [
      el("span", { class: "card-url", text: group.url }),
      el("span", { class: "badge badge-muted", text: `${group.items.length} copies` }),
    ]),
    el("ul", { class: "rows rows-flush" }, group.items.map(duplicateItem)),
  ]);
}

function emptyFolderItem(entry) {
  return el("li", { class: "row" }, [
    el("div", { class: "row-main row-static" }, [
      el("span", { class: "row-title", text: entry.node.title || "Untitled folder" }),
      el("span", { class: "row-meta", text: pathLabel(entry) }),
    ]),
    removeOneButton(entry, "Remove folder", NOUN_EMPTY_FOLDER),
  ]);
}

function sectionHead(title, detail, action) {
  return el("div", { class: "section-row" }, [
    el("div", {}, [el("h2", { text: title }), el("p", { class: "section-detail", text: detail })]),
    action,
  ]);
}

function allClear(text) {
  return el("p", { class: "all-clear", text });
}

export function renderCleanup(context) {
  const { state, container } = context;
  const groups = findDuplicateGroups(state.entries);
  const extras = extraEntries(groups);
  const emptyFolders = findEmptyFolders(state.entries).filter((entry) => !context.isPinnedSpace(entry.node));
  const bookmarkTotal = state.entries.filter((entry) => !isFolder(entry.node)).length;
  const folderTotal = state.entries.filter((entry) => isFolder(entry.node) && entry.ancestors.length > 0).length;

  container.replaceChildren(
    el("div", { class: "view-head" }, el("h1", { class: "crumb crumb-current", text: "Cleanup" })),
    el("div", { class: "stats" }, [
      stat("Bookmarks", bookmarkTotal, "🔖", TONE_INFO),
      stat("Folders", folderTotal, "📁", TONE_NEUTRAL),
      stat("Duplicates", extras.length, "👯", issueTone(extras.length)),
      stat("Empty folders", emptyFolders.length, "🫙", issueTone(emptyFolders.length)),
    ]),
    sectionHead(
      "Duplicate bookmarks",
      "Bookmarks that point to the same address. The first copy is kept.",
      removeAllButton(extras, "Remove all duplicates", NOUN_DUPLICATE),
    ),
    groups.length ? el("div", { class: "card-list" }, groups.map(duplicateGroup)) : allClear("✨ No duplicates. Nice and tidy."),
    sectionHead("Empty folders", "Folders with nothing inside.", removeAllButton(emptyFolders, "Remove all empty folders", NOUN_EMPTY_FOLDER)),
    emptyFolders.length
      ? el("section", { class: "card" }, el("ul", { class: "rows rows-flush" }, emptyFolders.map(emptyFolderItem)))
      : allClear("✨ No empty folders."),
  );
}
