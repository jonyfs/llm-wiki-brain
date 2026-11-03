import test from "node:test";
import assert from "node:assert/strict";
import { filterPaths, neighbourhoodOf, NO_FILTER, applyPreset } from "../.test-build/filters.mjs";

const DAY = 86400000, NOW = 1_800_000_000_000;
const pages = [
	{ path: "wiki/a.md", mtime: NOW - 1 * DAY, folder: "concepts", tags: ["#x"] },
	{ path: "wiki/b.md", mtime: NOW - 40 * DAY, folder: "concepts", tags: [] },
	{ path: "wiki/c.md", mtime: NOW - 2 * DAY, folder: "sources", tags: ["#x", "#y"] },
	{ path: "wiki/d.md", mtime: NOW - 400 * DAY, folder: "", tags: [] },
];
const ctx = (over = {}) => ({ degree: (p) => ({ "wiki/a.md": 3, "wiki/b.md": 0, "wiki/c.md": 1, "wiki/d.md": 0 })[p], orphans: new Set(["wiki/b.md", "wiki/d.md"]), neighbourhood: null, now: NOW, ...over });
const keep = (f, o) => [...(filterPaths(pages, { ...NO_FILTER, ...f }, ctx(o)) ?? [])].sort();

test("no filter means show everything (null)", () => {
	assert.equal(filterPaths(pages, NO_FILTER, ctx()), null);
});

test("each filter on its own", () => {
	assert.deepEqual(keep({ folder: "concepts" }), ["wiki/a.md", "wiki/b.md"]);
	assert.deepEqual(keep({ tag: "#x" }), ["wiki/a.md", "wiki/c.md"]);
	assert.deepEqual(keep({ minDeg: 2 }), ["wiki/a.md"]);
	assert.deepEqual(keep({ orphansOnly: true }), ["wiki/b.md", "wiki/d.md"]);
	assert.deepEqual(keep({ days: 7 }), ["wiki/a.md", "wiki/c.md"]);
});

test("filters combine with AND", () => {
	assert.deepEqual(keep({ folder: "concepts", tag: "#x" }), ["wiki/a.md"]);
	assert.deepEqual(keep({ tag: "#x", minDeg: 2, days: 7 }), ["wiki/a.md"]);
});

test("a filter that matches nothing returns an empty set, not null", () => {
	const r = filterPaths(pages, { ...NO_FILTER, folder: "nope" }, ctx());
	assert.ok(r instanceof Set);
	assert.equal(r.size, 0);
});

test("the neighbourhood limits the set before the other filters", () => {
	assert.deepEqual(keep({ folder: "concepts" }, { neighbourhood: new Set(["wiki/a.md", "wiki/c.md"]) }), ["wiki/a.md"]);
});

test("neighbourhoodOf walks depth links in both directions", () => {
	const links = [["a", "b"], ["b", "c"], ["c", "d"]];
	assert.deepEqual([...neighbourhoodOf(links, "b", 1)].sort(), ["a", "b", "c"]);
	assert.deepEqual([...neighbourhoodOf(links, "b", 2)].sort(), ["a", "b", "c", "d"]);
	assert.deepEqual([...neighbourhoodOf(links, "z", 3)], ["z"]);
});

test("applyPreset replaces the filter set with a focused combo", () => {
	const base = { ...NO_FILTER, folder: "concepts", minDeg: 2 };
	assert.deepEqual(applyPreset(base, "orphans"), { ...NO_FILTER, orphansOnly: true });
	assert.deepEqual(applyPreset(base, "hubs"), { ...NO_FILTER, minDeg: 4 });
	assert.deepEqual(applyPreset(base, "recent"), { ...NO_FILTER, days: 30 });
	assert.deepEqual(applyPreset(base, "new"), { ...NO_FILTER, createdDays: 30 });
	assert.deepEqual(applyPreset(base, "sinks"), { ...NO_FILTER, dir: "sinks" });
	assert.deepEqual(applyPreset(base, "sources"), { ...NO_FILTER, dir: "sources" });
});

test("applyPreset toggles invert while keeping the rest", () => {
	const base = { ...NO_FILTER, folder: "concepts", invert: false };
	assert.deepEqual(applyPreset(base, "invert"), { ...NO_FILTER, folder: "concepts", invert: true });
	assert.deepEqual(applyPreset({ ...base, invert: true }, "invert"), { ...NO_FILTER, folder: "concepts", invert: false });
});

import { ageChoice, dateDaysAgo, daysSince } from "../.test-build/filters.mjs";

const T0 = Date.UTC(2026, 10, 2, 12);

test("filters combine with AND, and invert flips the whole result (the documented precedence)", () => {
	const mk = (path, folder, tags = [], mtime = T0) => ({ path, folder, tags, mtime, ctime: mtime });
	const pages = [mk("a", "wiki", ["ai"]), mk("b", "wiki", []), mk("c", "raw", ["ai"]), mk("d", "wiki", ["ai"])];
	const ctx = (extra = null) => ({ degree: () => 2, orphans: new Set(["d"]), neighbourhood: null, extra, now: T0 });
	const run = (f, c) => [...filterPaths(pages, { ...NO_FILTER, ...f }, c)].sort().join("");
	assert.equal(run({ folder: "wiki", tag: "ai" }, ctx()), "ad", "folder AND tag");
	assert.equal(run({ folder: "wiki", tag: "ai", orphansOnly: true }, ctx()), "d", "orphans only is one more condition in the AND");
	assert.equal(run({ folder: "wiki", tag: "ai" }, ctx(new Set(["a", "b"]))), "a", "a search kept by 'hide non-matches' is one more condition too");
	assert.equal(run({ folder: "wiki", tag: "ai", invert: true }, ctx()), "bc", "invert shows what the AND would hide");
	assert.equal(run({ folder: "wiki", tag: "ai", invert: true }, ctx(new Set(["a", "b"]))), "bcd", "invert flips the search condition as well: everything but the one page that passed all of them");
	assert.equal(filterPaths(pages, { ...NO_FILTER, invert: true }, ctx()), null, "with nothing to filter, invert changes nothing");
});

test("daysSince and dateDaysAgo are inverses for past dates; empty, invalid and future give no filter", () => {
	assert.equal(daysSince("", T0), 0);
	assert.equal(daysSince("not a date", T0), 0);
	assert.equal(daysSince("2027-01-01", T0), 0, "a future date filters nothing");
	assert.equal(daysSince("2026-10-25", T0), 9);
	assert.equal(dateDaysAgo(9, T0), "2026-10-24");
	assert.ok(daysSince(dateDaysAgo(40, T0), T0) >= 40);
});

test("ageChoice names a preset or custom", () => {
	assert.equal(ageChoice(0, [7, 30, 365]), "0");
	assert.equal(ageChoice(30, [7, 30, 365]), "30");
	assert.equal(ageChoice(12, [7, 30, 365]), "custom");
});
