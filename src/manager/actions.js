import { primarySource, sourceMatching } from "../lib/merge.js";
import { countBookmarks, isFolder, sortedChildren } from "../lib/tree.js";
import { coerceUrl } from "../lib/urls.js";
import { openFormDialog } from "./dialogs.js";
import { ZONE_AFTER } from "./drag.js";
import { showError, showSuccess } from "./toasts.js";
import { removeWithUndo } from "./undo.js";

const URL_ERROR = "Enter a valid URL.";
const DEFAULT_CONFIRM_LABEL = "Confirm delete";

export async function guarded(action) {
  try {
    return await action();
  } catch (error) {
    showError(error?.message ?? "Something went wrong.");
    return null;
  }
}

export function plural(total, word) {
  return `${total} ${word}${total === 1 ? "" : "s"}`;
}

function validateBookmark(values) {
  return coerceUrl(values.url) ? null : URL_ERROR;
}

function validateName(values) {
  return values.title ? null : "Name is required.";
}

async function updateSources(view, changes) {
  for (const source of view.sources) {
    await chrome.bookmarks.update(source.node.id, changes);
  }
}

function undoAction(undo) {
  const run = () =>
    guarded(async () => {
      await undo();
      showSuccess("Restored.");
    });
  return { label: "Undo", run };
}

export function createFolder(parent) {
  return guarded(async () => {
    const values = await openFormDialog({
      title: "New folder",
      submitLabel: "Create",
      fields: [{ name: "title", label: "Name", placeholder: "Folder name" }],
      validate: validateName,
    });
    if (!values) {
      return;
    }
    await chrome.bookmarks.create({ parentId: primarySource(parent).id, title: values.title });
    showSuccess(`Folder "${values.title}" created.`);
  });
}

export function createBookmark(parent) {
  return guarded(async () => {
    const values = await openFormDialog({
      title: "Add bookmark",
      submitLabel: "Add",
      fields: [
        { name: "title", label: "Name", placeholder: "Page title" },
        { name: "url", label: "URL", placeholder: "https://example.com" },
      ],
      validate: validateBookmark,
    });
    if (!values) {
      return;
    }
    const url = coerceUrl(values.url);
    await chrome.bookmarks.create({ parentId: primarySource(parent).id, title: values.title || url, url });
    showSuccess("Bookmark added.");
  });
}

async function editFolder(view) {
  const values = await openFormDialog({
    title: "Rename folder",
    fields: [{ name: "title", label: "Name", value: view.title }],
    validate: validateName,
  });
  if (values) {
    await updateSources(view, { title: values.title });
    showSuccess("Folder renamed.");
  }
}

async function editBookmark(view) {
  const values = await openFormDialog({
    title: "Edit bookmark",
    fields: [
      { name: "title", label: "Name", value: view.title },
      { name: "url", label: "URL", value: view.url },
    ],
    validate: validateBookmark,
  });
  if (values) {
    await updateSources(view, { title: values.title, url: coerceUrl(values.url) });
    showSuccess("Bookmark saved.");
  }
}

export function editNode(view) {
  return guarded(() => (isFolder(view) ? editFolder(view) : editBookmark(view)));
}

export function deleteConfirmLabel(view) {
  if (isFolder(view)) {
    const total = countBookmarks(view);
    return total ? `${DEFAULT_CONFIRM_LABEL} (${plural(total, "bookmark")})` : DEFAULT_CONFIRM_LABEL;
  }
  return view.sources.length > 1 ? `${DEFAULT_CONFIRM_LABEL} (both copies)` : DEFAULT_CONFIRM_LABEL;
}

export function deleteNode(view) {
  return guarded(async () => {
    const undo = await removeWithUndo([view], { recursive: true });
    showSuccess(`Deleted "${view.title || view.url}".`, undoAction(undo));
  });
}

export function removeEntries(entries, noun) {
  return guarded(async () => {
    const undo = await removeWithUndo(entries.map((entry) => entry.node), { recursive: false });
    showSuccess(`Removed ${plural(entries.length, noun)}.`, undoAction(undo));
  });
}

function destinationFor(folder, origin) {
  return sourceMatching(folder, origin) ?? primarySource(folder);
}

export function moveInto(view, folder) {
  return guarded(async () => {
    for (const source of view.sources) {
      await chrome.bookmarks.move(source.node.id, { parentId: destinationFor(folder, source.origin).id });
    }
    showSuccess(`Moved to "${folder.title}".`);
  });
}

export function moveBeside(view, target, parent, zone) {
  const offset = zone === ZONE_AFTER ? 1 : 0;
  return guarded(async () => {
    for (const source of view.sources) {
      const anchor = sourceMatching(target, source.origin);
      const destination = anchor
        ? { parentId: anchor.parentId, index: anchor.index + offset }
        : { parentId: destinationFor(parent, source.origin).id };
      await chrome.bookmarks.move(source.node.id, destination);
    }
  });
}

async function applyOrder(parentId, orderedIds) {
  for (const [index, id] of orderedIds.entries()) {
    await chrome.bookmarks.move(id, { parentId, index });
  }
}

export function sortFolder(folder) {
  return guarded(async () => {
    const previous = folder.sources.map((source) => ({
      parentId: source.node.id,
      ids: (source.node.children ?? []).map((child) => child.id),
    }));
    for (const source of folder.sources) {
      await applyOrder(source.node.id, sortedChildren(source.node).map((child) => child.id));
    }
    const restore = async () => {
      for (const order of previous) {
        await applyOrder(order.parentId, order.ids);
      }
    };
    showSuccess("Sorted A to Z.", undoAction(restore));
  });
}
