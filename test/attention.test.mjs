import test from "node:test";
import assert from "node:assert/strict";
import { tokens, similarity, attend } from "../.test-build/attention.mjs";
import { Net, cascade, conduction, hebb, isInhibitoryKey, myelinOf, synapsesOf } from "../.test-build/synapse.mjs";
import { buildVaultGraph, DEFAULT_SETTINGS } from "../.test-build/vaultGraph.mjs";

test("tokens drops short words and stop words, keeps accents and tags", () => {
	const t = tokens("The KV-cache for #LLM e atenção");
	assert.ok(t.has("cache") && t.has("#llm") && t.has("atenção"));
	assert.ok(!t.has("the") && !t.has("for") && !t.has("kv"));
});

test("similarity is cosine over bags of words", () => {
	assert.equal(similarity(new Set(["a1x", "b2x"]), new Set(["a1x", "b2x"])), 1);
	assert.equal(similarity(new Set(["abc"]), new Set(["xyz"])), 0);
	assert.equal(similarity(new Set(), new Set(["abc"])), 0);
});

const docs = [
	{ id: 0, text: "transformer attention heads softmax" },
	{ id: 1, text: "attention softmax scaling" },
	{ id: 2, text: "attention heads" },
	{ id: 3, text: "banana bread recipe" },
	{ id: 4, text: "transformer attention heads softmax duplicate" },
];

test("attend: top matches, softmax sums to 1, best first, excludes linked and itself", () => {
	const r = attend(0, docs, new Set([4]));
	assert.deepEqual(r.map((x) => x.id), [2, 1]); // 3 shares nothing, 4 is linked
	assert.ok(Math.abs(r.reduce((s, x) => s + x.w, 0) - 1) < 1e-9);
	assert.ok(r[0].w > r[1].w);
	assert.deepEqual(attend(99, docs, new Set()), []);
	assert.equal(attend(0, docs, new Set(), 1).length, 1);
});

test("a lower temperature sharpens the weights", () => {
	const soft = attend(0, docs, new Set(), 3, 1)[0].w, sharp = attend(0, docs, new Set(), 3, 0.05)[0].w;
	assert.ok(sharp > soft);
});

test("inhibitory keys, in four languages", () => {
	for (const k of ["contradicts", "Contradiz", "contradice", "contredit"]) assert.equal(isInhibitoryKey(k), true);
	assert.equal(isInhibitoryKey("related"), false);
});

test("synapsesOf: an inhibitory link is negative and wins over a plain mention", () => {
	const s = synapsesOf([[0, 1, 1], [0, 1, 1, true], [0, 2, 2]]);
	assert.ok(s.find((x) => x.to === 1).w < 0);
	assert.ok(s.find((x) => x.to === 2).w > 0);
	const r = synapsesOf([[0, 1, 1, true], [0, 1, 3]]);
	assert.ok(r[0].w < 0);
});

test("hebb makes an inhibitory synapse more inhibitory, within the cap", () => {
	const n = new Net(2, synapsesOf([[0, 1, 1, true]]), { hebb: 0.5 });
	hebb(n, [{ tick: 1, from: 0, to: 1, w: -1, fires: true }]);
	assert.ok(n.out[0][0].w < -1);
	for (let i = 0; i < 9; i++) hebb(n, [{ tick: 1, from: 0, to: 1, w: -1, fires: true }]);
	assert.equal(n.out[0][0].w, -n.o.wMax);
});

test("myelin grows with hub-to-hub traffic and conduction is saltatory", () => {
	const links = [];
	for (let i = 1; i <= 8; i++) links.push([i, 0], [9, i], [0, 10 + i]);
	links.push([9, 0]);
	const n = new Net(20, synapsesOf(links));
	const hub = n.out[9].find((x) => x.to === 0), leaf = n.out[1][0];
	assert.ok(myelinOf(n, hub) > myelinOf(n, leaf));
	assert.equal(conduction(0, 0.3), 1);
	assert.ok(conduction(1, 0.05) > 1); // a fast stretch
	assert.ok(conduction(1, 0.15) < 1); // a node of Ranvier: brief pause
	assert.ok(conduction(1, 0.05) > conduction(0.3, 0.05));
});

test("buildVaultGraph marks contradicts: links as inhibitory", () => {
	const files = [{ path: "wiki/a.md", links: ["wiki/b.md"] }, { path: "wiki/b.md" }, { path: "wiki/c.md" }];
	const base = { cache: null };
	const fs = files.map((f) => ({ path: f.path, basename: f.path.split("/").pop().replace(/\.md$/, ""), stat: { ctime: 1, mtime: 1 }, parent: { path: "wiki" } }));
	const app = {
		vault: { getMarkdownFiles: () => fs },
		metadataCache: {
			resolvedLinks: { "wiki/a.md": { "wiki/b.md": 1, "wiki/c.md": 1 }, "wiki/b.md": {}, "wiki/c.md": {} },
			unresolvedLinks: {},
			getFileCache: (f) => (f.path === "wiki/a.md" ? { frontmatterLinks: [{ key: "contradicts", link: "b" }, { key: "related", link: "c" }] } : base.cache),
			getFirstLinkpathDest: (link) => fs.find((x) => x.basename === link),
		},
	};
	const g = buildVaultGraph(app, { ...DEFAULT_SETTINGS });
	assert.deepEqual([...g.inhibit], ["wiki/a.md>wiki/b.md"]);
});
