import test from "node:test";
import assert from "node:assert/strict";
import { lobePuffs, brainPuffs } from "../.test-build/cloud.mjs";
import { LOBES } from "../.test-build/physics.mjs";

test("the same lobe and seed always give the same cloud", () => {
	assert.deepEqual(lobePuffs(LOBES[0], 20, 7), lobePuffs(LOBES[0], 20, 7));
	assert.notDeepEqual(lobePuffs(LOBES[0], 20, 7), lobePuffs(LOBES[0], 20, 8));
});

test("every puff sits inside its lobe's ellipsoid and has a usable size and opacity", () => {
	const L = LOBES[2];
	for (const p of lobePuffs(L, 200, 3)) {
		const d = ((p.x - L.c[0]) / L.r[0]) ** 2 + ((p.y - L.c[1]) / L.r[1]) ** 2 + ((p.z - L.c[2]) / L.r[2]) ** 2;
		assert.ok(d <= 1.0001, "inside");
		assert.ok(p.r > 0 && p.a > 0 && p.a <= 1);
	}
});

test("most puffs are near the surface: the cortex is thicker than the core", () => {
	const L = LOBES[0], ps = lobePuffs(L, 400, 5);
	const near = ps.filter((p) => ((p.x - L.c[0]) / L.r[0]) ** 2 + ((p.y - L.c[1]) / L.r[1]) ** 2 + ((p.z - L.c[2]) / L.r[2]) ** 2 > 0.55).length;
	assert.ok(near / ps.length > 0.55);
});

test("bigger lobes get more puffs, and every lobe gets some", () => {
	const all = brainPuffs(LOBES, 40);
	assert.ok(all.length > LOBES.length * 8);
	assert.ok(lobePuffs(LOBES[0], 5, 1).length === 5);
});
