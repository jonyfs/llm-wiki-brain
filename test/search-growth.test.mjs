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

import { logOps, pagesByOp } from "../.test-build/logParser.mjs";
import { countBefore } from "../.test-build/route.mjs";

test("logOps and pagesByOp: the pages an operation touched, matched by name in the entry title", () => {
	const e = parseLog("## [2026-10-01] ingest | Added KV cache notes\n## [2026-10-02] lint | Fixed orphans\n## [2026-10-03] ingest | Attention (multi-head)\n");
	assert.deepEqual(logOps(e), ["ingest", "lint"]);
	const pages = [{ path: "w/kv-cache.md", label: "kv-cache" }, { path: "w/attention.md", label: "Attention" }, { path: "w/orphans.md", label: "orphans" }, { path: "w/ab.md", label: "ab" }];
	assert.deepEqual([...pagesByOp(e, pages, "ingest")].sort(), ["w/attention.md", "w/kv-cache.md"]);
	assert.deepEqual([...pagesByOp(e, pages, "lint")], ["w/orphans.md"]);
	assert.equal(pagesByOp(e, pages, "nothing").size, 0);
});

test("filterPaths with op keeps only the pages that operation touched", () => {
	const ctx2 = { ...ctx, opPaths: new Set(["a"]) };
	assert.deepEqual([...filterPaths(pages, { ...NO_FILTER, op: "ingest" }, ctx2)], ["a"]);
	assert.deepEqual([...filterPaths(pages, { ...NO_FILTER, op: "ingest" }, ctx)], []); // no match data: nothing touched
});

test("countBefore finds where a replay starts", () => {
	assert.equal(countBefore([1, 3, 5, 7], 5), 2);
	assert.equal(countBefore([1, 3, 5, 7], 0), 0);
	assert.equal(countBefore([1, 3, 5, 7], 99), 4);
	assert.equal(countBefore([], 5), 0);
});

import { suggest } from "../.test-build/query.mjs";
import { activeChips, withoutChip } from "../.test-build/chips.mjs";
import { ago } from "../.test-build/time.mjs";
import { toCanvas } from "../.test-build/canvasExport.mjs";

test("regex terms match name, path, headings and tags", () => {
	assert.equal(m("/kv-?cache/"), true);
	assert.equal(m("/^zzz/"), false);
	assert.equal(m("/(unclosed/"), false); // a half-typed pattern is just no match
});

test("edited:today and friends, in four languages", () => {
	for (const w of ["today", "hoje", "hoy", "week", "semana", "month", "mes"]) assert.ok(dateTest(w, NOW), w);
	assert.equal(m("edited:semana"), true); // edited 2 days ago
	assert.equal(m("edited:hoje"), false);
	assert.equal(m("created:>mes"), true); // created 40 days ago
});

test("to: and from: follow the links", () => {
	const p = P({ outs: ["attention", "softmax"], ins: ["index"] });
	assert.equal(m("to:soft", p), true);
	assert.equal(m("to:index", p), false);
	assert.equal(m("from:index", p), true);
	assert.equal(m("-from:index", p), false);
});

test("suggest completes keys and values", () => {
	const vocab = { tags: ["#ai", "#wiki/llm"], folders: ["concepts", "my folder"], types: ["source", "concept"] };
	assert.deepEqual(suggest("ta", vocab), ["tag:"]);
	assert.deepEqual(suggest("x tag:w", vocab), ["x tag:wiki/llm"]);
	assert.deepEqual(suggest("is:o", vocab), ["is:orphan"]);
	assert.deepEqual(suggest("-ty", vocab), ["-type:"]);
	assert.deepEqual(suggest("path:my", vocab), ['path:"my folder"']);
	assert.deepEqual(suggest("", vocab), []);
	assert.deepEqual(suggest("zzz", vocab), []);
});

test("filterPaths: direction, extra query and isolation", () => {
	const inD = { a: 0, b: 3, c: 4 }, outD = { a: 2, b: 0, c: 5 };
	const c2 = { ...ctx, inDeg: (p) => inD[p], outDeg: (p) => outD[p] };
	assert.deepEqual([...filterPaths(pages, { ...NO_FILTER, dir: "sources" }, c2)], ["a"]);
	assert.deepEqual([...filterPaths(pages, { ...NO_FILTER, dir: "sinks" }, c2)], ["b"]);
	assert.deepEqual([...filterPaths(pages, { ...NO_FILTER, dir: "hubs2" }, c2)], ["c"]);
	assert.deepEqual([...filterPaths(pages, NO_FILTER, { ...ctx, extra: new Set(["b", "c"]) })].sort(), ["b", "c"]);
	assert.deepEqual([...filterPaths(pages, NO_FILTER, { ...ctx, isolate: new Set(["c"]) })], ["c"]);
});

test("activeChips lists what is on and withoutChip resets one", () => {
	const f = { folder: "concepts", tag: "", minDeg: 2, maxDeg: 0, orphansOnly: false, days: 7, createdDays: 0, invert: true, op: "", dir: "", hidden: ["source"] };
	const chips = activeChips(f, "wiki/a/kv-cache.md", " tag:x ", 3);
	assert.deepEqual(chips.map((c) => c.key), ["folder", "minDeg", "days", "invert", "hidden", "hood", "extra", "isolate"]);
	assert.equal(chips.find((c) => c.key === "hood").value, "kv-cache");
	assert.equal(chips.find((c) => c.key === "extra").value, "tag:x");
	assert.equal(withoutChip(f, "days").days, 0);
	assert.equal(withoutChip(f, "hidden").hidden.length, 0);
	assert.equal(f.days, 7); // the original is untouched
	assert.deepEqual(activeChips({ ...f, folder: "", minDeg: 0, days: 0, invert: false, hidden: [] }, null, "", 0), []);
});

test("ago picks the unit", () => {
	const n = 1e12;
	assert.deepEqual(ago(n - 5000, n), { key: "time.now", n: 0 });
	assert.deepEqual(ago(n - 5 * 60000, n), { key: "time.minutes", n: 5 });
	assert.deepEqual(ago(n - 3 * 3600000, n), { key: "time.hours", n: 3 });
	assert.deepEqual(ago(n - 10 * 86400000, n), { key: "time.days", n: 10 });
	assert.deepEqual(ago(n - 100 * 86400000, n), { key: "time.months", n: 3 });
	assert.deepEqual(ago(n - 800 * 86400000, n), { key: "time.years", n: 2 });
	assert.equal(ago(n + 5000, n).key, "time.now"); // clock skew
});

test("toCanvas lays notes out and keeps only links between them", () => {
	const c = toCanvas([{ path: "a.md", x: 10, y: -5 }, { path: "b.md", x: 0, y: 0 }], [["a.md", "b.md"], ["a.md", "zzz.md"]]);
	assert.equal(c.nodes.length, 2);
	assert.deepEqual([c.nodes[0].x, c.nodes[0].y], [22, -11]);
	assert.equal(c.edges.length, 1);
	assert.deepEqual([c.edges[0].fromNode, c.edges[0].toNode], ["n0", "n1"]);
});

import { convexHull, neighbourInDirection } from "../.test-build/hull.mjs";

test("convexHull drops interior and collinear points", () => {
	const h = convexHull([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2], [2, 0], [1, 3]]);
	assert.equal(h.length, 4);
	assert.deepEqual(h.map((p) => p.join(",")).sort(), ["0,0", "0,4", "4,0", "4,4"]);
	assert.equal(convexHull([[1, 1]]).length, 1);
	assert.equal(convexHull([]).length, 0);
});

test("neighbourInDirection picks the best aligned page, or none", () => {
	const c = [{ id: 1, x: 10, y: 0 }, { id: 2, x: 0, y: 10 }, { id: 3, x: 9, y: 5 }];
	assert.equal(neighbourInDirection([0, 0], c, 1, 0), 1);
	assert.equal(neighbourInDirection([0, 0], c, 0, 1), 2);
	assert.equal(neighbourInDirection([0, 0], c, -1, 0), null);
	assert.equal(neighbourInDirection([0, 0], [], 1, 0), null);
});

import { colorCats, sizeFactors } from "../.test-build/cats.mjs";

const CP = (path, folder, tags, mtime, deg) => ({ path, folder, tags, mtime, deg });
const CATP = [CP("a", "x", ["#t"], 100, 9), CP("b", "x", [], 90, 5), CP("c", "y", ["#t"], 80, 2), CP("d", "z", [], 70, 0), CP("e", "w", [], 60, 0)];

test("colorCats by folder uses the three biggest folders and 'other'", () => {
	const r = colorCats("folder", CATP);
	assert.deepEqual(r.labels.slice(0, 1), ["x"]);
	assert.equal(r.labels[3], "@legend.other");
	assert.equal(r.cat.get("a"), 0);
	assert.equal(r.cat.get("b"), 0);
	assert.ok([0, 1, 2, 3].includes(r.cat.get("e")));
	assert.equal(colorCats("type", CATP), null);
});

test("colorCats by tag, age and degree fall into 0..3", () => {
	assert.equal(colorCats("tag", CATP).cat.get("a"), 0);
	assert.equal(colorCats("tag", CATP).cat.get("b"), 3);
	const age = colorCats("age", CATP).cat;
	assert.equal(age.get("a"), 0);
	assert.equal(age.get("e"), 3);
	const deg = colorCats("degree", CATP).cat;
	assert.deepEqual(["a", "b", "c", "d"].map((p) => deg.get(p)), [0, 1, 2, 3]);
});

test("sizeFactors: bigger for busier or fresher pages, within bounds", () => {
	const by = sizeFactors("degree", CATP, 1000);
	assert.ok(by.get("a") > by.get("c") && by.get("c") > by.get("d"));
	assert.ok([...by.values()].every((v) => v >= 0.8 && v <= 1.9 + 1e-9));
	const day = 86400000, fresh = sizeFactors("recent", [CP("n", "", [], 1e12, 0), CP("o", "", [], 1e12 - 365 * day, 0)], 1e12);
	assert.ok(fresh.get("n") > 1.8 && fresh.get("o") < 0.85);
	assert.equal(sizeFactors("same", CATP, 0), null);
	assert.equal(sizeFactors("degree", [], 0), null);
});

import { bfsLevels, hopMs } from "../.test-build/wave.mjs";

test("bfsLevels follows the links forward first, hop by hop", () => {
	// 0 -> 1, 0 -> 2, 1 -> 3, 3 -> 4 ; 5 only links to 4 ; 6 is alone
	const out = [[1, 2], [3], [], [4], [], [4], []];
	const any = [[1, 2], [0, 3], [0], [1, 4], [3, 5], [4], []];
	const w = bfsLevels(out, any, 0, () => true);
	assert.deepEqual(w.levels.slice(0, 4), [[0], [1, 2], [3], [4]]);
	assert.deepEqual([w.level[3], w.level[4]], [2, 3]);
	assert.equal(w.parent[3], 1);
	assert.equal(w.weak[3], 0);
	// 5 is only reached backwards, through 4
	assert.equal(w.level[5], 4);
	assert.equal(w.weak[5], 1);
	assert.equal(w.parent[5], 4);
	// 6 has no link at all
	assert.equal(w.level[6], -1);
	assert.equal(w.levels.flat().includes(6), false);
});

test("bfsLevels skips hidden pages and survives bad input", () => {
	const out = [[1], [2], []], any = [[1], [0, 2], [1]];
	const w = bfsLevels(out, any, 0, (i) => i !== 1);
	assert.deepEqual(w.levels, [[0]]);
	assert.equal(w.level[2], -1); // the only road went through the hidden page
	assert.deepEqual(bfsLevels([], [], 0, () => true).levels, []);
	assert.deepEqual(bfsLevels(out, any, 9, () => true).levels, []);
});

test("hopMs keeps the wave to a few seconds and scales with speed", () => {
	assert.ok(hopMs(2, 1) <= 900 && hopMs(40, 1) >= 320);
	for (const h of [3, 6, 12]) assert.ok(hopMs(h, 1) * h <= 5300 + 1e-6 || hopMs(h, 1) === 320);
	assert.ok(hopMs(6, 2) < hopMs(6, 1));
	assert.ok(Number.isFinite(hopMs(0, 0)));
});

test("bfsLevels spreads through the network when the index links to everything", () => {
	// the index (0) links to every page; 1 -> 3 -> 4, and 2 stands alone
	const out = [[1, 2, 3, 4], [3], [], [4], []];
	const any = [[1, 2, 3, 4], [0, 3], [0], [0, 1, 4], [0, 3]];
	const w = bfsLevels(out, any, 0, () => true);
	assert.deepEqual(w.levels, [[0], [1, 2], [3], [4]]); // not one flat hop
	assert.equal(w.parent[3], 1);
	assert.equal(w.parent[4], 3);
	const flat = bfsLevels(out, any, 0, () => true, false);
	assert.deepEqual(flat.levels, [[0], [1, 2, 3, 4]]);
});

test("bfsLevels falls back to the index's own links for pages the network cannot reach", () => {
	// 1 and 2 only link to each other, and the index links to both: no entry point, so both are one hop from the index
	const out = [[1, 2], [2], [1]];
	const any = [[1, 2], [0, 2], [0, 1]];
	const w = bfsLevels(out, any, 0, () => true);
	assert.deepEqual(w.levels, [[0], [1, 2]]);
	// every reachable page ends up with a level
	assert.ok([...w.level].every((l) => l >= 0));
});
