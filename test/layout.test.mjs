import test from "node:test";
import assert from "node:assert/strict";
import { pruneLayout, coverage } from "../.test-build/layout.mjs";

test("keeps only pages that still exist and rounds the numbers", () => {
	const out = pruneLayout({ "a.md": [1.234, 2.256, -3.049], "gone.md": [0, 0, 0] }, new Set(["a.md"]));
	assert.deepEqual(out, { "a.md": [1.2, 2.3, -3] });
});

test("null keep set keeps everything valid", () => {
	assert.deepEqual(Object.keys(pruneLayout({ "a.md": [1, 2, 3], "b.md": [4, 5, 6] }, null)), ["a.md", "b.md"]);
});

test("malformed entries are dropped, never thrown on", () => {
	const out = pruneLayout({ a: [1, 2], b: "x", c: [1, NaN, 3], d: [Infinity, 0, 0], e: null, f: [1, 2, 3] }, null);
	assert.deepEqual(Object.keys(out), ["f"]);
	assert.deepEqual(pruneLayout(undefined, null), {});
});

test("the cap bounds the size", () => {
	const big = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`p${i}`, [i, i, i]]));
	assert.equal(Object.keys(pruneLayout(big, null, 10)).length, 10);
});

test("coverage is the share of pages with a saved spot", () => {
	assert.equal(coverage(["a", "b", "c", "d"], { a: [0, 0, 0], b: [0, 0, 0] }), 0.5);
	assert.equal(coverage([], { a: [0, 0, 0] }), 0);
	assert.equal(coverage(["a"], undefined), 0);
});
