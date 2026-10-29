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
