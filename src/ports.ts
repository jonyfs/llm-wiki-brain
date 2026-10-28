/* Ports: where each link leaves a neuron. Pure geometry, testable in Node. */

export interface Den {
	m: number[];
	t: number[];
	b: number[] | null;
}

export interface PortNode {
	id: number;
	x: number;
	y: number;
	z: number;
	deg: number;
	din?: number; // links that arrive here: only these need dendrites
	den: Den[];
	port: number[]; // how many links leave through each dendrite
}

// a, b, bend, crosses the midline, dendrite used at a, dendrite used at b (the last two are filled in here)
export type PortEdge = [number, number, number, boolean, number, number];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** A fresh dendrite pointing in a random direction, as long as `d`. */
export function reshuffle(d: Den, r: () => number): Den {
	const u = r() * 6.2832, v = r() * 2 - 1, s = Math.sqrt(1 - v * v), len = Math.hypot(d.t[0], d.t[1], d.t[2]);
	return { m: [s * Math.cos(u) * len * 0.45, v * len * 0.45, s * Math.sin(u) * len * 0.45], t: [s * Math.cos(u) * len, v * len, s * Math.sin(u) * len], b: null };
}

/** Busy hubs grow extra branches (cycling through `base`, each pointing somewhere new) until there are `want`. */
export function growDendrites(den: Den[], base: Den[], want: number, r: () => number): void {
	if (!base.length) return;
	for (let i = 0; den.length < want; i++) den.push(reshuffle(base[i % base.length], r));
}

export function wantedDendrites(deg: number, cap = 20): number {
	return Math.min(cap, Math.ceil(deg * 1.0));
}

/**
 * Every link gets a dendrite at each end: the one that points most toward the other cell, penalised by how many
 * links it already carries. Fills `e[4]`, `e[5]` and `n.port`.
 */
export const AXON_TIPS = 3;

/** `isOut(edge, node)`: the link leaves this node, so it starts on an axon terminal (stored as -1 - tip) instead of a dendrite. */
export function assignPorts(nodes: PortNode[], edges: PortEdge[], grow: (n: PortNode, want: number) => void, isOut?: (edge: number, node: number) => boolean): void {
	const inc: number[][] = nodes.map(() => []);
	edges.forEach((e, i) => {
		inc[e[0]].push(i);
		inc[e[1]].push(i);
	});
	for (const n of nodes) {
		const want = wantedDendrites(n.din ?? n.deg);
		if (n.den.length < want) grow(n, want);
		const load = new Array<number>(n.den.length).fill(0);
		const units = n.den.map((d) => {
			const l = Math.hypot(d.t[0], d.t[1], d.t[2]) || 1;
			return [d.t[0] / l, d.t[1] / l, d.t[2] / l];
		});
		let outN = 0;
		for (const ei of inc[n.id]) {
			if (isOut?.(ei, n.id)) {
				const tip = -1 - (outN++ % AXON_TIPS);
				if (edges[ei][0] === n.id) edges[ei][4] = tip;
				else edges[ei][5] = tip;
				continue;
			}
			const e = edges[ei], other = nodes[e[0] === n.id ? e[1] : e[0]];
			const dx = other.x - n.x, dy = other.y - n.y, dz = other.z - n.z, dl = Math.hypot(dx, dy, dz) || 1;
			let best = 0, bs = -1e9;
			for (let d = 0; d < units.length; d++) {
				const sc = (units[d][0] * dx + units[d][1] * dy + units[d][2] * dz) / dl - 0.3 * load[d];
				if (sc > bs) {
					bs = sc;
					best = d;
				}
			}
			load[best]++;
			if (e[0] === n.id) e[4] = best;
			else e[5] = best;
		}
		n.port = load;
	}
}

/**
 * The link as a cubic. `A` holds, per edge, [x, y, outX, outY] of the dendrite tip at each end (8 numbers from `o`).
 * It leaves each tip along its branch (long when the branch points at the other cell, short when it points away,
 * so the link turns early instead of looping), then bends by `bend`. Returns x0, y0, c1x, c1y, c2x, c2y, x1, y1.
 */
export function edgeCurve(A: ArrayLike<number>, o: number, fwd: boolean, bend: number): number[] {
	const a = fwd ? o : o + 4, b = fwd ? o + 4 : o;
	const x0 = A[a], y0 = A[a + 1], x1 = A[b], y1 = A[b + 1];
	const L = Math.hypot(x1 - x0, y1 - y0) || 1, k = (fwd ? 1 : -1) * bend * L * 0.9;
	const ux = (x1 - x0) / L, uy = (y1 - y0) / L, px = -uy, py = ux;
	const ta = L * (0.08 + 0.34 * clamp(A[a + 2] * ux + A[a + 3] * uy, 0, 1));
	const tb = L * (0.08 + 0.34 * clamp(-(A[b + 2] * ux + A[b + 3] * uy), 0, 1));
	return [x0, y0, x0 + A[a + 2] * ta + px * k, y0 + A[a + 3] * ta + py * k, x1 + A[b + 2] * tb + px * k, y1 + A[b + 3] * tb + py * k, x1, y1];
}

/**
 * The direction (unit vector, in the cell's own frame) with the most room around it: the one farthest from every
 * dendrite. The axon leaves there, so it never runs through a branch.
 */
export function freeDirection(den: Den[], samples = 64): [number, number, number] {
	const units = den.map((d) => {
		const l = Math.hypot(d.t[0], d.t[1], d.t[2]) || 1;
		return [d.t[0] / l, d.t[1] / l, d.t[2] / l];
	});
	let best: [number, number, number] = [0, 1, 0], bs = -1;
	const g = Math.PI * (3 - Math.sqrt(5)); // golden angle: evenly spread points on the sphere
	for (let i = 0; i < samples; i++) {
		const y = 1 - (2 * (i + 0.5)) / samples, r = Math.sqrt(1 - y * y), th = g * i;
		const v: [number, number, number] = [Math.cos(th) * r, y, Math.sin(th) * r];
		let nearest = 2; // angle to the closest dendrite (as 1 - cos, bigger = farther)
		for (const u of units) nearest = Math.min(nearest, 1 - (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]));
		if (units.length === 0) nearest = 1;
		if (nearest > bs) {
			bs = nearest;
			best = v;
		}
	}
	return best;
}
