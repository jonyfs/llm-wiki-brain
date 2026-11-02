import test from "node:test";
import assert from "node:assert/strict";
import { isPanelShortcut, isTypingTarget } from "../.test-build/keys.mjs";

test("F on the canvas opens the filter panel", () => {
	assert.equal(isPanelShortcut({ key: "f", target: { tagName: "CANVAS" } }), true);
	assert.equal(isPanelShortcut({ key: "F", target: { tagName: "DIV" } }), true);
});

test("F while typing in a field is left alone", () => {
	for (const tagName of ["INPUT", "SELECT", "TEXTAREA", "input"]) assert.equal(isPanelShortcut({ key: "f", target: { tagName } }), false, tagName);
	assert.equal(isPanelShortcut({ key: "f", target: { tagName: "DIV", isContentEditable: true } }), false);
});

test("Ctrl/Cmd/Alt+F is not ours, and Shift+F is fullscreen", () => {
	for (const mod of ["ctrlKey", "metaKey", "altKey", "shiftKey"]) assert.equal(isPanelShortcut({ key: "f", [mod]: true, target: { tagName: "CANVAS" } }), false, mod);
});

test("other keys never match, and a missing target counts as not typing", () => {
	assert.equal(isPanelShortcut({ key: "g", target: { tagName: "CANVAS" } }), false);
	assert.equal(isTypingTarget(null), false);
	assert.equal(isPanelShortcut({ key: "f" }), true);
});
