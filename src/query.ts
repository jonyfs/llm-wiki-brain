/* Search box syntax, like the core graph filter: path:, file:, tag:, type: and -negation. Pure, testable in Node. */

export interface QueryPage {
	path: string;
	label: string;
	tags: string[];
	type: string;
	text: string; // lower-case name, path, headings and tags
}

interface Term {
	key: "" | "path" | "file" | "tag" | "type";
	value: string;
	not: boolean;
}

/** Splits on spaces, keeping "quoted phrases" (also after a key: path:"my folder") together. */
export function tokenize(q: string): string[] {
	const out: string[] = [];
	let cur = "", quoted = false;
	for (const ch of q) {
		if (ch === '"') quoted = !quoted;
		else if (/\s/.test(ch) && !quoted) {
			if (cur) out.push(cur);
			cur = "";
		} else cur += ch;
	}
	if (cur) out.push(cur);
	return out;
}

export function parseQuery(q: string): Term[] {
	const terms: Term[] = [];
	for (let t of tokenize(q.toLowerCase())) {
		let not = false;
		if (t.length > 1 && t.startsWith("-")) {
			not = true;
			t = t.slice(1);
		}
		const m = /^(path|file|tag|type):(.*)$/.exec(t);
		const value = m ? m[2] : t;
		if (!value) continue; // "tag:" with nothing yet, typed halfway
		terms.push({ key: (m ? m[1] : "") as Term["key"], value, not });
	}
	return terms;
}

function hit(t: Term, p: QueryPage): boolean {
	switch (t.key) {
		case "path": return p.path.toLowerCase().includes(t.value);
		case "file": return p.label.toLowerCase().includes(t.value);
		case "tag": {
			const want = t.value.startsWith("#") ? t.value : "#" + t.value;
			return p.tags.some((x) => x === want || x.startsWith(want + "/")); // nested tags: #a matches #a/b
		}
		case "type": return p.type === t.value;
		default: return p.text.includes(t.value);
	}
}

/** True when the page satisfies every term (an empty query matches nothing, so the caller can clear the highlight). */
export function matchesQuery(terms: Term[], p: QueryPage): boolean {
	if (!terms.length) return false;
	return terms.every((t) => hit(t, p) !== t.not);
}
