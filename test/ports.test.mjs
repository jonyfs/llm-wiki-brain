import test from "node:test";
import assert from "node:assert/strict";
import { AXON_TIPS, assignPorts, edgeCurve, growDendrites, wantedDendrites, reshuffle } from "../.test-build/ports.mjs";

const den = (x, y, z) => ({ m: [x * 0.5, y * 0.5, z * 0.5], t: [x, y, z], b: null });
const node = (id, x, y, z, dens, deg) => ({ id, x, y, z, deg, den: dens, port: [] });
const noGrow = () => {};

test("a link leaves through the dendrite pointing at the other cell", () => {
	const a = node(0, 0, 0, 0, [den(3, 0, 0), den(-3, 0, 0)], 1);
	const b = node(1, 100, 0, 0, [den(3, 0, 0), den(-3, 0, 0)], 1);
	const e = [0, 1, 0.05, false, 0, 0];
	assignPorts([a, b], [e], noGrow);
	assert.equal(e[4], 0); // +x dendrite of a faces b
	assert.equal(e[5], 1); // -x dendrite of b faces a
	assert.deepEqual(a.port, [1, 0]);
});

test("a cell with no links keeps all dendrites free", () => {
	const a = node(0, 0, 0, 0, [den(3, 0, 0)], 0);
	assignPorts([a], [], noGrow);
	assert.deepEqual(a.port, [0]);
});

test("the load penalty spreads links over branches that point the same way", () => {
	const a = node(0, 0, 0, 0, [den(3, 0, 0), den(3, 0.4, 0), den(3, -0.4, 0)], 3);
	const others = [1, 2, 3].map((i) => node(i, 100, 0, 0, [den(-3, 0, 0)], 1));
	const edges = others.map((o) => [0, o.id, 0.05, false, 0, 0]);
	assignPorts([a, ...others], edges, noGrow);
	assert.deepEqual(a.port.slice().sort(), [1, 1, 1]);
});

test("a hub with more links than branches asks for more branches, and every link gets one", () => {
	const hub = node(0, 0, 0, 0, [den(3, 0, 0)], 6);
	const leaves = [1, 2, 3, 4, 5, 6].map((i) => node(i, 100 * Math.cos(i), 100 * Math.sin(i), 0, [den(-3, 0, 0)], 1));
	const edges = leaves.map((l) => [0, l.id, 0.05, false, 0, 0]);
	let asked = 0;
	assignPorts([hub, ...leaves], edges, (n, want) => {
		asked = want;
		growDendrites(n.den, n.den.slice(), want, () => 0.5);
	});
	assert.equal(asked, 6);
	assert.equal(hub.den.length, 6);
	assert.equal(hub.port.reduce((s, v) => s + v, 0), 6);
	for (const e of edges) assert.ok(e[4] >= 0 && e[4] < hub.den.length);
});

test("wantedDendrites follows degree and is capped", () => {
	assert.equal(wantedDendrites(0), 0);
	assert.equal(wantedDendrites(7), 7);
	assert.equal(wantedDendrites(500), 20);
});

test("growDendrites with no base does nothing instead of looping", () => {
	const d = [];
	growDendrites(d, [], 5, () => 0.5);
	assert.equal(d.length, 0);
});

test("reshuffle keeps the branch length", () => {
	const d = reshuffle(den(3, 0, 0), () => 0.3);
	assert.ok(Math.abs(Math.hypot(...d.t) - 3) < 1e-9);
});

// A holds [x, y, outX, outY] for each end of one edge
const A = (a, b) => Float64Array.from([...a, ...b]);

test("edgeCurve starts and ends on the dendrite tips", () => {
	const c = edgeCurve(A([0, 0, 1, 0], [100, 0, -1, 0]), 0, true, 0.05);
	assert.deepEqual([c[0], c[1], c[6], c[7]], [0, 0, 100, 0]);
});

test("edgeCurve reversed starts at the other tip", () => {
	const c = edgeCurve(A([0, 0, 1, 0], [100, 0, -1, 0]), 0, false, 0.05);
	assert.deepEqual([c[0], c[1], c[6], c[7]], [100, 0, 0, 0]);
});

test("a branch pointing away from the other cell gets a short tangent (no loop)", () => {
	const toward = edgeCurve(A([0, 0, 1, 0], [100, 0, -1, 0]), 0, true, 0);
	const away = edgeCurve(A([0, 0, -1, 0], [100, 0, -1, 0]), 0, true, 0);
	assert.ok(toward[2] - 0 > Math.abs(away[2] - 0) * 2, "tangent is longer when pointing at the target");
});

test("two cells on the same spot do not make NaN", () => {
	const c = edgeCurve(A([5, 5, 1, 0], [5, 5, -1, 0]), 0, true, 0.1);
	for (const v of c) assert.ok(Number.isFinite(v));
});

test("a one-way link leaves through an axon terminal and arrives on a dendrite", () => {
	const mk = (id, x) => ({ id, x, y: 0, z: 0, deg: 1, din: id === 1 ? 1 : 0, den: [{ m: [0, 0, 0], t: [1, 0, 0], b: null }, { m: [0, 0, 0], t: [-1, 0, 0], b: null }], port: [] });
	const a = mk(0, 0), b = mk(1, 100);
	const e = [0, 1, 0.1, false, 0, 0];
	assignPorts([a, b], [e], () => {}, (ei, id) => id === 0);
	assert.equal(e[4], -1); // tip 0 at the source
	assert.ok(e[5] >= 0); // a dendrite at the target
	assert.equal(b.port.reduce((x, y) => x + y, 0), 1);
	assert.equal(a.port.reduce((x, y) => x + y, 0), 0);
});

test("outgoing links spread over the axon terminals, then reuse them", () => {
	const hub = { id: 0, x: 0, y: 0, z: 0, deg: 4, din: 0, den: [], port: [] };
	const leaves = [1, 2, 3, 4].map((id) => ({ id, x: 50 * id, y: 0, z: 0, deg: 1, den: [{ m: [0, 0, 0], t: [1, 0, 0], b: null }], port: [] }));
	const edges = leaves.map((l) => [0, l.id, 0.1, false, 0, 0]);
	assignPorts([hub, ...leaves], edges, () => {}, (ei, id) => id === 0);
	assert.deepEqual(edges.map((e) => e[4]), [-1, -2, -3, -1]);
	assert.equal(AXON_TIPS, 3);
});

test("dendrites are sized by inputs when din is given", () => {
	const a = { id: 0, x: 0, y: 0, z: 0, deg: 9, din: 2, den: [], port: [] };
	let asked = 0;
	assignPorts([a], [], (n, want) => (asked = want));
	assert.equal(asked, 2);
});
