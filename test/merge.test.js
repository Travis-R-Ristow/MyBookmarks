import assert from "node:assert/strict";
import { test } from "node:test";
import { buildViewRoots, displayRoots, hasTwinRoots, origins, primarySource, sourceIds } from "../src/lib/merge.js";
import { countBookmarks, flattenTree } from "../src/lib/tree.js";

const accountBar = {
  id: "1",
  title: "Bookmarks bar",
  folderType: "bookmarks-bar",
  syncing: true,
  children: [
    { id: "10", parentId: "1", index: 0, title: "GitHub", url: "https://github.com/" },
    { id: "11", parentId: "1", index: 1, title: "Work", children: [{ id: "110", parentId: "11", index: 0, title: "Jira", url: "https://jira.test/" }] },
  ],
};
const deviceBar = {
  id: "5",
  title: "Bookmarks bar",
  folderType: "bookmarks-bar",
  syncing: false,
  children: [
    { id: "50", parentId: "5", index: 0, title: "GitHub home", url: "https://github.com" },
    { id: "51", parentId: "5", index: 1, title: "Local only", url: "https://local.test/" },
    { id: "52", parentId: "5", index: 2, title: "Work", children: [{ id: "520", parentId: "52", index: 0, title: "Wiki", url: "https://wiki.test/" }] },
    { id: "53", parentId: "5", index: 3, title: "Local only again", url: "https://local.test/" },
  ],
};
const accountOther = { id: "2", title: "Other bookmarks", folderType: "other", syncing: true, children: [] };
const deviceOther = { id: "6", title: "Other bookmarks", folderType: "other", syncing: false, children: [] };
const roots = [accountBar, accountOther, deviceBar, deviceOther];

test("merged roots collapse twins into one space with the account copy first", () => {
  const merged = buildViewRoots(roots, true);
  assert.deepEqual(merged.map((root) => root.title), ["Bookmarks bar", "Other bookmarks"]);
  assert.deepEqual(sourceIds(merged[0]), ["1", "5"]);
  assert.equal(primarySource(merged[0]).id, "1");
  assert.equal(merged[0].tagged, true);
});

test("the same link in both copies becomes one row with both origins", () => {
  const [bar] = buildViewRoots(roots, true);
  const github = bar.children.find((child) => child.id === "10");
  assert.deepEqual(sourceIds(github), ["10", "50"]);
  assert.deepEqual(origins(github), ["account", "device"]);
  assert.equal(github.title, "GitHub");
});

test("same-named folders merge and keep children from both copies", () => {
  const [bar] = buildViewRoots(roots, true);
  const work = bar.children.find((child) => child.id === "11");
  assert.deepEqual(sourceIds(work), ["11", "52"]);
  assert.deepEqual(work.children.map((child) => [child.title, child.parentId, origins(child)]), [
    ["Jira", "11", ["account"]],
    ["Wiki", "11", ["device"]],
  ]);
});

test("duplicates inside one copy stay separate rows", () => {
  const [bar] = buildViewRoots(roots, true);
  const local = bar.children.filter((child) => child.url === "https://local.test/");
  assert.deepEqual(local.map((child) => sourceIds(child)), [["51"], ["53"]]);
  assert.equal(countBookmarks(bar), 5);
});

test("every real id is reachable from the merged view", () => {
  const ids = flattenTree(buildViewRoots(roots, true)).flatMap((entry) => sourceIds(entry.node));
  assert.equal(new Set(ids).size, ids.length);
  ["1", "5", "2", "6", "10", "50", "51", "52", "520", "53", "11", "110"].forEach((id) => assert.ok(ids.includes(id)));
});

test("unmerged roots stay separate, labeled, and untagged", () => {
  const separate = buildViewRoots(roots, false);
  assert.deepEqual(separate.map((root) => root.title), ["Bookmarks bar (account)", "Other bookmarks", "Bookmarks bar (this device)"]);
  assert.equal(separate.every((root) => !root.tagged && root.sources.length === 1), true);
});

test("hasTwinRoots is true only when two copies both hold bookmarks", () => {
  assert.equal(hasTwinRoots(roots), true);
  assert.equal(hasTwinRoots([accountBar, accountOther, deviceOther]), false);
});

test("displayRoots hides an empty twin and keeps one when both are empty", () => {
  assert.deepEqual(displayRoots([accountBar, { ...deviceBar, children: [] }]).map((root) => [root.id, root.title]), [["1", "Bookmarks bar"]]);
  assert.deepEqual(displayRoots([deviceOther, accountOther]).map((root) => root.id), ["2"]);
});
