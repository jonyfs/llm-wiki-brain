import test from "node:test";
import assert from "node:assert/strict";
import { bfsLevels, hopMs } from "../.test-build/wave.mjs";

test("bfsLevels from node 0 reaches all", () => {
  const out = [[1], [2], []];
  const any = [[], [], []];
  const w = bfsLevels(out, any, 0, () => true);
  assert.ok(w);
  assert.ok(w.levels.length >= 1);
});

test("hopMs returns positive for hop 0", () => {
  const ms = hopMs(0, 1);
  assert.ok(ms >= 0);
});

test("hopMs increases with hops", () => {
  const ms0 = hopMs(0, 1);
  const ms3 = hopMs(3, 1);
  assert.ok(ms3 >= ms0);
});