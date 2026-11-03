/* The brain's cloud: each lobe is a swarm of soft puffs in 3D instead of one flat ellipse. Pure: no DOM, testable in Node. */
import { rng } from "./rand";
import type { Lobe } from "./physics";

/** One puff: world position, radius in world units, and its own opacity (1 = the strongest). */
export interface Puff {
	x: number;
	y: number;
	z: number;
	r: number;
	a: number;
	/** Outward direction of a shell puff (unit length); (0,0,0) for an inner puff. Lets the renderer light the side that faces the light. */
	nx: number;
	ny: number;
	nz: number;
	/** Index of the lobe it belongs to, so the renderer can tint it by what the lobe holds. */
	lobe: number;
}

/**
 * Puffs scattered through a lobe's ellipsoid, more of them near the surface than in the middle (the cortex is thicker than the
 * core), with uneven sizes so the outline is lumpy like folded cortex. Seeded: the same lobe always gives the same cloud.
 */
export function lobePuffs(L: Lobe, count: number, seed: number, lobe = 0): Puff[] {
	const r = rng(seed), out: Puff[] = [];
	for (let i = 0; i < count; i++) {
		const u = r() * 6.2832, v = r() * 2 - 1, s = Math.sqrt(1 - v * v);
		const shell = r() < 0.7;
		const k = shell ? 0.78 + r() * 0.22 : Math.cbrt(r()) * 0.75; // fraction of the way out to the surface
		const size = Math.min(L.r[0], L.r[1], L.r[2]) * (0.24 + r() * 0.24) * (shell ? 1 : 1.3); // inner puffs are bigger and fainter
		const nl = Math.hypot(s * Math.cos(u) / L.r[0], s * Math.sin(u) / L.r[1], v / L.r[2]) || 1; // ellipsoid normal, not the sphere's
		const nx = shell ? (s * Math.cos(u)) / L.r[0] / nl : 0, ny = shell ? (s * Math.sin(u)) / L.r[1] / nl : 0, nz = shell ? v / L.r[2] / nl : 0;
		out.push({ lobe, nx, ny, nz, x: L.c[0] + L.r[0] * s * Math.cos(u) * k, y: L.c[1] + L.r[1] * s * Math.sin(u) * k, z: L.c[2] + L.r[2] * v * k, r: size, a: shell ? 0.8 + r() * 0.2 : 0.4 + r() * 0.3 });
	}
	return out;
}

/** Puffs for every lobe; a lobe's share follows its size so the density looks even from one lobe to the next. */
export function brainPuffs(lobes: Lobe[], perUnit: number, seed = 0x5eed): Puff[] {
	const out: Puff[] = [];
	lobes.forEach((L, i) => {
		const vol = (L.r[0] * L.r[1] * L.r[2]) / (150 * 120 * 130); // 1 for the biggest lobe
		out.push(...lobePuffs(L, Math.max(8, Math.round(perUnit * Math.cbrt(vol) * 1.5)), seed + i * 977, i));
	});
	return out;
}

/**
 * The longitudinal fissure: a line of small puffs in the mid-plane (x = 0) following the outline of the hemispheres, drawn dark so a
 * crease runs between them. Built from the two biggest lobes: the ellipse in y and z they share at the middle.
 */
export function fissurePuffs(lobes: Lobe[]): Puff[] {
	const hemis = lobes.filter((l) => l.side !== 0).sort((a, b) => b.r[0] * b.r[1] * b.r[2] - a.r[0] * a.r[1] * a.r[2]);
	if (!hemis.length) return [];
	const H = hemis[0], out: Puff[] = [];
	for (let i = 0; i < 40; i++) {
		const t = (i / 40) * 6.2832;
		out.push({ lobe: 0, x: 0, y: H.c[1] + H.r[1] * 0.95 * Math.sin(t), z: H.c[2] + H.r[2] * 0.95 * Math.cos(t), r: 9, a: 0.55, nx: 0, ny: 0, nz: 0 });
	}
	return out;
}
