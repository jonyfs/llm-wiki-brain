import test from "node:test";
import assert from "node:assert/strict";
import { parseQuery, matchesQuery, tokenize } from "../.test-build/query.mjs";

const P = (o) => ({ path: "wiki/concepts/compounding.md", label: "compounding", tags: ["#ai", "#wiki/llm"], type: "concept", text: "wiki/concepts/compounding.md ingest loop #ai #wiki/llm", ...o });
const m = (q, p = P()) => matchesQuery(parseQuery(q), p);

test("bare words must all match the text", () => {
	assert.equal(m("compounding ingest"), true);
	assert.equal(m("compounding nothing"), false);
});

test("path:, file:, tag: and type:", () => {
	assert.equal(m("path:concepts"), true);
	assert.equal(m("path:sources"), false);
	assert.equal(m("file:compound"), true);
	assert.equal(m("tag:ai"), true);
	assert.equal(m("tag:#ai"), true);
	assert.equal(m("type:concept"), true);
	assert.equal(m("type:source"), false);
});

test("a parent tag matches nested tags", () => {
	assert.equal(m("tag:wiki"), true);
	assert.equal(m("tag:wi"), false, "a prefix of a tag name is not a tag");
});

test("negation with a leading minus", () => {
	assert.equal(m("path:wiki -tag:draft"), true);
	assert.equal(m("path:wiki -tag:ai"), false);
	assert.equal(m("-type:source"), true);
});

test("terms combine with AND and are case-insensitive", () => {
	assert.equal(m("PATH:Concepts TAG:AI"), true);
	assert.equal(m("path:concepts tag:nope"), false);
});

test("quoted phrases keep their spaces, also after a key", () => {
	assert.deepEqual(tokenize('path:"my folder" notes'), ["path:my folder", "notes"]);
	assert.equal(m('path:"wiki/concepts"'), true);
});

test("an empty or half-typed query matches nothing and never throws", () => {
	assert.equal(parseQuery("").length, 0);
	assert.equal(m(""), false);
	assert.equal(m("tag:"), false);
	assert.equal(m("   "), false);
	assert.equal(m("-"), false);
});

test("a lone minus word is treated as a word, not a negation of nothing", () => {
	assert.equal(parseQuery("-").length, 1);
});
