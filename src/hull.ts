/* Convex hull of screen points (Andrew's monotone chain). Pure. */

export function convexHull(pts: [number, number][]): [number, number][] {
	const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	if (p.length < 3) return p;
	const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
	const lower: [number, number][] = [];
	for (const q of p) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
		lower.push(q);
	}
	const upper: [number, number][] = [];
	for (let i = p.length - 1; i >= 0; i--) {
		const q = p[i];
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
		upper.push(q);
	}
	lower.pop();
	upper.pop();
	return lower.concat(upper);
}

/** Nearest neighbour in a direction: the candidate whose offset from `from` lines up best with (dx, dy), or null when none points that way. */
export function neighbourInDirection(from: [number, number], cands: { id: number; x: number; y: number }[], dx: number, dy: number): number | null {
	let best: number | null = null, bs = 0.3; // at least ~72 degrees of agreement
	for (const c of cands) {
		const ox = c.x - from[0], oy = c.y - from[1], l = Math.hypot(ox, oy);
		if (!l) continue;
		const sc = (ox * dx + oy * dy) / l;
		if (sc > bs) {
			bs = sc;
			best = c.id;
		}
	}
	return best;
}
