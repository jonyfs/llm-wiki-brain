import test from "node:test";
import assert from "node:assert/strict";
import { LANGS, STRINGS, resolveLang, translate, placeholders } from "../.test-build/i18n.mjs";

const keys = Object.keys(STRINGS.en);

test("English is the first and the default language", () => {
	assert.equal(LANGS[0], "en");
	assert.equal(resolveLang(undefined, undefined), "en");
	assert.equal(resolveLang("auto", null), "en");
});

test("every language has exactly the same keys as English", () => {
	for (const l of LANGS) assert.deepEqual(Object.keys(STRINGS[l]).sort(), keys.slice().sort(), l);
});

test("no translation is empty", () => {
	for (const l of LANGS) for (const k of keys) assert.ok(STRINGS[l][k].trim().length > 0, `${l} ${k}`);
});

test("every translation keeps exactly the placeholders of the English text", () => {
	for (const l of LANGS) for (const k of keys) assert.deepEqual(placeholders(STRINGS[l][k]), placeholders(STRINGS.en[k]), `${l} ${k}`);
});

test("other languages are really translated (most strings differ from English)", () => {
	for (const l of LANGS.filter((x) => x !== "en")) {
		const same = keys.filter((k) => STRINGS[l][k] === STRINGS.en[k]);
		assert.ok(same.length <= 8, `${l} leaves too many strings in English: ${same.join(", ")}`);
	}
});

test("auto follows Obsidian's language", () => {
	assert.equal(resolveLang("auto", "pt-BR"), "pt-BR");
	assert.equal(resolveLang("auto", "pt"), "pt-BR");
	assert.equal(resolveLang("auto", "es"), "es");
	assert.equal(resolveLang("auto", "fr"), "fr");
	assert.equal(resolveLang("auto", "fr-CA"), "fr");
	assert.equal(resolveLang("auto", "en-GB"), "en");
});

test("an unsupported Obsidian language falls back to English", () => {
	for (const l of ["zh-TW", "ja", "de", "", "xx"]) assert.equal(resolveLang("auto", l), "en");
});

test("an explicit choice wins over Obsidian's language, and junk falls back to auto", () => {
	assert.equal(resolveLang("fr", "pt-BR"), "fr");
	assert.equal(resolveLang("en", "es"), "en");
	assert.equal(resolveLang("klingon", "es"), "es");
});

test("translate fills placeholders and leaves unknown ones alone", () => {
	assert.equal(translate("en", "status.matches", { n: 3 }), "3 match(es).");
	assert.equal(translate("fr", "status.matches", { n: 3 }), "3 résultat(s).");
	assert.equal(translate("es", "status.matches"), "{n} coincidencia(s).");
});

test("translate falls back to English for a missing key and to the key as a last resort", () => {
	assert.equal(translate("pt-BR", "btn.stop"), "Parar");
	assert.equal(translate("en", "nope"), "nope");
});

test("a value containing a dollar sign or braces is inserted literally", () => {
	assert.equal(translate("en", "status.drawFailed", { error: "a $& {n}" }), "Drawing failed (a $& {n}). Switched to simple mode. Include this message in a bug report.");
});

import { readFileSync } from "node:fs";

test("every translation key is used somewhere in the source (no dead strings)", () => {
	const src = ["src/view.ts", "src/main.ts", "src/engine.ts"].map((f) => readFileSync(f, "utf8")).join("\n");
	const unused = keys.filter((k) => !src.includes(`"${k}"`) && !(k.startsWith("type.") && src.includes('"type."')));
	assert.deepEqual(unused, []);
});
