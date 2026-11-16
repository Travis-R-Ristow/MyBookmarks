import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SPACE_COLORS,
  SPACE_ICONS,
  defaultSpaceStyle,
  isEmoji,
  isIconImage,
  normalizeColor,
  normalizeIcon,
  readableTextColor, remapSpaces, 
  resolveSpaceStyle,
  withoutSpaces,
} from "../src/lib/spaces.js";

const FOLDER_ICONS = ["📁", "📂", "🗂️"];

test("resolveSpaceStyle falls back to a palette color by position and an icon by folder type", () => {
  assert.deepEqual(resolveSpaceStyle(undefined, { id: "1", folderType: "bookmarks-bar" }, 0), { color: SPACE_COLORS[0].value, icon: "⭐" });
  assert.equal(resolveSpaceStyle(undefined, { id: "9" }, SPACE_COLORS.length + 1).color, SPACE_COLORS[1].value);
});

test("resolveSpaceStyle prefers the saved style", () => {
  const saved = { color: "#e11d48", icon: "🦄" };
  assert.deepEqual(resolveSpaceStyle(saved, { id: "9" }, 0), { color: "#e11d48", icon: "🦄" });
});

test("no default or quick-pick icon looks like a folder", () => {
  const defaults = Array.from({ length: 60 }, (_, index) => defaultSpaceStyle({}, index).icon);
  const rootDefaults = ["bookmarks-bar", "other", "mobile"].map((folderType) => defaultSpaceStyle({ folderType }, 0).icon);
  [...defaults, ...rootDefaults, ...SPACE_ICONS].forEach((emoji) => assert.equal(FOLDER_ICONS.includes(emoji), false));
  assert.equal(new Set(SPACE_ICONS).size, SPACE_ICONS.length);
});

test("normalizeIcon keeps one emoji, or up to two other characters", () => {
  assert.equal(normalizeIcon(" 🦄 "), "🦄");
  assert.equal(normalizeIcon("🦄🚀"), "🦄");
  assert.equal(normalizeIcon("👨‍👩‍👧"), "👨‍👩‍👧");
  assert.equal(normalizeIcon("🇺🇸"), "🇺🇸");
  assert.equal(normalizeIcon("abc"), "ab");
  assert.equal(normalizeIcon("✓"), "✓");
  assert.equal(normalizeIcon("   "), null);
  assert.equal(isEmoji("🦄"), true);
  assert.equal(isEmoji("JS"), false);
});

test("normalizeIcon accepts only small png data urls as images", () => {
  const image = "data:image/png;base64,iVBORw0KGgo=";
  assert.equal(normalizeIcon(image), image);
  assert.equal(isIconImage(image), true);
  assert.equal(isIconImage("data:image/svg+xml;base64,AAAA"), false);
  assert.equal(isIconImage(`data:image/png;base64,${"A".repeat(50000)}`), false);
});

test("normalizeColor accepts six-digit hex only", () => {
  assert.equal(normalizeColor(" #FFD400 "), "#ffd400");
  assert.equal(normalizeColor("#fff"), null);
  assert.equal(normalizeColor("red"), null);
});

test("readableTextColor picks dark text on light colors and white on the palette", () => {
  assert.equal(readableTextColor("#ffd400"), "#111827");
  assert.equal(readableTextColor("#ffffff"), "#111827");
  assert.equal(readableTextColor("#000000"), "#ffffff");
  SPACE_COLORS.forEach((color) => assert.equal(readableTextColor(color.value), "#ffffff"));
});

test("withoutSpaces drops pins and styles for removed folders only", () => {
  const styles = { 1: { color: "#111111", icon: "⭐" }, 20: { color: "#222222", icon: "🚀" }, 30: { color: "#333333", icon: "🔥" } };
  const result = withoutSpaces(["20", "30"], styles, ["20", "99"]);
  assert.deepEqual(result.spaceFolderIds, ["30"]);
  assert.deepEqual(Object.keys(result.spaceStyles), ["1", "30"]);
  assert.equal(result.changed, true);
  assert.equal(withoutSpaces(["30"], styles, ["99"]).changed, false);
});

test("remapSpaces restores a pin and style under the re-created folder id", () => {
  const before = { spaceFolderIds: ["20"], spaceStyles: { 20: { color: "#222222", icon: "🚀" } } };
  const current = { spaceFolderIds: ["30"], spaceStyles: {} };
  const result = remapSpaces(before, current, new Map([["20", "77"], ["21", "78"]]));
  assert.deepEqual(result.spaceFolderIds, ["30", "77"]);
  assert.deepEqual(result.spaceStyles, { 77: { color: "#222222", icon: "🚀" } });
  assert.equal(result.changed, true);
  assert.equal(remapSpaces(before, current, new Map([["21", "78"]])).changed, false);
});
