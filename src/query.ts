/* Search box syntax, like the core graph filter and a bit more. Pure, testable in Node.

   words                 every word must appear in the name, path, headings or tags
   path: file: tag: type: heading:
   links:>3  links:0     number of links (>, >=, <, <=, =)
   created:<7d  edited:>30d  edited:>2026-01-01   age (d, w, m, y) or an absolute date
   prop:status=draft  prop:author~ana  prop:status    a frontmatter property (equals, contains, exists)
   is:orphan is:broken is:untyped is:index is:log is:hub
   -term                 exclude
   a or b                either side (each side is an AND of its terms)
*/

export interface QueryPage {
	path: string;
	label: string;
	tags: string[];
	type: string;
	text: string; // lower-case name, path, headings and tags
	headings?: string; // lower-case headings
	degree?: number;
	ctime?: number;
	mtime?: number;
	props?: Record<string, string>; // frontmatter, lower-cased keys, values joined with ","
	flags?: string[]; // orphan, broken, untyped, index, log, hub
	outs?: string[]; // lower-case names of the pages this one links to
	ins?: string[]; // lower-case names of the pages that link here
}

type Key = "" | "path" | "file" | "tag" | "type" | "heading" | "links" | "created" | "edited" | "prop" | "is" | "to" | "from";

export interface Term {
	key: Key;
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

/** Alternatives separated by `or`; each alternative is a list of terms that must all hold. */
export function parseQuery(q: string): Term[][] {
	const groups: Term[][] = [[]];
	for (let t of tokenize(q.toLowerCase())) {
		if (t === "or") {
			if (groups[groups.length - 1].length) groups.push([]);
			continue;
		}
		let not = false;
		if (t.length > 1 && t.startsWith("-")) {
			not = true;
			t = t.slice(1);
		}
		const m = /^(path|file|tag|type|heading|links|created|edited|prop|is|to|from):(.*)$/.exec(t);
		const value = m ? m[2] : t;
		if (!value) continue; // "tag:" with nothing yet, typed halfway
		groups[groups.length - 1].push({ key: (m ? m[1] : "") as Key, value, not });
	}
	return groups.filter((g) => g.length);
}

const DAY = 86400000;
const UNIT: Record<string, number> = { d: DAY, w: 7 * DAY, m: 30 * DAY, y: 365 * DAY };

/** "&gt;3", ">=2", "0", "<=5": returns a test, or null when it is not a number comparison. */
export function numberTest(v: string): ((n: number) => boolean) | null {
	const m = /^(>=|<=|>|<|=)?(\d+(?:\.\d+)?)$/.exec(v);
	if (!m) return null;
	const x = Number(m[2]);
	switch (m[1]) {
		case ">": return (n) => n > x;
		case ">=": return (n) => n >= x;
		case "<": return (n) => n < x;
		case "<=": return (n) => n <= x;
		default: return (n) => n === x;
	}
}

/** Age or date comparison: `<7d` is newer than a week, `>30d` older than a month, `>2026-01-01` after that day. */
/** Words for the common ages, in the four languages of the plugin. */
const AGE_WORDS: Record<string, string> = { today: "1d", hoje: "1d", hoy: "1d", "aujourd'hui": "1d", week: "7d", semana: "7d", semaine: "7d", month: "30d", mes: "30d", mois: "30d", year: "365d", ano: "365d", año: "365d", an: "365d" };

export function dateTest(v: string, now: number): ((t: number) => boolean) | null {
	const word = /^(>=|<=|>|<|=)?(.+)$/.exec(v);
	if (word && AGE_WORDS[word[2]]) v = (word[1] ?? "<") + AGE_WORDS[word[2]];
	const m = /^(>=|<=|>|<|=)?(?:(\d+)([dwmy])|(\d{4})-(\d{2})-(\d{2}))$/.exec(v);
	if (!m) return null;
	const op = m[1] ?? (m[2] ? "<" : "="); // a bare age means "younger than", a bare date means "that day"
	if (m[2]) {
		const age = Number(m[2]) * UNIT[m[3]];
		const cut = now - age; // a page is "younger than" the age when its time is after the cut
		if (op === "<" || op === "<=") return (t) => t >= cut;
		if (op === ">" || op === ">=") return (t) => t <= cut;
		return (t) => Math.abs(t - cut) < DAY;
	}
	const day = Date.UTC(Number(m[4]), Number(m[5]) - 1, Number(m[6]));
	if (op === ">") return (t) => t >= day + DAY;
	if (op === ">=") return (t) => t >= day;
	if (op === "<") return (t) => t < day;
	if (op === "<=") return (t) => t < day + DAY;
	return (t) => t >= day && t < day + DAY;
}

function propHit(value: string, props: Record<string, string> | undefined): boolean {
	if (!props) return false;
	const m = /^([^=~]+)(?:([=~])(.*))?$/.exec(value);
	if (!m) return false;
	const have = props[m[1].trim()];
	if (have === undefined) return false;
	if (!m[2]) return true; // exists
	const want = (m[3] ?? "").toLowerCase();
	return m[2] === "=" ? have.toLowerCase() === want : have.toLowerCase().includes(want);
}

function hit(t: Term, p: QueryPage, now: number): boolean {
	switch (t.key) {
		case "path": return p.path.toLowerCase().includes(t.value);
		case "file": return p.label.toLowerCase().includes(t.value);
		case "heading": return (p.headings ?? "").includes(t.value);
		case "tag": {
			const want = t.value.startsWith("#") ? t.value : "#" + t.value;
			return p.tags.some((x) => x === want || x.startsWith(want + "/")); // nested tags: #a matches #a/b
		}
		case "type": return p.type === t.value;
		case "links": {
			const f = numberTest(t.value);
			return !!f && f(p.degree ?? 0);
		}
		case "created":
		case "edited": {
			const f = dateTest(t.value, now), time = t.key === "created" ? p.ctime : p.mtime;
			return !!f && time !== undefined && f(time);
		}
		case "prop": return propHit(t.value, p.props);
		case "to": return (p.outs ?? []).some((x) => x.includes(t.value)); // links to a page whose name has this
		case "from": return (p.ins ?? []).some((x) => x.includes(t.value)); // is linked from such a page
		case "is": return (p.flags ?? []).includes(t.value);
		default: {
			const re = /^\/(.+)\/$/.exec(t.value); // /regex/ against the name, path, headings and tags
			if (re) {
				try {
					return new RegExp(re[1], "i").test(p.text);
				} catch {
					return false; // half-typed pattern
				}
			}
			return p.text.includes(t.value);
		}
	}
}

/** True when the page satisfies one whole alternative (an empty query matches nothing, so the caller can clear the highlight). */
export function matchesQuery(groups: Term[][], p: QueryPage, now = Date.now()): boolean {
	return groups.some((terms) => terms.length > 0 && terms.every((t) => hit(t, p, now) !== t.not));
}

/** Subsequence match: 0 when `needle` is not in `hay` in order, else a score up to 1 (tighter is better). */
export function fuzzyScore(needle: string, hay: string): number {
	const n = needle.toLowerCase(), h = hay.toLowerCase();
	if (!n) return 0;
	let hi = 0, first = -1, last = -1;
	for (const ch of n) {
		const at = h.indexOf(ch, hi);
		if (at < 0) return 0;
		if (first < 0) first = at;
		last = at;
		hi = at + 1;
	}
	return n.length / (last - first + 1);
}

/** `[[name]]` lines for a list of note paths, the way you would paste them into a note. */
export function toWikiLinks(paths: string[]): string {
	return paths.map((p) => "[[" + p.replace(/\.md$/i, "") + "]]").join("\n");
}

const KEYS = ["path:", "file:", "tag:", "type:", "heading:", "links:", "created:", "edited:", "prop:", "is:", "to:", "from:"];
const IS_VALUES = ["orphan", "broken", "untyped", "index", "log", "hub"];

/** Whole-query completions for what is being typed: a key prefix, or a value of `is:`, `type:`, `tag:`, `path:`. At most `max`. */
export function suggest(query: string, vocab: { tags: string[]; folders: string[]; types: string[] }, max = 8): string[] {
	const m = /^(.*?)(-?)([^\s"]*)$/.exec(query);
	if (!m) return [];
	const head = m[1], neg = m[2], cur = m[3].toLowerCase();
	if (!cur) return [];
	const out: string[] = [];
	const colon = cur.indexOf(":");
	if (colon < 0) {
		for (const k of KEYS) if (k.startsWith(cur) && k !== cur) out.push(head + neg + k);
	} else {
		const key = cur.slice(0, colon + 1), val = cur.slice(colon + 1);
		const pool = key === "is:" ? IS_VALUES : key === "type:" ? vocab.types : key === "tag:" ? vocab.tags.map((t) => t.replace(/^#/, "")) : key === "path:" ? vocab.folders : [];
		for (const v of pool) if (v.toLowerCase().startsWith(val) && v.toLowerCase() !== val) out.push(head + neg + key + (/\s/.test(v) ? '"' + v + '"' : v));
	}
	return out.slice(0, max);
}
