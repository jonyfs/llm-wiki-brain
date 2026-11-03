import test from "node:test";
import assert from "node:assert/strict";
import { quadPoints, taperStrip, somaRadii } from "../.test-build/neuron.mjs";
import { axonDirection, freeDirection } from "../.test-build/ports.mjs";

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

test("axonDirection leans toward the pages the cell links to", () => {
	const den = [[0, 0, 3], [0, 0, -3], [0, 3, 0]].map((t) => ({ m: t, t, b: null }));
	const v = axonDirection(den, [[1, 0, 0], [0.8, 0.6, 0]]);
	assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
	assert.ok(v[0] > 0.7, "points mostly along +x, where both targets are");
});

test("axonDirection steps aside when a dendrite already sits on the target", () => {
	const den = [[3, 0, 0]].map((t) => ({ m: t, t, b: null }));
	const v = axonDirection(den, [[1, 0, 0]]);
	assert.ok(v[0] < 0.95, "not on top of the dendrite");
	assert.ok(v[0] > 0.3, "still faces its target");
});

test("axonDirection with no targets falls back to the free direction", () => {
	const den = [[3, 0, 0], [-3, 0, 0]].map((t) => ({ m: t, t, b: null }));
	assert.deepEqual(axonDirection(den, []), freeDirection(den));
});

import { MARK_OF, arborize, denControl, markPoly, quadAt, quadDir } from "../.test-build/neuron.mjs";
import { rng } from "../.test-build/rand.mjs";

const len3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("quadAt hits both ends and quadDir is a unit vector", () => {
	const a = [0, 0, 0], c = [1, 2, 0], b = [4, 0, 1];
	assert.deepEqual(quadAt(a, c, b, 0), a);
	assert.deepEqual(quadAt(a, c, b, 1), b);
	for (const u of [0, 0.3, 0.7, 1]) assert.ok(Math.abs(Math.hypot(...quadDir(a, c, b, u)) - 1) < 1e-9);
});

test("arborize: a page always grows the same tree, thinner at every level, never past the cap", () => {
	const d = { m: [1.5, 0.5, 0], t: [4, 1, 1], b: null };
	const k1 = arborize(d, 0, 0.9, rng(5), 3, 9), k2 = arborize(d, 0, 0.9, rng(5), 3, 9);
	assert.deepEqual(k1, k2);
	assert.ok(k1.length >= 1 && k1.length <= 9);
	for (const k of k1) {
		assert.ok(k.lvl >= 1 && k.lvl <= 3);
		assert.ok(Math.abs(k.wr - Math.pow(0.63, k.lvl)) < 1e-9, "each level is 63% of the one above (Rall)");
		assert.ok(len3(k.a, k.b) > 0.1, "has a length");
	}
});

test("arborize: levels are capped, and a low forkP grows fewer branches than a high one", () => {
	const d = { m: [1.5, 0.5, 0], t: [4, 1, 1], b: null };
	assert.ok(arborize(d, 0, 0.9, rng(2), 1).every((k) => k.lvl === 1));
	let lo = 0, hi = 0;
	for (let s = 1; s <= 40; s++) { lo += arborize(d, 0, 0.05, rng(s)).length; hi += arborize(d, 0, 0.95, rng(s)).length; }
	assert.ok(hi > lo);
});

test("children start on the parent: the first level begins on the primary curve", () => {
	const d = { m: [1.5, 0.5, 0], t: [4, 1, 1], b: null }, c = denControl(d, 0);
	for (const k of arborize(d, 0, 1, rng(9), 1)) {
		let best = 9;
		for (let u = 0; u <= 1; u += 0.01) best = Math.min(best, len3(quadAt([0, 0, 0], c, d.t, u), k.a));
		assert.ok(best < 0.05, "branch point lies on the dendrite");
	}
});

test("marks: four types, four different shapes, each inside its radius", () => {
	const kinds = new Set(Object.values(MARK_OF));
	assert.equal(kinds.size, 4);
	for (const kind of kinds) {
		const p = markPoly(kind, 10);
		assert.ok(p.length >= 6 && p.length % 2 === 0);
		for (let i = 0; i < p.length; i += 2) assert.ok(Math.hypot(p[i], p[i + 1]) <= 10 + 1e-9, kind);
	}
	assert.notDeepEqual(markPoly("diamond", 5), markPoly("triangle", 5));
});
