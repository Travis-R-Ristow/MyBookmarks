import assert from "node:assert/strict";
import { test } from "node:test";
import { coerceUrl, isWebUrl, normalizeUrl } from "../src/lib/urls.js";

test("normalizeUrl ignores trailing slashes and host case", () => {
  assert.equal(normalizeUrl("https://Example.com/docs/"), normalizeUrl("https://example.com/docs"));
  assert.equal(normalizeUrl("https://example.com/"), "https://example.com");
});

test("normalizeUrl keeps query, hash and scheme distinct", () => {
  assert.notEqual(normalizeUrl("https://example.com/?a=1"), normalizeUrl("https://example.com/?a=2"));
  assert.notEqual(normalizeUrl("https://example.com/#one"), normalizeUrl("https://example.com/#two"));
  assert.notEqual(normalizeUrl("http://example.com"), normalizeUrl("https://example.com"));
});

test("normalizeUrl leaves non-web urls untouched", () => {
  assert.equal(normalizeUrl(" javascript:alert(1) "), "javascript:alert(1)");
});

test("coerceUrl adds https when the scheme is missing", () => {
  assert.equal(coerceUrl("example.com/path"), "https://example.com/path");
  assert.equal(coerceUrl("localhost:3000"), "https://localhost:3000");
  assert.equal(coerceUrl("http://example.com"), "http://example.com");
  assert.equal(coerceUrl("javascript:void(0)"), "javascript:void(0)");
});

test("coerceUrl rejects empty and unparseable input", () => {
  assert.equal(coerceUrl("   "), null);
  assert.equal(coerceUrl("not a url"), null);
});

test("isWebUrl accepts only http and https", () => {
  assert.equal(isWebUrl("https://example.com"), true);
  assert.equal(isWebUrl("chrome://settings"), false);
});
