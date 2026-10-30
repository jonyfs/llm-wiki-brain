import test from "node:test";
import assert from "node:assert/strict";
import { ago } from "../.test-build/time.mjs";

test("ago returns now for same time", () => {
  const r = ago(1000, 1000);
  assert.equal(r.key, "time.now");
});

test("ago returns minutes", () => {
  const r = ago(1000, 1000 + 5 * 60 * 1000);
  assert.equal(r.key, "time.minutes");
  assert.equal(r.n, 5);
});

test("ago returns hours", () => {
  const r = ago(1000, 1000 + 3 * 60 * 60 * 1000);
  assert.equal(r.key, "time.hours");
  assert.equal(r.n, 3);
});

test("ago returns days", () => {
  const r = ago(1000, 1000 + 7 * 24 * 60 * 60 * 1000);
  assert.equal(r.key, "time.days");
  assert.equal(r.n, 7);
});