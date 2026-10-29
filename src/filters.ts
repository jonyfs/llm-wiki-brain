/* Which pages stay visible. Pure: the view builds the inputs, the engine receives the resulting set. */

export interface FilterSpec {
	folder: string;
	tag: string;
	minDeg: number;
	orphansOnly: boolean;
	days: number;
	createdDays: number; // created in the last N days (0 = any)
	maxDeg: number; // at most N links (0 = no limit)
	invert: boolean; // show what the other filters would hide
	op: string; // only pages a log operation touched ("" = any)
	dir: "" | "sources" | "sinks" | "hubs2"; // sources: nothing links here; sinks: links nowhere; hubs2: both ways busy
}

export interface FilterPage {
	path: string;
	mtime: number;
	ctime: number;
	folder: string;
	tags: string[];
}

export interface FilterContext {
	degree: (path: string) => number;
	orphans: Set<string>;
	neighbourhood: Set<string> | null;
	opPaths?: Set<string> | null; // pages touched by `op`, when one is chosen
	extra?: Set<string> | null; // pages that satisfy the filter query or the search in hide mode
	isolate?: Set<string> | null; // an isolated selection
	inDeg?: (path: string) => number;
	outDeg?: (path: string) => number;
	now: number;
}

export const NO_FILTER: FilterSpec = { folder: "", tag: "", minDeg: 0, orphansOnly: false, days: 0, createdDays: 0, maxDeg: 0, invert: false, op: "", dir: "" };

/** Named one-click filter presets. Each replaces the active filter set with a sensible combo. */
export type FilterPreset = "orphans" | "hubs" | "recent" | "new" | "sinks" | "sources" | "invert";

/** Apply a preset to a filter spec. `invert` toggles; the others replace with a focused combo. */
export function applyPreset(f: FilterSpec, preset: FilterPreset): FilterSpec {
	switch (preset) {
		case "orphans": return { ...NO_FILTER, orphansOnly: true };
		case "hubs": return { ...NO_FILTER, minDeg: 4 };
		case "recent": return { ...NO_FILTER, days: 30 };
		case "new": return { ...NO_FILTER, createdDays: 30 };
		case "sinks": return { ...NO_FILTER, dir: "sinks" };
		case "sources": return { ...NO_FILTER, dir: "sources" };
		case "invert": return { ...f, invert: !f.invert };
	}
}

/** Paths to keep, or null when no filter is active (show everything). */
export function filterPaths(pages: FilterPage[], f: FilterSpec, ctx: FilterContext): Set<string> | null {
	if (!(f.folder || f.tag || f.minDeg || f.maxDeg || f.orphansOnly || f.days || f.createdDays || f.op || f.dir || ctx.extra || ctx.isolate || ctx.neighbourhood)) return null;
	const keep = new Set<string>();
	for (const p of pages) {
		let ok = true;
		if (ctx.neighbourhood && !ctx.neighbourhood.has(p.path)) ok = false;
		else if (f.folder && p.folder !== f.folder) ok = false;
		else if (f.tag && !p.tags.includes(f.tag)) ok = false;
		else if (f.op && !ctx.opPaths?.has(p.path)) ok = false;
		else if (ctx.extra && !ctx.extra.has(p.path)) ok = false;
		else if (ctx.isolate && !ctx.isolate.has(p.path)) ok = false;
		else if (f.dir === "sources" && (ctx.inDeg?.(p.path) ?? 0) > 0) ok = false;
		else if (f.dir === "sinks" && (ctx.outDeg?.(p.path) ?? 0) > 0) ok = false;
		else if (f.dir === "hubs2" && ((ctx.inDeg?.(p.path) ?? 0) < 3 || (ctx.outDeg?.(p.path) ?? 0) < 3)) ok = false;
		else if (f.minDeg && ctx.degree(p.path) < f.minDeg) ok = false;
		else if (f.maxDeg && ctx.degree(p.path) > f.maxDeg) ok = false;
		else if (f.orphansOnly && !ctx.orphans.has(p.path)) ok = false;
		else if (f.days && ctx.now - p.mtime > f.days * 86400000) ok = false;
		else if (f.createdDays && ctx.now - p.ctime > f.createdDays * 86400000) ok = false;
		if (ok !== f.invert) keep.add(p.path);
	}
	return keep;
}

/** The page and everything within `depth` links of it. */
export function neighbourhoodOf(links: [string, string][], path: string, depth: number): Set<string> {
	const adj = new Map<string, string[]>();
	for (const [a, b] of links) {
		(adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
		(adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
	}
	const seen = new Set([path]);
	let frontier = [path];
	for (let d = 0; d < depth; d++) {
		const next: string[] = [];
		for (const p of frontier) for (const q of adj.get(p) ?? []) if (!seen.has(q)) {
			seen.add(q);
			next.push(q);
		}
		frontier = next;
	}
	return seen;
}
