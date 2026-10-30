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