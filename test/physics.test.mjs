import test from "node:test";
import assert from "node:assert/strict";
import { simStep, LOBES, GAP, fold } from "../.test-build/physics.mjs";

const cell = (id, lobe, x, y, z) => ({ id, lobe, side: LOBES[lobe].side, x, y, z, vx: 0, vy: 0, vz: 0 });

test("no cells and no links is a no-op", () => {
	assert.doesNotThrow(() => simStep([], [], 1));
});

test("two cells on the same spot do not become NaN", () => {
	const a = cell(0, 4, 0, -90, 0), b = cell(1, 4, 0, -90, 0);
	simStep([a, b], [], 1);
	for (const v of [a.x, a.y, a.z, b.x, b.y, b.z]) assert.ok(Number.isFinite(v));
});

test("cells repel each other", () => {
	const a = cell(0, 4, -5, -90, 0), b = cell(1, 4, 5, -90, 0);
	simStep([a, b], [], 1);
	assert.ok(b.x - a.x > 10, "moved apart");
});

test("a link pulls distant cells together", () => {
	const a = cell(0, 4, -100, -90, 0), b = cell(1, 4, 100, -90, 0);
	const before = b.x - a.x;
	simStep([a, b], [[0, 1, 0.05, false, 0, 0]], 1);
	assert.ok(b.x - a.x < before);
});

test("a cell far outside its lobe is pulled back in", () => {
	const a = cell(0, 4, 0, -90, 600);
	for (let i = 0; i < 50; i++) simStep([a], [], 1);
	assert.ok(Math.abs(a.z) < 600);
});

test("hemispheres stay apart: a left cell never crosses the fissure", () => {
	const a = cell(0, 0, 3, 0, 0); // left hemisphere, but on the right side of the midline
	simStep([a], [], 1);
	assert.ok(a.x <= -GAP + 1e-9);
});

test("fold stays within a few percent of 1", () => {
	for (const [x, y, z] of [[0, 0, 0], [100, -50, 20], [-300, 200, 90]]) assert.ok(Math.abs(fold(x, y, z) - 1) <= 0.16);
});

test("a pinned node does not move while the others still react to it", () => {
	const mk = (id, x) => ({ id, lobe: 0, side: 0, x, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
	const a = { ...mk(0, 0), pinned: true }, b = mk(1, 1);
	for (let i = 0; i < 40; i++) simStep([a, b], [], 1);
	assert.equal(a.x, 0);
	assert.equal(a.vx, 0);
	assert.ok(Math.abs(b.x - 1) > 0.01);
});

import { CORE, REACH, WALL } from "../.test-build/physics.mjs";

function settle(n, links, steps = 500) {
	const nodes = Array.from({ length: n }, (_, i) => ({ id: i, lobe: 0, side: -1, x: -92 + (i % 3) * 3, y: -18 + (i % 2) * 3, z: (i % 4) * 2, vx: 0, vy: 0, vz: 0 })); // all bunched at the centre
	for (let s = 0, a = 1; s < steps; s++, a *= 0.995) simStep(nodes, links, Math.max(a, 0.3));
	const L = LOBES[0];
	const q = nodes.map((a) => Math.hypot((a.x - L.c[0]) / L.r[0], (a.y - L.c[1]) / L.r[1], (a.z - L.c[2]) / L.r[2]));
	return { rms: Math.sqrt(q.reduce((s, x) => s + x * x, 0) / n), max: Math.max(...q) };
}

test("a handful of nodes bunched at the centre spread out to use the lobe", () => {
	for (const n of [3, 6, 12]) {
		const r = settle(n, []);
		assert.ok(r.rms > 0.5, n + " nodes: rms " + r.rms.toFixed(2));
		assert.ok(r.max <= WALL * 1.06, n + " nodes: max " + r.max.toFixed(2)); // fold wobbles the wall by about 5%
	}
});

test("linked nodes spread too, without leaving the shell", () => {
	const links = Array.from({ length: 7 }, (_, i) => [i, i + 1]);
	const r = settle(8, links);
	assert.ok(r.rms > 0.45, "rms " + r.rms.toFixed(2));
	assert.ok(r.max <= WALL * 1.06, "max " + r.max.toFixed(2));
});

test("a hub pulling 60 leaves never drags anyone out of the brain", () => {
	const links = Array.from({ length: 60 }, (_, i) => [0, i + 1]);
	const r = settle(61, links, 400);
	assert.ok(r.max <= WALL * 1.06, "max " + r.max.toFixed(2));
});

test("the radial quota spreads nodes through the volume: the median sits near the uniform-ball value", () => {
	const nodes = Array.from({ length: 60 }, (_, i) => ({ id: i, lobe: 0, side: -1, x: -92 + (i % 5), y: -18 + (i % 3), z: i % 7, vx: 0, vy: 0, vz: 0 }));
	for (let s = 0; s < 600; s++) simStep(nodes, [], 0.5);
	const L = LOBES[0], q = nodes.map((a) => Math.hypot((a.x - L.c[0]) / L.r[0], (a.y - L.c[1]) / L.r[1], (a.z - L.c[2]) / L.r[2])).sort((a, b) => a - b);
	const median = q[30], uniform = REACH * (CORE + (1 - CORE) * Math.cbrt(0.5));
	assert.ok(Math.abs(median - uniform) < 0.15, "median " + median.toFixed(2) + " vs " + uniform.toFixed(2));
	assert.ok(q[0] < 0.5 && q[59] > 0.75, "spans " + q[0].toFixed(2) + ".." + q[59].toFixed(2));
});

test("nodes bunched to one side of a lobe cover it side to side afterwards", () => {
	const nodes = Array.from({ length: 24 }, (_, i) => ({ id: i, lobe: 1, side: 1, x: 92 + 60 + (i % 4) * 2, y: -18 + (i % 3), z: (i % 5), vx: 0, vy: 0, vz: 0 }));
	for (let s = 0; s < 800; s++) simStep(nodes, [], 0.5);
	const L = LOBES[1], ex = nodes.map((a) => (a.x - L.c[0]) / L.r[0]), ey = nodes.map((a) => (a.y - L.c[1]) / L.r[1]), ez = nodes.map((a) => (a.z - L.c[2]) / L.r[2]);
	const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length, std = (v) => Math.sqrt(mean(v.map((x) => (x - mean(v)) ** 2)));
	for (const v of [ex, ey, ez]) {
		assert.ok(Math.abs(mean(v)) < 0.2, "centroid " + mean(v).toFixed(2));
		assert.ok(std(v) > 0.3, "spread " + std(v).toFixed(2));
	}
});
