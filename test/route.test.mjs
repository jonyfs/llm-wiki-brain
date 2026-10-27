import test from "node:test";
import assert from "node:assert/strict";
import { findRoute, spreadFrom } from "../.test-build/route.mjs";

// 0-1-2-3 chain, 0-4 side, 5 isolated
const adj = [[1, 4], [0, 2], [1, 3], [2], [0], []];
const all = () => true;

test("finds the shortest route", () => {
	assert.deepEqual(findRoute(adj, 0, 3, all), [0, 1, 2, 3]);
});

test("returns null for isolated or identical cells", () => {
	assert.equal(findRoute(adj, 0, 5, all), null);
	assert.equal(findRoute(adj, 2, 2, all), null);
});

test("respects the allowed filter", () => {
	assert.equal(findRoute(adj, 0, 3, (i) => i !== 2), null);
	assert.deepEqual(findRoute(adj, 0, 3, (i) => i !== 5), [0, 1, 2, 3]);
});

test("respects the hop limit", () => {
	assert.equal(findRoute(adj, 0, 3, all, 2), null);
	assert.deepEqual(findRoute(adj, 0, 3, all, 3), [0, 1, 2, 3]);
});

test("spreadFrom walks two hops, best connected first, with a cap", () => {
	const deg = adj.map((a) => a.length);
	const hits = spreadFrom(adj, deg, [0], all, 2, 4, 24);
	assert.deepEqual(hits.map((h) => h.id).sort(), [0, 1, 2, 4]);
	assert.equal(hits[0].hop, 0);
	assert.equal(spreadFrom(adj, deg, [0], all, 2, 4, 2).length, 2);
});

import { assignLobes, communities } from "../.test-build/route.mjs";

test("communities group linked cells and keep separate clusters apart", () => {
	// two triangles joined by nothing, plus a loose cell
	const a = [[1, 2], [0, 2], [0, 1], [4, 5], [3, 5], [3, 4], []];
	const l = communities(a);
	assert.equal(l[0], l[1]);
	assert.equal(l[1], l[2]);
	assert.equal(l[3], l[4]);
	assert.notEqual(l[0], l[3]);
});

test("assignLobes spreads cells over several lobes in proportion to their weight", () => {
	// a chain of 60 cells, all connected: the old bug put every one of them in a single lobe
	const n = 60;
	const adj = Array.from({ length: n }, (_, i) => [i - 1, i + 1].filter((j) => j >= 0 && j < n));
	const weights = [1.7, 1.7, 0.7, 0.7, 0.9, 0.8, 0.35];
	const lobes = assignLobes(adj, weights, [0, 1, 4, 2, 3, 5, 6]);
	const used = new Set(lobes);
	assert.ok(used.size >= 5, "uses most lobes, got " + used.size);
	const c0 = lobes.filter((x) => x === 0).length, c1 = lobes.filter((x) => x === 1).length;
	assert.ok(Math.abs(c0 - c1) <= 2, "hemispheres balanced: " + c0 + " vs " + c1);
});

import { creationOrder } from "../.test-build/route.mjs";

test("creationOrder: oldest first, skips the index and hidden pages, keeps ties in order", () => {
	const cells = [
		{ id: 0, ctime: 9, isIndex: true, off: false },
		{ id: 1, ctime: 30, isIndex: false, off: false },
		{ id: 2, ctime: 10, isIndex: false, off: false },
		{ id: 3, ctime: 10, isIndex: false, off: false },
		{ id: 4, ctime: 1, isIndex: false, off: true },
	];
	assert.deepEqual(creationOrder(cells, 0), [2, 3, 1]);
});

test("creationOrder with a fallback index that is not flagged skips it too", () => {
	const cells = [{ id: 0, ctime: 5, isIndex: false, off: false }, { id: 1, ctime: 6, isIndex: false, off: false }];
	assert.deepEqual(creationOrder(cells, 0), [1]);
});
