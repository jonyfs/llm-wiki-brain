import test from "node:test";
import assert from "node:assert/strict";
import { wantedDendrites, reshuffle, growDendrites, AXON_TIPS } from "../.test-build/ports.mjs";

test("wantedDendrites caps at 20", () => {
  assert.equal(wantedDendrites(100), 20);
});

test("wantedDendrites for deg 5", () => {
  assert.equal(wantedDendrites(5), 5);
});

test("wantedDendrites for deg 0", () => {
  assert.equal(wantedDendrites(0), 0);
});

test("AXON_TIPS is 3", () => {
  assert.equal(AXON_TIPS, 3);
});

test("reshuffle returns a Den", () => {
  const d = { m: [1, 2, 3], t: [2, 4, 6], b: null };
  const r = () => 0.5;
  const result = reshuffle(d, r);
  assert.ok(result.m);
  assert.ok(result.t);
  assert.ok(Array.isArray(result.m));
  assert.ok(Array.isArray(result.t));
});

test("growDendrites grows dendrites", () => {
  const den = [{ m: [1, 0, 0], t: [2, 0, 0], b: null }];
  const base = [{ m: [0, 1, 0], t: [0, 2, 0], b: null }];
  growDendrites(den, base, 3, () => 0.5);
  assert.ok(den.length >= 1);
});
import { assignPorts, axonShape, axonTipDirs, edgeBend, edgeCurve, perpendicular, phiOf } from "../.test-build/ports.mjs";

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// The camera: a turn of `yaw` around the vertical axis, orthographic (x and y of the rotated vector).
const cam = (yaw) => (v) => [v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw), v[1]];

test("perpendicular is a unit vector across the axis for any turn", () => {
	for (const a of [[1, 0, 0], [0, 1, 0], [0.6, 0.8, 0], [0, 0.3, -0.954]]) {
		const l = Math.hypot(...a), u = a.map((v) => v / l);
		for (const phi of [0, 1, 2.5, 4]) {
			const p = perpendicular(u, phi);
			assert.ok(Math.abs(Math.hypot(...p) - 1) < 1e-9);
			assert.ok(Math.abs(dot(p, u)) < 1e-9);
		}
	}
});

test("a link's bulge turns with the brain: across the view it shows, toward the viewer it vanishes", () => {
	// chord along x; phi picks the bulge direction around it. Find the phi whose bulge points along world z.
	let phiZ = 0;
	for (let i = 0; i < 360; i++) { const n = perpendicular([1, 0, 0], (i / 360) * 6.2832); if (n[2] > 0.999) phiZ = (i / 360) * 6.2832; }
	const front = edgeBend(100, 0, 0, phiZ, 0.1, cam(0), 1), side = edgeBend(100, 0, 0, phiZ, 0.1, cam(Math.PI / 2), 1);
	assert.ok(Math.hypot(...front) < 0.5, "bulge along the view axis shows nothing in front");
	assert.ok(Math.hypot(...side) > 8, "turned a quarter, the same bulge shows across the screen");
	const back = edgeBend(100, 0, 0, phiZ, 0.1, cam(Math.PI), 1);
	assert.ok(Math.hypot(...back) < 0.5, "and nothing again from behind");
});

test("edgeBend follows the world: opposite camera turns mirror the bulge", () => {
	const phi = phiOf(5), a = edgeBend(80, 20, 30, phi, 0.08, cam(0.7), 1), b = edgeBend(80, 20, 30, phi, 0.08, cam(0.7 + Math.PI), 1);
	assert.ok(Math.abs(a[0] + b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6);
});

test("edgeBend is bounded by the chord and zero for a zero chord", () => {
	assert.deepEqual(edgeBend(0, 0, 0, 1, 0.1, cam(0), 1), [0, 0]);
	const big = edgeBend(100, 0, 0, 0, 9, cam(Math.PI / 2), 1);
	assert.ok(Math.hypot(...big) <= 45.0001);
});

test("edgeCurve draws the same curve from either end", () => {
	const A = [0, 0, 1, 0, 100, 40, -1, 0];
	const f = edgeCurve(A, 0, true, 3, -7), r = edgeCurve(A, 0, false, 3, -7);
	assert.deepEqual([f[0], f[1], f[6], f[7]], [0, 0, 100, 40]);
	assert.deepEqual([r[0], r[1], r[6], r[7]], [100, 40, 0, 0]);
	assert.ok(Math.abs(f[2] - r[4]) < 1e-9 && Math.abs(f[3] - r[5]) < 1e-9, "the controls swap with the ends");
});

test("axonShape lies along the axon and its terminals fan out around it", () => {
	const ax = [0.6, 0, 0.8], s = axonShape(ax, 3);
	assert.ok(Math.abs(dot(s.e, ax) - 6) < 1e-9, "the trunk ends 6 radii out along the axon");
	assert.ok(Math.abs(dot(s.h, ax) - 1.7) < 1e-9);
	for (const d of s.dirs) assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9);
	for (const d of axonTipDirs(ax, 3)) assert.ok(dot(d, ax) > 0.6, "every terminal leans forward");
	assert.ok(dot(s.tips[1], s.tips[2]) < dot(s.tips[1], s.tips[1]), "side terminals are on opposite sides");
});

test("each axon terminal serves the page it points toward", () => {
	const nodes = [
		{ id: 0, x: 0, y: 0, z: 0, deg: 3, den: [], port: [], axon: [1, 0, 0] },
		{ id: 1, x: 100, y: 0, z: 0, deg: 1, den: [], port: [] },
		{ id: 2, x: 60, y: 90, z: 0, deg: 1, den: [], port: [] },
		{ id: 3, x: 60, y: -90, z: 0, deg: 1, den: [], port: [] },
	];
	const edges = [[0, 1, 0.1, false, 0, 0], [0, 2, 0.1, false, 0, 0], [0, 3, 0.1, false, 0, 0]];
	assignPorts(nodes, edges, () => {}, (ei, id) => id === 0);
	const tips = edges.map((e) => e[4]);
	assert.equal(new Set(tips).size, 3, "three targets in three directions, three different terminals");
	assert.ok(tips.every((t) => t < 0 && t >= -3));
});
