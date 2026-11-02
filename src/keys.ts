/* Keyboard shortcut guards. Pure: no DOM, testable in Node. */

export interface KeyLike {
	key: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	altKey?: boolean;
	shiftKey?: boolean;
	target?: object | null; // a DOM EventTarget in the browser, a plain object in tests
}

const TYPING_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

/** True when the key was pressed in a place where the user is typing or choosing a value, so a bare-letter shortcut must stay out of the way. */
export function isTypingTarget(t: KeyLike["target"]): boolean {
	if (!t) return false;
	const el = t as { tagName?: string; isContentEditable?: boolean };
	return !!el.isContentEditable || TYPING_TAGS.has((el.tagName ?? "").toUpperCase());
}

/** F opens or closes the filter panel, but never while typing and never as part of Ctrl/Cmd/Alt+F (those belong to Obsidian and the OS) or Shift+F (fullscreen). */
export function isPanelShortcut(e: KeyLike): boolean {
	if (e.key !== "f" && e.key !== "F") return false;
	if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;
	return !isTypingTarget(e.target);
}
