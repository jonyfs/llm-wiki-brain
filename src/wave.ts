/* The Flow wave: how far information gets from the index, hop by hop. Pure, testable in Node.

   First it follows the links in their own direction (a page's outputs). Pages that no such chain reaches are then
   taken through links read backwards (the wave still gets there, shown dimmer), and what is left has no link to the
   rest of the wiki at all. */

export interface Wave {
	levels: number[][]; // levels[0] is the start; levels[k] are the pages reached at hop k
	level: Int32Array; // hop per page, -1 when never reached
	parent: Int32Array; // the page the wave came from, -1 for the start and the unreached
	weak: Uint8Array; // 1 when the wave entered this page against the direction of a link
}

/**
 * `out[i]`: pages i links to; `any[i]`: pages linked either way. `allowed` leaves out hidden pages.
 *
 * In an LLM wiki the index links to every page, so measured by links alone everything is one hop away and the wave would be
 * a single flash. With `spread` (the default) the links that leave the start toward a page that something else also links to
 * are held back: the wave first goes to the pages only the index knows, and reaches the rest through the links between pages.
 * Pages that way never reaches fall back to the index's direct link, so nothing is left out.
 */
export function bfsLevels(out: number[][], any: number[][], start: number, allowed: (i: number) => boolean, spread = true): Wave {
	const n = out.length;
	const level = new Int32Array(n).fill(-1), parent = new Int32Array(n).fill(-1), weak = new Uint8Array(n);
	if (start < 0 || start >= n) return { levels: [], level, parent, weak };
	level[start] = 0;
	const queue = [start];
	// pages that some page other than the start links to
	const fed = new Uint8Array(n);
	if (spread) for (let u = 0; u < n; u++) if (u !== start && allowed(u)) for (const v of out[u]) fed[v] = 1;
	const run = () => {
		for (let h = 0; h < queue.length; h++) {
			const u = queue[h];
			for (const v of out[u]) {
				if (level[v] >= 0 || !allowed(v)) continue;
				if (spread && u === start && fed[v]) continue; // held back: reached through the network if it can be
				level[v] = level[u] + 1;
				parent[v] = u;
				queue.push(v);
			}
		}
	};
	run();
	// The start's direct links to pages the network did not reach, then whatever they lead to.
	if (spread) {
		let added = false;
		for (const v of out[start]) {
			if (level[v] >= 0 || !allowed(v)) continue;
			level[v] = 1;
			parent[v] = start;
			queue.push(v);
			added = true;
		}
		if (added) run();
	}
	// What the outputs did not reach: continue through the links read backwards, from everything already reached, nearest first.
	const seeds = queue.slice();
	for (let h = 0; h < seeds.length; h++) {
		const u = seeds[h];
		for (const v of any[u]) {
			if (level[v] >= 0 || !allowed(v)) continue;
			level[v] = level[u] + 1;
			parent[v] = u;
			weak[v] = 1;
			seeds.push(v);
		}
	}
	const levels: number[][] = [];
	for (let i = 0; i < n; i++) if (level[i] >= 0) (levels[level[i]] ??= []).push(i);
	return { levels, level, parent, weak };
}

/** Time of each hop, in ms: long waves go faster, short ones slower, so the whole thing lasts a few seconds. `speed` 1 is normal. */
export function hopMs(hops: number, speed: number): number {
	const base = Math.max(320, Math.min(900, 5200 / Math.max(1, hops)));
	return base / Math.max(0.3, speed);
}
