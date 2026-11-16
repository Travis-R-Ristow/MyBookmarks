import assert from "node:assert/strict";
import { test } from "node:test";
import { extraEntries, findDuplicateGroups, findEmptyFolders } from "../src/lib/cleanup.js";
import { flattenTree } from "../src/lib/tree.js";

const entries = flattenTree([
  {
    id: "1",
    title: "Bookmarks bar",
    children: [
      { id: "10", title: "Example", url: "https://example.com/" },
      { id: "11", title: "Empty", children: [] },
      {
        id: "12",
        title: "Work",
        children: [
          { id: "120", title: "Example again", url: "https://example.com" },
          { id: "121", title: "Unique", url: "https://unique.test/" },
        ],
      },
    ],
  },
  { id: "2", title: "Other bookmarks", children: [] },
]);

test("findDuplicateGroups groups bookmarks sharing a normalized url", () => {
  const groups = findDuplicateGroups(entries);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].items.map((entry) => entry.node.id), ["10", "120"]);
});

test("extraEntries keeps the first copy of each group", () => {
  assert.deepEqual(extraEntries(findDuplicateGroups(entries)).map((entry) => entry.node.id), ["120"]);
});

test("findEmptyFolders skips the permanent root folders", () => {
  assert.deepEqual(findEmptyFolders(entries).map((entry) => entry.node.id), ["11"]);
});
