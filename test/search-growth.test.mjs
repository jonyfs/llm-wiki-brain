import test from "node:test";
import assert from "node:assert/strict";
import { parseQuery, matchesQuery, numberTest, dateTest, fuzzyScore, toWikiLinks } from "../.test-build/query.mjs";
import { filterPaths, NO_FILTER } from "../.test-build/filters.mjs";
import { logOn, parseLog } from "../.test-build/logParser.mjs";
import { creationOrder } from "../.test-build/route.mjs";
import { frontmatterProps } from "../.test-build/vaultGraph.mjs";

const DAY = 86400000, NOW = Date.UTC(2026, 9, 27, 12);
const P = (o) => ({ path: "wiki/concepts/kv-cache.md", label: "kv-cache", tags: ["#ai", "#wiki/llm"], type: "concept", text: "wiki/concepts/kv-cache.md decoding #ai", headings: "decoding memory", degree: 5, ctime: NOW - 40 * DAY, mtime: NOW - 2 * DAY, props: { status: "draft", author: "ana,bia" }, flags: ["hub"], ...o });
const m = (q, p = P()) => matchesQuery(parseQuery(q), p, NOW);

test("or: either side may match, each side is an AND", () => {
	assert.equal(m("nothing or decoding"), true);
	assert.equal(m("nothing or absent"), false);
	assert.equal(m("kv decoding or zzz"), true);
	assert.equal(m("kv zzz or yyy"), false);
	assert.equal(parseQuery("or or a").length, 1); // stray `or` is ignored
});

test("links: compares the number of links", () => {
	assert.equal(m("links:>3"), true);
	assert.equal(m("links:>5"), false);
	assert.equal(m("links:>=5"), true);
	assert.equal(m("links:5"), true);
	assert.equal(m("links:<2"), false);
	assert.equal(m("-links:0"), true);
	assert.equal(numberTest("abc"), null);
	assert.equal(m("links:abc"), false);
});

test("created: and edited: take an age or a date", () => {
	assert.equal(m("edited:<7d"), true); // edited 2 days ago
	assert.equal(m("edited:>7d"), false);
	assert.equal(m("created:>30d"), true); // created 40 days ago
	assert.equal(m("created:<30d"), false);
	assert.equal(m("created:<2w"), false);
	assert.equal(m("created:>2026-01-01"), true);
	assert.equal(m("created:<2026-01-01"), false);
	assert.equal(m("edited:2026-10-25"), true); // that very day
	assert.equal(dateTest("soon", NOW), null);
	assert.equal(m("edited:<7d", P({ mtime: undefined })), false);
});

test("prop: equals, contains, exists", () => {
	assert.equal(m("prop:status=draft"), true);
	assert.equal(m("prop:status=final"), false);
	assert.equal(m("prop:author~ana"), true);
	assert.equal(m("prop:author=ana"), false);
	assert.equal(m("prop:status"), true);
	assert.equal(m("prop:owner"), false);
	assert.equal(m("-prop:owner"), true);
});

test("is: flags and heading:", () => {
	assert.equal(m("is:hub"), true);
	assert.equal(m("is:orphan"), false);
	assert.equal(m("-is:orphan is:hub"), true);
	assert.equal(m("heading:memory"), true);
	assert.equal(m("heading:nothing"), false);
});

test("nested tags: #wiki matches #wiki/llm but not #wikipedia", () => {
	assert.equal(m("tag:wiki"), true);
	assert.equal(m("tag:#wiki/llm"), true);
	assert.equal(m("tag:wik"), false);
});

test("a key with no value yet does not break the query", () => {
	assert.equal(m("tag: decoding"), true);
});

test("fuzzyScore: subsequence, tighter is better", () => {
	assert.equal(fuzzyScore("kvcch", "kv-cache") > 0.5, true);
	assert.equal(fuzzyScore("xyz", "kv-cache"), 0);
	assert.equal(fuzzyScore("cache", "kv-cache") > fuzzyScore("kvce", "kv-cache") - 0.01, true);
	assert.equal(fuzzyScore("", "abc"), 0);
});

test("toWikiLinks drops .md and keeps the folder", () => {
	assert.equal(toWikiLinks(["wiki/a.md", "wiki/b/c.md"]), "[[wiki/a]]\n[[wiki/b/c]]");
	assert.equal(toWikiLinks([]), "");
});

const pages = [
	{ path: "a", mtime: NOW - 1 * DAY, ctime: NOW - 3 * DAY, folder: "", tags: [] },
	{ path: "b", mtime: NOW - 50 * DAY, ctime: NOW - 90 * DAY, folder: "", tags: [] },
	{ path: "c", mtime: NOW - 2 * DAY, ctime: NOW - 400 * DAY, folder: "", tags: [] },
];
const deg = { a: 1, b: 9, c: 4 };
const ctx = { degree: (p) => deg[p], orphans: new Set(), neighbourhood: null, now: NOW };
const keep = (f) => [...(filterPaths(pages, { ...NO_FILTER, ...f }, ctx) ?? [])].sort();

test("maxDeg keeps pages with at most N links", () => {
	assert.deepEqual(keep({ maxDeg: 4 }), ["a", "c"]);
	assert.deepEqual(keep({ minDeg: 2, maxDeg: 5 }), ["c"]);
});

test("createdDays keeps pages created in the last N days", () => {
	assert.deepEqual(keep({ createdDays: 7 }), ["a"]);
	assert.deepEqual(keep({ createdDays: 365 }), ["a", "b"]);
});

test("invert shows what the filters would hide", () => {
	assert.deepEqual(keep({ days: 7 }), ["a", "c"]);
	assert.deepEqual(keep({ days: 7, invert: true }), ["b"]);
	assert.equal(filterPaths(pages, { ...NO_FILTER, invert: true }, ctx), null); // nothing active, nothing to invert
});

const LOG = "## [2026-10-01] ingest | A\n## [2026-10-01] query | B\n## [2026-10-02] lint | C\n";

test("logOn returns the entries of that UTC day", () => {
	const e = parseLog(LOG);
	assert.deepEqual(logOn(e, Date.UTC(2026, 9, 1, 15)).map((x) => x.op), ["ingest", "query"]);
	assert.deepEqual(logOn(e, Date.UTC(2026, 9, 3)), []);
});

test("creationOrder by mtime orders by the last edit", () => {
	const cells = [
		{ id: 1, ctime: 1, mtime: 30, isIndex: false, off: false },
		{ id: 2, ctime: 2, mtime: 10, isIndex: false, off: false },
		{ id: 3, ctime: 3, isIndex: false, off: false }, // no mtime: falls back to ctime
		{ id: 0, ctime: 0, mtime: 0, isIndex: true, off: false },
	];
	assert.deepEqual(creationOrder(cells, 0, "ctime"), [1, 2, 3]);
	assert.deepEqual(creationOrder(cells, 0, "mtime"), [3, 2, 1]);
});

test("frontmatterProps flattens lists, lowercases keys, drops objects", () => {
	const p = frontmatterProps({ Status: "Draft", tags: ["a", "b"], n: 3, nested: { x: 1 }, position: {}, empty: null });
	assert.deepEqual(p, { status: "Draft", tags: "a,b", n: "3" });
	assert.deepEqual(frontmatterProps(undefined), {});
});
