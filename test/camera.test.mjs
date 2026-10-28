import test from "node:test";
import assert from "node:assert/strict";
import { perspective } from "../.test-build/camera.mjs";

test("1 at the origin, smaller far away, larger close up", () => {
	assert.equal(perspective(0, 820), 1);
	assert.ok(perspective(400, 820) < 1);
	assert.ok(perspective(-400, 820) > 1);
});

test("never negative, even far behind the camera", () => {
	for (const z of [-820, -821, -1000, -5000, -1e9]) assert.ok(perspective(z, 820) >= 0, String(z));
});

test("close to the camera plane the scale is capped, behind it the cell vanishes", () => {
	assert.ok(perspective(-700, 820) <= 4);
	assert.equal(perspective(-620, 820), 0);
	assert.equal(perspective(-2000, 820), 0);
});

test("grows smoothly up to the cap", () => {
	let last = 0;
	for (let z = 600; z > -600; z -= 50) {
		const p = perspective(z, 820);
		assert.ok(p >= last, `z=${z}`);
		last = p;
	}
});
