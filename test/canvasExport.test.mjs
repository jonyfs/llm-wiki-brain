import test from "node:test";
import assert from "node:assert/strict";
import { toCanvas } from "../.test-build/canvasExport.mjs";

test("toCanvas returns nodes and edges", () => {
  const items = [{ path: "a.md", x: 0, y: 0 }, { path: "b.md", x: 10, y: 10 }];
  const links = [["a.md", "b.md"]];
  const r = toCanvas(items, links);
  assert.ok(Array.isArray(r.nodes));
  assert.ok(Array.isArray(r.edges));
  assert.equal(r.nodes.length, 2);
  assert.equal(r.edges.length, 1);
});

test("toCanvas with empty input", () => {
  const r = toCanvas([], []);
  assert.equal(r.nodes.length, 0);
  assert.equal(r.edges.length, 0);
});