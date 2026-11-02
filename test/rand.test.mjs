import test from "node:test";
import assert from "node:assert/strict";
import { hashStr, makeDrift, rng } from "../.test-build/rand.mjs";

test("rng is deterministic and stays in [0, 1)", () => {
	const a = rng(42), b = rng(42);
	for (let i = 0; i < 200; i++) { const x = a(); assert.equal(x, b()); assert.ok(x >= 0 && x < 1); }
});

test("makeDrift: 1.5 to 3 world units, 12 to 25 s per axis, different per page, stable per path", () => {
	const d = makeDrift("wiki/a.md");
	assert.ok(d[0] >= 1.5 && d[0] <= 3);
	for (const w of [d[1], d[2], d[3]]) { const period = (2 * Math.PI) / w; assert.ok(period >= 12000 && period <= 25000, String(period)); }
	assert.deepEqual([...makeDrift("wiki/a.md")], [...d]);
	assert.notDeepEqual([...makeDrift("wiki/b.md")], [...d]);
});

test("drift never leaves its amplitude: every axis stays inside the box", () => {
	const d = makeDrift("wiki/x.md");
	for (let t = 0; t < 60000; t += 250) for (const [w, ph] of [[d[1], d[4]], [d[2], d[5]], [d[3], d[6]]]) assert.ok(Math.abs(d[0] * Math.sin(w * t + ph)) <= d[0] + 1e-9);
});

test("hashStr is stable and differs for different paths", () => {
	assert.equal(hashStr("a"), hashStr("a"));
	assert.notEqual(hashStr("a"), hashStr("b"));
});
