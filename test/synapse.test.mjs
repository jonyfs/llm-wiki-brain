import test from "node:test";
import assert from "node:assert/strict";
import { Net, cascade, hebb, synapsesOf, weightOf } from "../.test-build/synapse.mjs";

const net = (n, links, o) => new Net(n, synapsesOf(links), o);

test("weightOf: one mention is 1, repeated mentions are stronger, capped", () => {
	assert.equal(weightOf(1), 1);
	assert.ok(weightOf(3) > weightOf(2));
	assert.equal(weightOf(50), 1.6);
	assert.equal(weightOf(0), 1);
});

test("synapsesOf keeps direction: a link both ways makes two synapses", () => {
	const s = synapsesOf([[0, 1], [1, 0], [0, 2], [3, 3]]);
	assert.equal(s.length, 3);
	assert.ok(s.some((x) => x.from === 1 && x.to === 0));
	const dup = synapsesOf([[0, 1, 1], [0, 1, 4]]);
	assert.equal(dup.length, 1);
	assert.equal(dup[0].w, weightOf(4));
});

test("threshold grows with the number of inputs", () => {
	const n = net(6, [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [0, 1]]);
	assert.ok(n.theta[5] > n.theta[1]);
	assert.equal(n.theta[0], 1);
});

test("cascade follows outgoing links only", () => {
	const n = net(3, [[0, 1], [1, 2]]);
	assert.deepEqual(cascade(n, [0]).map((s) => [s.from, s.to]), [[0, 1], [1, 2]]);
	assert.deepEqual(cascade(n, [2]), []); // 2 has no outgoing link: nothing downstream
});

test("one input is not enough for a hub, two together are (spatial summation)", () => {
	const links = [[0, 4], [1, 4], [2, 4], [3, 4]];
	const n = net(5, links, { threshold: 1.5 });
	const one = cascade(n, [0]);
	assert.equal(one.length, 1);
	assert.equal(one[0].fires, false);
	const two = cascade(n, [0, 1]);
	assert.equal(two.filter((s) => s.fires).map((s) => s.to).join(), "4");
});

test("a cell fires once even when more spikes arrive", () => {
	const n = net(4, [[0, 1], [0, 2], [1, 3], [2, 3]], { threshold: 0.5 });
	const sp = cascade(n, [0]);
	assert.equal(sp.filter((s) => s.fires && s.to === 3).length, 1);
	assert.equal(sp.filter((s) => s.to === 3).length, 2);
});

test("a cascade leaves the net as it found it", () => {
	const n = net(3, [[0, 1], [1, 2]]);
	n.v[2] = 0.4;
	cascade(n, [0]);
	assert.equal(n.v[2], 0.4);
	assert.equal(n.rest.every((r) => r === 0), true);
});

test("limits: ticks and spikes are capped, cycles end", () => {
	const ring = net(3, [[0, 1], [1, 2], [2, 0]], { threshold: 0.5 });
	assert.equal(cascade(ring, [0]).length, 3);
	const wide = net(30, Array.from({ length: 29 }, (_, i) => [0, i + 1]), { threshold: 0.5 });
	assert.equal(cascade(wide, [0], 5, 10).length, 10);
	assert.equal(cascade(wide, [-1, 99]).length, 0);
});

test("an inhibitory synapse keeps the target quiet", () => {
	const n = new Net(3, [{ from: 0, to: 2, w: 1, base: 1 }, { from: 1, to: 2, w: -1, base: -1 }], { threshold: 0.7 });
	assert.equal(cascade(n, [0, 1]).some((s) => s.fires), false);
	assert.equal(cascade(n, [0]).some((s) => s.fires), true);
});

test("charge leaks, rest counts down, charge reads 0..1", () => {
	const n = net(2, [[0, 1]]);
	n.receive(1, 0.5);
	assert.equal(n.charge(1), 0.5);
	n.tick();
	assert.ok(n.v[1] < 0.5);
	n.fire(1);
	assert.equal(n.receive(1, 5), false); // resting
	n.tick(); n.tick();
	assert.equal(n.receive(1, 5), true);
	assert.equal(n.charge(1), 1);
});

test("hebb strengthens used synapses, caps them, and eases idle ones back", () => {
	const n = net(3, [[0, 1], [0, 2]], { threshold: 0.5, hebb: 0.5 });
	const used = n.out[0][0], idle = n.out[0][1];
	idle.w = 1.5;
	hebb(n, [{ tick: 1, from: 0, to: 1, w: 1, fires: true }]);
	assert.equal(used.w, 1.5);
	assert.ok(idle.w < 1.5 && idle.w > idle.base);
	for (let i = 0; i < 10; i++) hebb(n, [{ tick: 1, from: 0, to: 1, w: 1, fires: true }]);
	assert.equal(used.w, n.o.wMax);
});
