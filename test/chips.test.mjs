import test from "node:test";
import assert from "node:assert/strict";
import { activeChips, withoutChip } from "../.test-build/chips.mjs";

const base = { folder: "", tag: "", minDeg: 0, maxDeg: 0, orphansOnly: false, days: 0, createdDays: 0, invert: false, op: "", dir: "", hidden: [], hood: null, extra: "", isolate: -1 };

test("activeChips returns empty for no filters", () => {
  const chips = activeChips(base, null, "", -1);
  assert.equal(chips.length, 0);
});

test("activeChips returns folder chip", () => {
  const f = { ...base, folder: "wiki/sources" };
  const chips = activeChips(f, null, "", -1);
  assert.ok(chips.length >= 1);
  assert.ok(chips.some((c) => c.key === "folder"));
});

test("activeChips returns tag chip", () => {
  const f = { ...base, tag: "ai" };
  const chips = activeChips(f, null, "", -1);
  assert.ok(chips.some((c) => c.key === "tag"));
});

test("withoutChip removes folder filter", () => {
  const f = { ...base, folder: "wiki/sources" };
  const result = withoutChip(f, "folder");
  assert.equal(result.folder, "");
});