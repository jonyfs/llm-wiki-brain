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
