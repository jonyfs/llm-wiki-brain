/** Shortest route between two cells over the link graph (breadth-first, uniform cost). */
export function findRoute(
	adj: number[][],
	from: number,
	to: number,
	allowed: (i: number) => boolean,
	maxHops = 8,
): number[] | null {
	if (from === to || !allowed(from) || !allowed(to)) return null;
	const prev = new Map<number, number>([[from, -1]]);
	let frontier = [from];
	for (let hop = 0; hop < maxHops && frontier.length; hop++) {
		const next: number[] = [];
		for (const a of frontier) {
			for (const b of adj[a]) {
				if (prev.has(b) || !allowed(b)) continue;
				prev.set(b, a);
				if (b === to) {
					const out = [to];
					for (let c = a; c !== -1; c = prev.get(c) as number) out.push(c);
					return out.reverse();
				}
				next.push(b);
			}
		}
		frontier = next;
	}
	return null;
}

/** Breadth-first walk used by "ask": up to `cap` cells within `depth` hops, the best-connected neighbours first. */
export function spreadFrom(
	adj: number[][],
	deg: number[],
	seeds: number[],
	allowed: (i: number) => boolean,
	depth = 2,
	fan = 4,
	cap = 24,
): { id: number; from: number; hop: number }[] {
	const seen = new Set<number>(seeds);
	const out: { id: number; from: number; hop: number }[] = [];
	const queue: { id: number; from: number; hop: number }[] = seeds.map((id) => ({ id, from: -1, hop: 0 }));
	while (queue.length && out.length < cap) {
		const cur = queue.shift() as { id: number; from: number; hop: number };
		out.push(cur);
		if (cur.hop >= depth) continue;
		const nbs = adj[cur.id].filter((b) => allowed(b)).sort((a, b) => deg[b] - deg[a]).slice(0, fan);
		for (const b of nbs) {
			if (seen.has(b)) continue;
			seen.add(b);
			queue.push({ id: b, from: cur.id, hop: cur.hop + 1 });
		}
	}
	return out;
}

/** Label propagation: pages that link to each other end up with the same label. Deterministic. */
export function communities(adj: number[][], rounds = 8): number[] {
	const label = adj.map((_, i) => i);
	for (let r = 0; r < rounds; r++) {
		let changed = false;
		for (let i = 0; i < adj.length; i++) {
			if (!adj[i].length) continue;
			const count = new Map<number, number>();
			for (const j of adj[i]) count.set(label[j], (count.get(label[j]) ?? 0) + 1);
			let best = label[i], bc = -1;
			for (const [l, c] of count) if (c > bc || (c === bc && l < best)) { best = l; bc = c; }
			if (best !== label[i]) {
				label[i] = best;
				changed = true;
			}
		}
		if (!changed) break;
	}
	return label;
}

/**
 * Give every cell a lobe: communities are poured into the lobes in turn (each lobe holds a share of the
 * cells proportional to its weight), so linked pages share a region of the brain. Unlinked cells go last.
 */
export function assignLobes(adj: number[][], weights: number[], order: number[]): number[] {
	const n = adj.length, label = communities(adj);
	const groups = new Map<number, number[]>();
	const loose: number[] = [];
	for (let i = 0; i < n; i++) {
		if (!adj[i].length) loose.push(i);
		else (groups.get(label[i]) ?? groups.set(label[i], []).get(label[i])!).push(i);
	}
	const seq = Array.from(groups.values()).sort((a, b) => b.length - a.length).flat().concat(loose);
	const total = order.reduce((s, l) => s + weights[l], 0);
	const out = new Array<number>(n).fill(order[0]);
	let li = 0, left = (weights[order[0]] / total) * n;
	for (const cell of seq) {
		while (left < 0.5 && li < order.length - 1) {
			li++;
			left += (weights[order[li]] / total) * n;
		}
		out[cell] = order[li];
		left--;
	}
	return out;
}
