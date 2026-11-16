import { forgetSpaces, removeUnknownKeys } from "../lib/store.js";
import { flattenTree } from "../lib/tree.js";

const MANAGER_URL = chrome.runtime.getURL("src/manager/manager.html");

async function focusOrOpenManager() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["TAB"] });
  const existing = contexts.find((context) => context.documentUrl.startsWith(MANAGER_URL));
  if (!existing) {
    await chrome.tabs.create({ url: MANAGER_URL });
    return;
  }
  await chrome.tabs.update(existing.tabId, { active: true });
  await chrome.windows.update(existing.windowId, { focused: true });
}

function reportError(error) {
  console.warn("[MyBookmarks]", error);
}

chrome.action.onClicked.addListener(() => {
  focusOrOpenManager().catch(reportError);
});

chrome.runtime.onInstalled.addListener(() => {
  removeUnknownKeys().catch(reportError);
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  const removedIds = [id, ...flattenTree([removeInfo.node]).map((entry) => entry.node.id)];
  forgetSpaces(removedIds).catch(reportError);
});
