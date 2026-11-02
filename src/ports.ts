/* Ports: where each link leaves a neuron. Pure geometry, testable in Node. */

/** A side branch of a dendrite, in the cell's own 3D frame: where it starts on its parent, its control point and its end. `wr` is its starting width as a share of the primary's (Rall: 0.63 per level). */
export interface Kid {
	a: number[];
	c: number[];
	b: number[];
	lvl: number;
	wr: number;
}

export interface Den {
	m: number[];
	t: number[];
	b: number[] | null;
	kids?: Kid[]; // decorative branching, grown the first time the cell is drawn in detail; ports only ever use the primary tip `t`
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
	axon?: number[]; // unit direction (cell frame) the axon leaves in
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
		if (isOut) { // the axon leaves facing the pages this cell links to
			const aim: number[][] = [];
			for (const ei of inc[n.id]) {
				if (!isOut(ei, n.id)) continue;
				const e = edges[ei], o = nodes[e[0] === n.id ? e[1] : e[0]], dx = o.x - n.x, dy = o.y - n.y, dz = o.z - n.z, dl = Math.hypot(dx, dy, dz) || 1;
				aim.push([dx / dl, dy / dl, dz / dl]);
			}
			n.axon = axonDirection(n.den, aim);
		}
		const units = n.den.map((d) => {
			const l = Math.hypot(d.t[0], d.t[1], d.t[2]) || 1;
			return [d.t[0] / l, d.t[1] / l, d.t[2] / l];
		});
		const tipDirs = axonTipDirs(n.axon ?? [0, 1, 0], n.id), tipLoad = new Array<number>(AXON_TIPS).fill(0);
		for (const ei of inc[n.id]) {
			if (isOut?.(ei, n.id)) { // each terminal of the axon serves the page it points toward
				const o = nodes[edges[ei][0] === n.id ? edges[ei][1] : edges[ei][0]], dx = o.x - n.x, dy = o.y - n.y, dz = o.z - n.z, dl = Math.hypot(dx, dy, dz) || 1;
				let bt = 0, bts = -1e9;
				for (let t = 0; t < AXON_TIPS; t++) {
					const sc = (tipDirs[t][0] * dx + tipDirs[t][1] * dy + tipDirs[t][2] * dz) / dl - 0.3 * tipLoad[t];
					if (sc > bts) { bts = sc; bt = t; }
				}
				tipLoad[bt]++;
				if (edges[ei][0] === n.id) edges[ei][4] = -1 - bt;
				else edges[ei][5] = -1 - bt;
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
 * so the link turns early instead of looping), then bends by (bx, by): the screen projection of the link's 3D bulge
 * (see `edgeBend`), so the same curve is drawn whichever end it is traversed from. Returns x0, y0, c1x, c1y, c2x, c2y, x1, y1.
 */
export function edgeCurve(A: ArrayLike<number>, o: number, fwd: boolean, bx: number, by: number): number[] {
	const a = fwd ? o : o + 4, b = fwd ? o + 4 : o;
	const x0 = A[a], y0 = A[a + 1], x1 = A[b], y1 = A[b + 1];
	const L = Math.hypot(x1 - x0, y1 - y0) || 1;
	const ux = (x1 - x0) / L, uy = (y1 - y0) / L;
	const ta = L * (0.08 + 0.34 * clamp(A[a + 2] * ux + A[a + 3] * uy, 0, 1));
	const tb = L * (0.08 + 0.34 * clamp(-(A[b + 2] * ux + A[b + 3] * uy), 0, 1));
	return [x0, y0, x0 + A[a + 2] * ta + bx, y0 + A[a + 3] * ta + by, x1 + A[b + 2] * tb + bx, y1 + A[b + 3] * tb + by, x1, y1];
}

/** A stable pseudo-random angle in [0, 2π) from an integer: which way around the chord a link bulges, or around the axis an axon leans. */
export function phiOf(i: number, salt = 0): number {
	return (((Math.imul(i + 1, 2654435761) ^ Math.imul(salt + 7, 1597334677)) >>> 0) / 4294967296) * 2 * Math.PI;
}

/** A unit vector perpendicular to the unit vector `a`, turned by `phi` around it. Deterministic; uses world up as the reference unless `a` is nearly vertical. */
export function perpendicular(a: ArrayLike<number>, phi: number): [number, number, number] {
	const hx = Math.abs(a[1]) > 0.9 ? 1 : 0, hy = hx ? 0 : 1;
	let ux = -a[2] * hy, uy = a[2] * hx, uz = a[0] * hy - a[1] * hx;
	const ul = Math.hypot(ux, uy, uz) || 1;
	ux /= ul; uy /= ul; uz /= ul;
	const vx = a[1] * uz - a[2] * uy, vy = a[2] * ux - a[0] * uz, vz = a[0] * uy - a[1] * ux; // a × u
	const c = Math.cos(phi), s = Math.sin(phi);
	return [c * ux + s * vx, c * uy + s * vy, c * uz + s * vz];
}

/**
 * Where a link bulges, on screen. The bulge is a 3D vector perpendicular to the chord (`dx, dy, dz` in world units) of
 * length `bend` times the chord, pointing around the chord by `phi`; `rot` projects a direction (the camera rotation, no
 * perspective) and `scale` is screen pixels per world unit. A bulge pointing at the viewer vanishes, one across the view
 * shows in full: the link turns with the brain instead of staying on one side of the screen chord.
 */
export function edgeBend(dx: number, dy: number, dz: number, phi: number, bend: number, rot: (v: number[]) => [number, number], scale: number): [number, number] {
	const L = Math.hypot(dx, dy, dz);
	if (L < 1e-9) return [0, 0];
	const n = perpendicular([dx / L, dy / L, dz / L], phi), [rx, ry] = rot(n), m = clamp(Math.abs(bend) * 0.9, 0, 0.45) * L * scale;
	return [rx * m, ry * m];
}

/* ---- the axon, in the cell's own 3D frame (units of the soma radius) ---- */

const norm3 = (x: number, y: number, z: number): [number, number, number] => {
	const l = Math.hypot(x, y, z) || 1;
	return [x / l, y / l, z / l];
};

/** The directions of the AXON_TIPS terminals: straight on, and two leaning to either side around the axis. */
export function axonTipDirs(axon: ArrayLike<number>, id: number): [number, number, number][] {
	const p = perpendicular(axon, phiOf(id, 3));
	return [
		[axon[0], axon[1], axon[2]],
		norm3(axon[0] * 0.8 + p[0] * 0.7, axon[1] * 0.8 + p[1] * 0.7, axon[2] * 0.8 + p[2] * 0.7),
		norm3(axon[0] * 0.8 - p[0] * 0.7, axon[1] * 0.8 - p[1] * 0.7, axon[2] * 0.8 - p[2] * 0.7),
	];
}

export interface AxonShape {
	h: number[]; // hillock: where the cone ends and the trunk starts
	c: number[]; // control point of the trunk's quadratic
	e: number[]; // end of the trunk (the straight-on terminal)
	b: number[]; // where the side branches leave the trunk
	tips: number[][]; // terminal positions: end, then the two side ones
	dirs: number[][]; // the way each terminal points
}

/** The axon as 3D points around the soma centre, in soma radii: hillock, a trunk that leans a little to one side, three terminals. */
export function axonShape(axon: ArrayLike<number>, id: number): AxonShape {
	const a = [axon[0], axon[1], axon[2]], p = perpendicular(a, phiOf(id, 3));
	const h = a.map((v) => v * 1.7), e = a.map((v) => v * 6), c = a.map((v, i) => v * 3.85 + p[i] * 0.9);
	const t = 0.72, u = 1 - t, b = a.map((_, i) => u * u * h[i] + 2 * u * t * c[i] + t * t * e[i]);
	const side = (sd: number) => b.map((v, i) => v + a[i] * 1.2 + p[i] * 1.1 * sd);
	const t1 = side(1), t2 = side(-1);
	const end = norm3(e[0] - c[0], e[1] - c[1], e[2] - c[2]);
	return {
		h, c, e, b, tips: [e, t1, t2],
		dirs: [[end[0], end[1], end[2]], norm3(t1[0] - b[0], t1[1] - b[1], t1[2] - b[2]), norm3(t2[0] - b[0], t2[1] - b[1], t2[2] - b[2])],
	};
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

/**
 * Where the axon leaves: as close as it can get to the mean direction of the cells it links to, but never on top of
 * a dendrite (a branch that already points that way keeps it; the axon takes the nearest clear side). With no
 * targets it takes the freest direction, as before.
 */
export function axonDirection(den: Den[], targets: number[][], samples = 96): [number, number, number] {
	if (!targets.length) return freeDirection(den);
	const units = den.map((d) => {
		const l = Math.hypot(d.t[0], d.t[1], d.t[2]) || 1;
		return [d.t[0] / l, d.t[1] / l, d.t[2] / l];
	});
	let best: [number, number, number] = [0, 1, 0], bs = -1e9;
	const g = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < samples; i++) {
		const y = 1 - (2 * (i + 0.5)) / samples, r = Math.sqrt(1 - y * y), th = g * i;
		const v: [number, number, number] = [Math.cos(th) * r, y, Math.sin(th) * r];
		let aim = 0;
		for (const t of targets) aim += t[0] * v[0] + t[1] * v[1] + t[2] * v[2];
		aim /= targets.length;
		let room = 2; // 1 - cos to the nearest dendrite: 0 means on top of it
		for (const u of units) room = Math.min(room, 1 - (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]));
		const score = aim - (room < 0.3 ? (0.3 - room) * 2.5 : 0);
		if (score > bs) {
			bs = score;
			best = v;
		}
	}
	return best;
}
