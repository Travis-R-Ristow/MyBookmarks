import assert from "node:assert/strict";
import { test } from "node:test";
import { countBookmarks, flattenTree, matchesQuery, pathLabel, sortedChildren } from "../src/lib/tree.js";

const tree = [
  {
    id: "1",
    title: "Bookmarks bar",
    children: [
      { id: "10", title: "zeta", url: "https://zeta.test/" },
      {
        id: "11",
        title: "Work",
        children: [{ id: "110", title: "Docs", url: "https://docs.test/guide" }],
      },
      { id: "12", title: "Alpha", url: "https://alpha.test/" },
    ],
  },
];

test("flattenTree keeps tree order and records ancestors", () => {
  const entries = flattenTree(tree);
  assert.deepEqual(entries.map((entry) => entry.node.id), ["1", "10", "11", "110", "12"]);
  assert.equal(pathLabel(entries[3]), "Bookmarks bar / Work");
  assert.equal(entries[0].ancestors.length, 0);
});

test("countBookmarks counts nested bookmarks only", () => {
  assert.equal(countBookmarks(tree[0]), 3);
});

test("matchesQuery requires every term in title or url", () => {
  const node = { title: "Docs", url: "https://docs.test/guide" };
  assert.equal(matchesQuery(node, "DOCS guide"), true);
  assert.equal(matchesQuery(node, "docs missing"), false);
});

test("sortedChildren puts folders first then sorts by title ignoring case", () => {
  assert.deepEqual(sortedChildren(tree[0]).map((node) => node.title), ["Work", "Alpha", "zeta"]);
});
