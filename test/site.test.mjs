import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const html = readFileSync("site/index.html", "utf8");
const i18n = readFileSync("site/assets/i18n.js", "utf8");

function keysOf(page) {
	const keys = new Set([...page.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]));
	for (const m of page.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const p of m[1].split(";")) keys.add(p.split(":")[1]);
	return keys;
}

/** The dictionaries live inside an IIFE: run it against a fake DOM and read what it exposes. */
function dictionaries() {
	const g = globalThis;
	const saved = { document: g.document, window: g.window, location: g.location, localStorage: g.localStorage, Event: g.Event };
	const nav = Object.getOwnPropertyDescriptor(g, "navigator");
	try {
		g.document = { documentElement: { setAttribute() {} }, querySelectorAll: () => [], getElementById: () => null, dispatchEvent() {} };
		g.window = { dispatchEvent() {} };
		g.location = { search: "" };
		Object.defineProperty(g, "navigator", { value: { language: "en" }, configurable: true });
		g.localStorage = { getItem: () => null, setItem() {} };
		g.Event = function () {};
		new Function(i18n)();
		return g.window.llmwDict;
	} finally {
		for (const [k, v] of Object.entries(saved)) g[k] = v;
		if (nav) Object.defineProperty(g, "navigator", nav);
	}
}

test("every key the page uses exists in pt, es and fr, and no translation is unused", () => {
	const keys = keysOf(html), dict = dictionaries();
	for (const l of ["pt", "es", "fr"]) {
		const have = new Set(Object.keys(dict[l]));
		assert.deepEqual([...keys].filter((k) => !have.has(k)), [], l + " is missing keys");
		assert.deepEqual([...have].filter((k) => !keys.has(k)), [], l + " has unused keys");
		for (const k of keys) assert.ok(dict[l][k].trim().length > 0, l + " " + k + " is empty");
	}
});

test("a translation of a text with markup keeps some markup", () => {
	const dict = dictionaries();
	const withMarkup = [...html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*<(?:code|em|strong|span|a)\b)/g)].map((m) => m[1]);
	assert.ok(withMarkup.length > 10);
	for (const l of ["pt", "es", "fr"]) for (const k of withMarkup) assert.ok(/<(?:code|em|strong|span|a)\b/.test(dict[l][k]), l + " " + k + " lost its markup");
});

test("the inline theme script matches the hash in the Content-Security-Policy of both pages", () => {
	for (const f of ["site/index.html", "site/changelog.html"]) {
		const page = readFileSync(f, "utf8");
		const script = /<script>(\(function\(\)\{var d=document\.documentElement[\s\S]*?)<\/script>/.exec(page)[1];
		const hash = createHash("sha256").update(script).digest("base64");
		assert.ok(page.includes("'sha256-" + hash + "'"), f + " has a stale CSP hash");
	}
});

test("the page has no external scripts or styles, and every local asset it loads exists or is generated", () => {
	assert.equal(/<script[^>]+src="https?:/.test(html), false);
	assert.equal(/<link[^>]+href="https?:\/\/[^"]+\.css/.test(html), false);
	const generated = new Set(["assets/demo.js", "assets/plugin.css", "assets/brain.jpg"]);
	for (const m of html.matchAll(/(?:src|href)="((?:assets\/|[a-z-]+\.(?:html|txt|xml))[^"#?]*)"/g)) assert.ok(existsSync("site/" + m[1]) || generated.has(m[1]), m[1] + " is missing");
});

test("the page has landmarks, one h1, a skip link and sized, described images", () => {
	assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
	assert.ok(/<main\b/.test(html) && /<footer\b/.test(html) && /class="skip"/.test(html));
	for (const m of html.matchAll(/<img\b[^>]*>/g)) assert.ok(/\balt="[^"]+"/.test(m[0]) && /\bwidth=/.test(m[0]) && /\bheight=/.test(m[0]), "img needs alt, width and height");
});

test("ids are unique and every in-page link points at one", () => {
	const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
	assert.equal(new Set(ids).size, ids.length, "duplicate ids");
	for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]), "#" + m[1] + " has no target");
});

test("the site is wired for deployment: workflow, no committed build output", () => {
	const wf = readFileSync(".github/workflows/pages.yml", "utf8");
	assert.ok(wf.includes("actions/deploy-pages") && wf.includes("path: site") && wf.includes("build-site.mjs"));
	const ig = readFileSync(".gitignore", "utf8");
	for (const f of ["site/assets/demo.js", "site/assets/plugin.css", "site/assets/brain.jpg"]) assert.ok(ig.includes(f), f + " should be ignored");
});
