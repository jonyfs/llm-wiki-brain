/* Which pages stay visible. Pure: the view builds the inputs, the engine receives the resulting set. */

export interface FilterSpec {
	folder: string;
	tag: string;
	minDeg: number;
	orphansOnly: boolean;
	days: number;
}

export interface FilterPage {
	path: string;
	mtime: number;
	folder: string;
	tags: string[];
}

export interface FilterContext {
	degree: (path: string) => number;
	orphans: Set<string>;
	neighbourhood: Set<string> | null;
	now: number;
}

export const NO_FILTER: FilterSpec = { folder: "", tag: "", minDeg: 0, orphansOnly: false, days: 0 };

/** Paths to keep, or null when no filter is active (show everything). */
export function filterPaths(pages: FilterPage[], f: FilterSpec, ctx: FilterContext): Set<string> | null {
	if (!(f.folder || f.tag || f.minDeg || f.orphansOnly || f.days || ctx.neighbourhood)) return null;
	const keep = new Set<string>();
	for (const p of pages) {
		if (ctx.neighbourhood && !ctx.neighbourhood.has(p.path)) continue;
		if (f.folder && p.folder !== f.folder) continue;
		if (f.tag && !p.tags.includes(f.tag)) continue;
		if (f.minDeg && ctx.degree(p.path) < f.minDeg) continue;
		if (f.orphansOnly && !ctx.orphans.has(p.path)) continue;
		if (f.days && ctx.now - p.mtime > f.days * 86400000) continue;
		keep.add(p.path);
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
