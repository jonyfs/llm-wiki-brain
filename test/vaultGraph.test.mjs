import test from "node:test";
import assert from "node:assert/strict";
import { buildVaultGraph, matchQuery, pageType, DEFAULT_SETTINGS } from "../.test-build/vaultGraph.mjs";

const DAY = 86400000, T0 = Date.UTC(2026, 9, 1);

/** A minimal stand-in for Obsidian's App: files, links, and per-file cache. */
function fakeApp(spec) {
	const files = spec.files.map((f) => ({
		path: f.path,
		basename: f.path.split("/").pop().replace(/\.md$/, ""),
		stat: { ctime: f.ctime ?? T0, mtime: f.mtime ?? T0 },
		parent: { path: f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : "" },
	}));
	const byPath = new Map(files.map((f) => [f.path, f]));
	return {
		vault: { getMarkdownFiles: () => files },
		metadataCache: {
			resolvedLinks: Object.fromEntries(spec.files.map((f) => [f.path, Object.fromEntries((f.links ?? []).map((t) => [t, 1]))])),
			unresolvedLinks: Object.fromEntries(spec.files.filter((f) => f.broken).map((f) => [f.path, { missing: 1 }])),
			getFileCache: (file) => spec.files.find((f) => f.path === file.path)?.cache ?? null,
		},
		_byPath: byPath,
	};
}

const S = { ...DEFAULT_SETTINGS };

test("an empty vault gives an empty graph", () => {
	const g = buildVaultGraph(fakeApp({ files: [] }), S);
	assert.deepEqual([g.pages.length, g.links.length, g.orphans.length], [0, 0, 0]);
});

test("only pages inside the wiki folder count", () => {
	const g = buildVaultGraph(fakeApp({ files: [{ path: "wiki/a.md" }, { path: "notes/b.md" }] }), S);
	assert.deepEqual(g.pages.map((p) => p.path), ["wiki/a.md"]);
});

test("links stay inside scope; orphans and broken links are found", () => {
	const g = buildVaultGraph(fakeApp({ files: [
		{ path: "wiki/index.md", links: ["wiki/a.md"] },
		{ path: "wiki/a.md", links: ["notes/out.md"] },
		{ path: "wiki/lonely.md" },
		{ path: "wiki/broken.md", broken: true },
	] }), S);
	assert.deepEqual(g.links, [["wiki/index.md", "wiki/a.md"]]);
	assert.deepEqual(g.orphans.sort(), ["wiki/broken.md", "wiki/lonely.md"]);
	assert.deepEqual(g.broken, ["wiki/broken.md"]);
});

test("index and log are special: flagged, and never reported as orphans", () => {
	const g = buildVaultGraph(fakeApp({ files: [{ path: "wiki/index.md" }, { path: "wiki/log.md" }, { path: "wiki/x.md" }] }), S);
	assert.equal(g.pages.find((p) => p.path === "wiki/index.md").isIndex, true);
	assert.equal(g.pages.find((p) => p.path === "wiki/log.md").isLog, true);
	assert.deepEqual(g.orphans, ["wiki/x.md"]);
});

test("type: frontmatter wins, then the wiki/<type> folder", () => {
	const app = fakeApp({ files: [
		{ path: "wiki/misc/a.md", cache: { frontmatter: { type: "Entity" } } },
		{ path: "wiki/concepts/b.md" },
		{ path: "wiki/sources/c.md" },
	] });
	const t = (p) => pageType(app, app._byPath.get(p));
	assert.equal(t("wiki/misc/a.md"), "entity");
	assert.equal(t("wiki/concepts/b.md"), "concept");
	assert.equal(t("wiki/sources/c.md"), "source");
});

test("a file with no frontmatter or tags still builds", () => {
	const g = buildVaultGraph(fakeApp({ files: [{ path: "wiki/a.md" }] }), S);
	assert.deepEqual(g.meta.get("wiki/a.md").tags, []);
	assert.equal(g.untyped.length, 1);
});

test("tags come from the body and from frontmatter, normalised", () => {
	const g = buildVaultGraph(fakeApp({ files: [{ path: "wiki/a.md", cache: { tags: [{ tag: "#Alpha" }], frontmatter: { tags: ["beta", "#Alpha"] } } }] }), S);
	assert.deepEqual(g.meta.get("wiki/a.md").tags.sort(), ["#alpha", "#beta"]);
});

test("more pages than the cap keeps the index and the most connected", () => {
	const files = [{ path: "wiki/index.md" }];
	for (let i = 0; i < 900; i++) files.push({ path: `wiki/p${i}.md`, links: i < 10 ? ["wiki/p500.md"] : [] });
	const g = buildVaultGraph(fakeApp({ files }), { ...S, maxNodes: 100 });
	assert.equal(g.pages.length, 100);
	assert.ok(g.pages.some((p) => p.path === "wiki/index.md"));
	assert.ok(g.pages.some((p) => p.path === "wiki/p500.md"));
});

test("collapsed file dates are replaced by the log's dates", () => {
	const files = Array.from({ length: 8 }, (_, i) => ({ path: `wiki/page-${i}.md`, ctime: T0, mtime: T0 }));
	const log = "## [2026-03-01] ingest | page-3 added\n## [2026-04-01] ingest | page-5 added\n";
	const g = buildVaultGraph(fakeApp({ files }), S, log);
	const c = (p) => g.pages.find((x) => x.path === p).ctime;
	assert.equal(c("wiki/page-3.md"), Date.UTC(2026, 2, 1));
	assert.equal(c("wiki/page-5.md"), Date.UTC(2026, 3, 1));
	assert.ok(c("wiki/page-5.md") > c("wiki/page-3.md"));
});

test("healthy file dates are left alone even when a log is given", () => {
	const files = Array.from({ length: 8 }, (_, i) => ({ path: `wiki/page-${i}.md`, ctime: T0 + i * DAY }));
	const g = buildVaultGraph(fakeApp({ files }), S, "## [2026-03-01] ingest | page-3 added\n");
	assert.equal(g.pages.find((x) => x.path === "wiki/page-3.md").ctime, T0 + 3 * DAY);
});

test("matchQuery needs every word to match name, heading or tag", () => {
	const g = buildVaultGraph(fakeApp({ files: [{ path: "wiki/concepts/compounding.md", cache: { headings: [{ heading: "Ingest loop" }] } }, { path: "wiki/x.md" }] }), S);
	assert.deepEqual([...matchQuery(g, "compounding ingest")], ["wiki/concepts/compounding.md"]);
	assert.equal(matchQuery(g, "").size, 0);
});
