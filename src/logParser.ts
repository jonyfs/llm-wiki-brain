/* wiki/log.md: `## [YYYY-MM-DD] operation | title`. Tolerant: a bad line is skipped, never thrown. Pure. */

export interface LogEntry {
	date: number; // ms since epoch, UTC midnight
	op: string;
	title: string;
	line: number; // 1-based
}

const HEAD = /^#{2,3}\s*\[(\d{4})-(\d{2})-(\d{2})\]\s*([^|\n]*?)\s*(?:\|\s*(.*))?$/;

export function parseLog(text: string): LogEntry[] {
	const out: LogEntry[] = [];
	if (!text) return out;
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		const m = HEAD.exec(lines[i]);
		if (!m) continue;
		const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
		const t = Date.UTC(y, mo - 1, d);
		const back = new Date(t);
		if (mo < 1 || mo > 12 || back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) continue; // 2026-02-31 and friends
		out.push({ date: t, op: m[4].trim(), title: (m[5] ?? "").trim(), line: i + 1 });
	}
	return out;
}

const DAY = 86400000;

/** True when most pages share one creation day, as in a vault restored from Git or iCloud. */
export function ctimeCollapsed(ctimes: number[], ratio = 0.8, minPages = 5): boolean {
	if (ctimes.length < minPages) return false;
	const count = new Map<number, number>();
	let top = 0;
	for (const c of ctimes) {
		const day = Math.floor(c / DAY);
		const n = (count.get(day) ?? 0) + 1;
		count.set(day, n);
		if (n > top) top = n;
	}
	return top / ctimes.length > ratio;
}

export interface TimedPage {
	path: string;
	label: string;
	ctime: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "-");

/**
 * Creation times for ordering. Normally the file's own; when they collapse, the date of the first log entry that
 * names the page. Pages the log never mentions are treated as the oldest (bootstrap), so "latest" points at a
 * page the log can actually place.
 */
export function creationTimes(pages: TimedPage[], logText: string | null | undefined): Map<string, number> {
	const own = new Map(pages.map((p) => [p.path, p.ctime]));
	if (!logText || !ctimeCollapsed(pages.map((p) => p.ctime))) return own;
	const entries = parseLog(logText);
	if (!entries.length) return own;
	const first = entries.reduce((a, e) => Math.min(a, e.date), Infinity);
	const out = new Map<string, number>();
	for (const p of pages) {
		const name = norm(p.label);
		let hit: LogEntry | undefined;
		for (const e of entries) {
			if (name.length >= 3 && norm(e.title).includes(name)) {
				hit = e;
				break;
			}
		}
		out.set(p.path, hit ? hit.date : first);
	}
	return out;
}
