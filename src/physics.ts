/* Brain layout physics: lobes of the brain, and one force-directed step. Pure: no DOM, testable in Node. */

export interface Lobe {
	c: number[];
	r: number[];
	w: number;
	side: number;
}

// Overlapping ellipsoids. side: -1 left hemisphere, 1 right, 0 on the midline.
export const LOBES: Lobe[] = [
	{ c: [-92, -18, 0], r: [150, 120, 130], w: 1.7, side: -1 },
	{ c: [92, -18, 0], r: [150, 120, 130], w: 1.7, side: 1 },
	{ c: [-125, 78, 14], r: [68, 52, 78], w: 0.7, side: -1 },
	{ c: [125, 78, 14], r: [68, 52, 78], w: 0.7, side: 1 },
	{ c: [0, -92, -6], r: [118, 66, 104], w: 0.9, side: 0 },
	{ c: [0, 100, -92], r: [84, 54, 66], w: 0.8, side: 0 },
	{ c: [0, 158, -40], r: [26, 62, 26], w: 0.35, side: 0 },
];
export const LOBE_SUM = LOBES.reduce((s, l) => s + l.w, 0);
export const REACH = 0.9; // radius, as a fraction of the lobe, the outermost node aims for
export const CORE = 0.3; // the innermost node still sits this far out: no dead-centre clump, and the cortex (the outer part) gets its share
export const SPREAD = 0.4; // per-axis spread (std, in lobe units) an even fill of the lobe would show
export const WALL = 0.95; // no node ends a step beyond this (times the fold of the cortex)
export const GAP = 7; // half-width of the longitudinal fissure between hemispheres

// Gyri and sulci: the outline of each lobe wobbles a little, so the shell reads as folded cortex.
export function fold(x: number, y: number, z: number): number {
	return 1 + 0.05 * (Math.sin(x * 0.09) + Math.sin(y * 0.11 + 1.3) + Math.sin(z * 0.1 + 2.1));
}

export interface PhysNode {
	id: number;
	lobe: number;
	side: number;
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	pinned?: boolean; // held in place by the user: it still pushes and pulls the others
}

export type LinkPair = readonly [number, number, ...unknown[]];

const REPEL = 1100, REST = 34;
const BRAIN_VOLUME = 27e6; // all lobes together, in world units cubed

/** Cell size = repulsion cutoff. The brain is a fixed volume, so with more nodes the typical spacing shrinks and a fixed 150 would put every node in range of every other (quadratic). One and a half spacings keep about 100 neighbours per node however many there are. */
export function cellSize(n: number): number {
	const spacing = Math.cbrt(BRAIN_VOLUME / Math.max(1, n));
	return Math.max(24, Math.min(150, 1.6 * spacing));
}
const key = (ix: number, iy: number, iz: number) => ((ix + 512) * 1024 + (iy + 512)) * 1024 + (iz + 512);

/** One step. Cells repel inside a spatial hash, links pull to a rest length, and each cell is held inside its lobe. */
export function simStep(nodes: PhysNode[], edges: ReadonlyArray<LinkPair>, k: number): void {
	const CS = cellSize(nodes.length), CUT2 = CS * CS;
	const grid = new Map<number, PhysNode[]>();
	for (const a of nodes) {
		const kk = key(Math.floor(a.x / CS), Math.floor(a.y / CS), Math.floor(a.z / CS));
		const l = grid.get(kk);
		if (l) l.push(a);
		else grid.set(kk, [a]);
	}
	for (const a of nodes) {
		const ix = Math.floor(a.x / CS), iy = Math.floor(a.y / CS), iz = Math.floor(a.z / CS);
		for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
			const l = grid.get(key(ix + dx, iy + dy, iz + dz));
			if (!l) continue;
			for (const b of l) {
				if (b.id <= a.id) continue;
				const ddx = b.x - a.x, ddy = b.y - a.y, ddz = b.z - a.z, d2 = ddx * ddx + ddy * ddy + ddz * ddz + 1;
				if (d2 > CUT2) continue;
				const f = (REPEL * k) / d2 / Math.sqrt(d2);
				a.vx -= f * ddx; a.vy -= f * ddy; a.vz -= f * ddz;
				b.vx += f * ddx; b.vy += f * ddy; b.vz += f * ddz;
			}
		}
	}
	for (const e of edges) {
		const a = nodes[e[0]], b = nodes[e[1]];
		const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
		const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, f = ((d - REST) * 0.018 * k) / d;
		a.vx += f * dx; a.vy += f * dy; a.vz += f * dz;
		b.vx -= f * dx; b.vy -= f * dy; b.vz -= f * dz;
	}
	// Radial quota: in each lobe the nodes are ranked by how far out they are, and the rank sets a target radius that
	// spreads them evenly through the volume (a share `u` of the nodes lies within radius cbrt(u), lifted off the very centre by CORE). Order is kept, so
	// neighbours stay neighbours; only the use of depth changes. The deepest target is REACH, safely under the shell.
	const qs = new Float64Array(nodes.length), target = new Float64Array(nodes.length), ranks: number[][] = LOBES.map(() => []);
	nodes.forEach((a, i) => {
		const L = LOBES[a.lobe], ex = (a.x - L.c[0]) / L.r[0], ey = (a.y - L.c[1]) / L.r[1], ez = (a.z - L.c[2]) / L.r[2];
		qs[i] = Math.sqrt(ex * ex + ey * ey + ez * ez);
		ranks[a.lobe].push(i);
	});
	// Direction quota: the nodes of a lobe must also cover it side to side. Per axis, the group's spread should reach what an even fill
	// would give; if it does not (they are bunched to one side, or flattened), the group opens up around its own centroid and the
	// centroid drifts back to the middle of the lobe.
	const n3 = LOBES.map(() => 0), mean = LOBES.map(() => [0, 0, 0]), spread = LOBES.map(() => [1, 1, 1]);
	for (const a of nodes) {
		const L = LOBES[a.lobe];
		n3[a.lobe]++;
		for (let k = 0; k < 3; k++) mean[a.lobe][k] += ((k === 0 ? a.x : k === 1 ? a.y : a.z) - L.c[k]) / L.r[k];
	}
	for (let l = 0; l < LOBES.length; l++) if (n3[l]) for (let k = 0; k < 3; k++) mean[l][k] /= n3[l];
	const sd = LOBES.map(() => [0, 0, 0]);
	for (const a of nodes) {
		const L = LOBES[a.lobe];
		for (let k = 0; k < 3; k++) {
			const d = ((k === 0 ? a.x : k === 1 ? a.y : a.z) - L.c[k]) / L.r[k] - mean[a.lobe][k];
			sd[a.lobe][k] += d * d;
		}
	}
	for (let l = 0; l < LOBES.length; l++) if (n3[l] > 1) for (let k = 0; k < 3; k++) spread[l][k] = Math.sqrt(sd[l][k] / n3[l]);
	for (const list of ranks) {
		list.sort((i, j) => qs[i] - qs[j]);
		list.forEach((i, j) => (target[i] = REACH * (CORE + (1 - CORE) * Math.cbrt((j + 0.5) / list.length))));
	}
	nodes.forEach((a, i) => {
		const L = LOBES[a.lobe], q = qs[i], lim = 0.97 * fold(a.x, a.y, a.z);
		if (!a.pinned && n3[a.lobe] > 1) {
			const m = mean[a.lobe], sp = spread[a.lobe], pos = [a.x, a.y, a.z], v = [0, 0, 0];
			for (let k = 0; k < 3; k++) {
				const rel = (pos[k] - L.c[k]) / L.r[k] - m[k]; // where this node sits relative to its group
				if (sp[k] < SPREAD) v[k] += rel * (SPREAD - sp[k]) * 0.12 * L.r[k];
				v[k] -= m[k] * 0.02 * L.r[k]; // the group's centroid eases back to the middle of the lobe
			}
			a.vx += v[0]; a.vy += v[1]; a.vz += v[2];
		}
		if (!a.pinned) {
			const dq = target[i] - q;
			if (q > 0.02) {
				const k = (dq / q) * 0.07;
				a.vx += (a.x - L.c[0]) * k; a.vy += (a.y - L.c[1]) * k; a.vz += (a.z - L.c[2]) * k;
			} else { // dead centre: any direction will do
				a.vx += (Math.random() - 0.5) * 2; a.vy += (Math.random() - 0.5) * 2; a.vz += (Math.random() - 0.5) * 2;
			}
		}
		if (q > lim) {
			const pull = (q - lim) * 0.12;
			a.vx += (L.c[0] - a.x) * pull; a.vy += (L.c[1] - a.y) * pull; a.vz += (L.c[2] - a.z) * pull;
		}
		if (a.pinned) {
			a.vx = a.vy = a.vz = 0;
			return;
		}
		a.vx *= 0.84; a.vy *= 0.84; a.vz *= 0.84;
		a.x += a.vx; a.y += a.vy; a.z += a.vz;
		// Hard wall: a node never ends a step outside the shell, whatever the springs did.
		const wx = (a.x - L.c[0]) / L.r[0], wy = (a.y - L.c[1]) / L.r[1], wz = (a.z - L.c[2]) / L.r[2], wq = Math.sqrt(wx * wx + wy * wy + wz * wz), wall = WALL * fold(a.x, a.y, a.z);
		if (wq > wall) {
			const sc = wall / wq;
			a.x = L.c[0] + (a.x - L.c[0]) * sc; a.y = L.c[1] + (a.y - L.c[1]) * sc; a.z = L.c[2] + (a.z - L.c[2]) * sc;
			a.vx *= 0.5; a.vy *= 0.5; a.vz *= 0.5;
		}
		if (a.side && a.x * a.side < GAP) a.x = a.side * GAP; // keep the hemispheres apart
	});
}
