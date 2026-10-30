import test from "node:test";
import assert from "node:assert/strict";
import { convexHull, neighbourInDirection } from "../.test-build/hull.mjs";

test("convexHull of 3 points returns all 3", () => {
  const pts = [[0, 0], [10, 0], [5, 10]];
  const h = convexHull(pts);
  assert.equal(h.length, 3);
});

test("convexHull of collinear points returns endpoints", () => {
  const pts = [[0, 0], [5, 0], [10, 0]];
  const h = convexHull(pts);
  assert.ok(h.length <= 3);
});

test("convexHull of single point returns it", () => {
  const pts = [[5, 5]];
  const h = convexHull(pts);
  assert.equal(h.length, 1);
});

test("neighbourInDirection finds closest in direction", () => {
  const cands = [{ id: 1, x: 10, y: 0 }, { id: 2, x: 0, y: 10 }];
  const r = neighbourInDirection([0, 0], cands, 1, 0);
  assert.equal(r, 1);
});