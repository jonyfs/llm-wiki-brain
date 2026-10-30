import test from "node:test";
import assert from "node:assert/strict";
import { colorCats, sizeFactors } from "../.test-build/cats.mjs";

const pages = [
  { path: "a.md", folder: "wiki/sources", tags: ["ai"], mtime: 1000, deg: 5 },
  { path: "b.md", folder: "wiki/entities", tags: ["ml"], mtime: 2000, deg: 3 },
  { path: "c.md", folder: "wiki/concepts", tags: ["ai"], mtime: 3000, deg: 8 },
];

test("colorCats by type returns null (type uses fixed palette)", () => {
  const r = colorCats("type", pages);
  assert.equal(r, null);
});

test("colorCats by folder returns labels", () => {
  const r = colorCats("folder", pages);
  assert.ok(r);
  assert.ok(r.labels.length > 0);
});

test("colorCats by tag returns labels", () => {
  const r = colorCats("tag", pages);
  assert.ok(r);
  assert.ok(r.labels.length > 0);
});

test("sizeFactors by degree returns map", () => {
  const r = sizeFactors("degree", pages, 5000);
  assert.ok(r instanceof Map);
  assert.equal(r.size, 3);
});

test("sizeFactors same returns null or uniform", () => {
  const r = sizeFactors("same", pages, 5000);
  // "same" mode may return null (uniform) or a map of 1s
  assert.ok(r === null || r instanceof Map);
});