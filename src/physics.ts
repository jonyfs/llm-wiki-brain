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
export const FILL = 0.72; // target rms radius of the nodes of a lobe, as a fraction of its radius
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

const REPEL = 1100, CS = 150, CUT2 = CS * CS, REST = 34;
const key = (ix: number, iy: number, iz: number) => ((ix + 512) * 1024 + (iy + 512)) * 1024 + (iz + 512);

/** One step. Cells repel inside a spatial hash, links pull to a rest length, and each cell is held inside its lobe. */
export function simStep(nodes: PhysNode[], edges: ReadonlyArray<LinkPair>, k: number): void {
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
	// How far out each lobe's nodes sit on average (1 = the shell). Uniform fill of a ball gives about 0.77.
	const sum = new Float64Array(LOBES.length), cnt = new Float64Array(LOBES.length);
	for (const a of nodes) {
		const L = LOBES[a.lobe], ex = (a.x - L.c[0]) / L.r[0], ey = (a.y - L.c[1]) / L.r[1], ez = (a.z - L.c[2]) / L.r[2];
		sum[a.lobe] += ex * ex + ey * ey + ez * ez;
		cnt[a.lobe]++;
	}
	const rms = LOBES.map((_, i) => (cnt[i] ? Math.sqrt(sum[i] / cnt[i]) : 1));
	for (const a of nodes) {
		const L = LOBES[a.lobe];
		const ex = (a.x - L.c[0]) / L.r[0], ey = (a.y - L.c[1]) / L.r[1], ez = (a.z - L.c[2]) / L.r[2];
		const q = Math.sqrt(ex * ex + ey * ey + ez * ez), lim = 0.97 * fold(a.x, a.y, a.z);
		const r = rms[a.lobe];
		if (r < FILL && !a.pinned) { // the lobe is under-used: every node in it drifts outward until the group spans the volume
			const out = (FILL - r) * 0.06;
			a.vx += (a.x - L.c[0]) * out; a.vy += (a.y - L.c[1]) * out; a.vz += (a.z - L.c[2]) * out;
		}
		if (q > lim) {
			const pull = (q - lim) * 0.12;
			a.vx += (L.c[0] - a.x) * pull; a.vy += (L.c[1] - a.y) * pull; a.vz += (L.c[2] - a.z) * pull;
		}
		if (a.pinned) {
			a.vx = a.vy = a.vz = 0;
			continue;
		}
		a.vx *= 0.84; a.vy *= 0.84; a.vz *= 0.84;
		a.x += a.vx; a.y += a.vy; a.z += a.vz;
		if (a.side && a.x * a.side < GAP) a.x = a.side * GAP; // keep the hemispheres apart
	}
}
