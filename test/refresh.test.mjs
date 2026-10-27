import test from "node:test";
import assert from "node:assert/strict";
import { createDeferredRefresh, once } from "../.test-build/refresh.mjs";

function clock() {
	let t = 0, id = 0;
	const timers = new Map();
	return {
		now: () => t,
		schedule: (fn, ms) => (timers.set(++id, { fn, at: t + ms }), id),
		cancel: (h) => timers.delete(h),
		advance(ms) {
			const end = t + ms;
			for (;;) {
				const next = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
				if (!next) break;
				timers.delete(next[0]);
				t = next[1].at;
				next[1].fn();
			}
			t = end;
		},
	};
}

test("runs at once when idle", () => {
	const c = clock();
	let runs = 0;
	const r = createDeferredRefresh({ isBusy: () => false, run: () => runs++, ...c });
	r.request();
	assert.equal(runs, 1);
	assert.equal(r.pending(), false);
});

test("waits while an animation plays, then runs once it is idle", () => {
	const c = clock();
	let runs = 0, busy = true;
	const r = createDeferredRefresh({ isBusy: () => busy, run: () => runs++, ...c });
	r.request();
	c.advance(2000);
	assert.equal(runs, 0);
	busy = false;
	c.advance(300);
	assert.equal(runs, 1);
});

test("never waits longer than 5 s, even if the animation never ends", () => {
	const c = clock();
	let runs = 0;
	const r = createDeferredRefresh({ isBusy: () => true, run: () => runs++, ...c });
	r.request();
	c.advance(4900);
	assert.equal(runs, 0);
	c.advance(400);
	assert.equal(runs, 1);
});

test("twenty requests while waiting become one run", () => {
	const c = clock();
	let runs = 0, busy = true;
	const r = createDeferredRefresh({ isBusy: () => busy, run: () => runs++, ...c });
	for (let i = 0; i < 20; i++) {
		r.request();
		c.advance(100);
	}
	busy = false;
	c.advance(500);
	assert.equal(runs, 1);
});

test("a request after the run starts a new wait", () => {
	const c = clock();
	let runs = 0;
	const r = createDeferredRefresh({ isBusy: () => false, run: () => runs++, ...c });
	r.request();
	r.request();
	assert.equal(runs, 2);
});

test("cancel drops the pending run", () => {
	const c = clock();
	let runs = 0;
	const r = createDeferredRefresh({ isBusy: () => true, run: () => runs++, ...c });
	r.request();
	r.cancel();
	c.advance(10000);
	assert.equal(runs, 0);
	assert.equal(r.pending(), false);
});

test("once reports a failure only the first time", () => {
	const seen = [];
	const report = once((m) => seen.push(m));
	report("a");
	report("b");
	assert.deepEqual(seen, ["a"]);
});
