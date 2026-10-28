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
