import test from "node:test";
import assert from "node:assert/strict";
import { cleanViews, saveView, removeView, MAX_VIEWS } from "../.test-build/views.mjs";

const V = (name, query = "", filters = {}) => ({ name, query, filters });

test("cleanViews drops junk, trims, dedupes names ignoring case, caps the list", () => {
	assert.deepEqual(cleanViews(undefined), []);
	assert.deepEqual(cleanViews("x"), []);
	const r = cleanViews([null, 3, { name: "  " }, V(" A "), V("a"), { name: "B", query: 5, filters: [1] }]);
	assert.deepEqual(r.map((v) => v.name), ["A", "B"]);
	assert.equal(r[1].query, "");
	assert.deepEqual(r[1].filters, {});
	assert.equal(cleanViews(Array.from({ length: 50 }, (_, i) => V("v" + i))).length, MAX_VIEWS);
});

test("saveView puts the newest first and replaces a view with the same name", () => {
	let l = saveView([], V("one", "tag:a"));
	l = saveView(l, V("two"));
	l = saveView(l, V("ONE", "tag:b", { days: 7 }));
	assert.deepEqual(l.map((v) => v.name), ["ONE", "two"]);
	assert.equal(l[0].query, "tag:b");
	assert.equal(saveView(l, V("   ")), l);
});

test("removeView removes by name only", () => {
	const l = [V("a"), V("b")];
	assert.deepEqual(removeView(l, "a").map((v) => v.name), ["b"]);
	assert.equal(removeView(l, "zzz").length, 2);
});

import { cleanLastView } from "../.test-build/views.mjs";

test("cleanLastView keeps a well-formed state and drops anything else", () => {
	assert.equal(cleanLastView(null), null);
	assert.equal(cleanLastView("x"), null);
	assert.equal(cleanLastView({ q: "a" }), null, "no filters object");
	assert.equal(cleanLastView({ filters: [] }), null, "filters must be an object");
	const v = cleanLastView({ filters: { folder: "wiki/a", hidden: ["entity"] }, q: "attention", extra: "tag:ai", hide: true, color: "folder", size: "degree" });
	assert.deepEqual(v.filters, { folder: "wiki/a", hidden: ["entity"] });
	assert.equal(v.q, "attention");
	assert.equal(v.hide, true);
	assert.equal(v.color, "folder");
});

test("cleanLastView caps long text and defaults the rest", () => {
	const v = cleanLastView({ filters: {}, q: "x".repeat(1000), hide: "yes" });
	assert.equal(v.q.length, 300);
	assert.equal(v.hide, false);
	assert.equal(v.color, "type");
	assert.equal(v.size, "same");
	assert.equal(v.extra, "");
});

import { sanitizeFilters } from "../.test-build/views.mjs";

test("sanitizeFilters keeps well-typed known keys and drops the rest", () => {
	const defaults = { folder: "", minDeg: 0, orphansOnly: false, hidden: [] };
	assert.deepEqual(sanitizeFilters({ folder: "wiki/a", minDeg: 3, orphansOnly: true, hidden: ["entity"], extra: 1 }, defaults), { folder: "wiki/a", minDeg: 3, orphansOnly: true, hidden: ["entity"] });
	assert.deepEqual(sanitizeFilters({ folder: 5, minDeg: "3", orphansOnly: "yes", hidden: "x" }, defaults), {}, "wrong types are dropped");
	assert.deepEqual(sanitizeFilters({ minDeg: NaN }, defaults), {}, "not a finite number");
	assert.deepEqual(sanitizeFilters(null, defaults), {});
});
