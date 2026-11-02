import test from "node:test";
import assert from "node:assert/strict";
import { createIdleTimer } from "../.test-build/idle.mjs";

// A scheduler driven by hand: time only moves when the test says so.
function fake() {
	let now = 0, next = 1;
	const jobs = new Map();
	return {
		set(fn, ms) { const id = next++; jobs.set(id, { at: now + ms, fn }); return id; },
		clear(id) { jobs.delete(id); },
		advance(ms) {
			now += ms;
			for (const [id, j] of [...jobs]) if (j.at <= now) { jobs.delete(id); j.fn(); }
		},
	};
}

test("fires once, 10 s after the last poke", () => {
	const s = fake();
	let calls = 0;
	const t = createIdleTimer(10000, () => calls++, s);
	t.poke();
	s.advance(9999);
	assert.equal(calls, 0);
	s.advance(1);
	assert.equal(calls, 1);
	s.advance(60000);
	assert.equal(calls, 1, "does not repeat until poked again");
});

test("each poke restarts the countdown", () => {
	const s = fake();
	let calls = 0;
	const t = createIdleTimer(10000, () => calls++, s);
	t.poke();
	s.advance(8000);
	t.poke();
	s.advance(8000);
	assert.equal(calls, 0, "still active 16 s after the first poke");
	s.advance(2000);
	assert.equal(calls, 1);
});

test("stop cancels the pending call and the timer can be reused", () => {
	const s = fake();
	let calls = 0;
	const t = createIdleTimer(10000, () => calls++, s);
	t.poke();
	t.stop();
	s.advance(20000);
	assert.equal(calls, 0);
	t.poke();
	s.advance(10000);
	assert.equal(calls, 1);
});
