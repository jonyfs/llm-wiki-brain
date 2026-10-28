/* Saved positions of the neurons, so the brain opens the way it was left. Pure, testable in Node. */

export type Layout = Record<string, number[]>;

const round = (v: number) => Math.round(v * 10) / 10;

/** Positions for the pages that still exist, rounded, at most `cap` of them. Anything malformed is dropped. */
export function pruneLayout(layout: Layout, keep: Set<string> | null, cap = 4000): Layout {
	const out: Layout = {};
	let n = 0;
	for (const [path, p] of Object.entries(layout ?? {})) {
		if (n >= cap) break;
		if (keep && !keep.has(path)) continue;
		if (!Array.isArray(p) || p.length < 3 || !p.slice(0, 3).every((v) => typeof v === "number" && Number.isFinite(v))) continue;
		out[path] = [round(p[0]), round(p[1]), round(p[2])];
		n++;
	}
	return out;
}

/** Share of pages that have a saved position (0 to 1). */
export function coverage(paths: string[], layout: Layout | undefined): number {
	if (!paths.length || !layout) return 0;
	let known = 0;
	for (const p of paths) if (layout[p]) known++;
	return known / paths.length;
}
