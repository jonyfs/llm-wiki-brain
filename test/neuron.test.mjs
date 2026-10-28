import test from "node:test";
import assert from "node:assert/strict";
import { quadPoints, taperStrip, somaRadii } from "../.test-build/neuron.mjs";
import { freeDirection } from "../.test-build/ports.mjs";

test("quadPoints has n+1 points that start and end where asked", () => {
	const p = quadPoints(0, 0, 5, 10, 10, 0, 6);
	assert.equal(p.length, 14);
	assert.deepEqual([p[0], p[1], p[12], p[13]], [0, 0, 10, 0]);
});

test("taperStrip is a closed polygon that narrows along the branch", () => {
	const pts = [0, 0, 10, 0, 20, 0, 30, 0];
	const poly = taperStrip(pts, 8, 2);
	assert.equal(poly.length, 16); // 4 points on each side
	const width = (i) => Math.abs(poly[i * 2 + 1] - poly[(7 - i) * 2 + 1]); // left edge i against its right edge
	assert.ok(Math.abs(width(0) - 8) < 1e-9);
	assert.ok(Math.abs(width(3) - 2) < 1e-9);
	assert.ok(width(0) > width(1) && width(1) > width(2) && width(2) > width(3));
});

test("taperStrip with fewer than two points gives nothing and never throws", () => {
	assert.deepEqual(taperStrip([], 4, 1), []);
	assert.deepEqual(taperStrip([1, 1], 4, 1), []);
});

test("taperStrip on a zero-length branch stays finite", () => {
	for (const v of taperStrip([5, 5, 5, 5, 5, 5], 4, 1)) assert.ok(Number.isFinite(v));
});

test("somaRadii bulges toward each dendrite and stays near 1 elsewhere", () => {
	const r = somaRadii([0, Math.PI], 36);
	assert.equal(r.length, 36);
	assert.ok(r[0] > 1.15, "bulge at angle 0");
	assert.ok(r[18] > 1.15, "bulge at angle pi");
	assert.ok(r[9] < 1.12 && r[27] < 1.12, "quiet between them");
	assert.ok(r.every((v) => v > 0.9 && v < 1.6));
});

test("somaRadii with no dendrites is a slightly folded circle", () => {
	const r = somaRadii([], 24);
	assert.ok(r.every((v) => Math.abs(v - 1) <= 0.09 + 1e-9));
});

test("freeDirection points away from the dendrites", () => {
	const den = [[3, 0, 0], [-3, 0, 0], [0, 0, 3], [0, 0, -3]].map((t) => ({ m: t, t, b: null }));
	const v = freeDirection(den);
	assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
	assert.ok(Math.abs(v[1]) > 0.9, "the free side is up or down, not along a dendrite");
});

test("freeDirection with no dendrites still returns a unit vector", () => {
	assert.ok(Math.abs(Math.hypot(...freeDirection([])) - 1) < 1e-9);
});
