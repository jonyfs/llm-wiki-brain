/* Neuron drawing geometry. Pure: no DOM, testable in Node. Curves are in screen space; arbors and marks are in the cell's own frame. */

import { Den, Kid, perpendicular } from "./ports";

/** n+1 points along a quadratic curve, flat [x0, y0, x1, y1, ...]. */
export function quadPoints(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n: number): number[] {
	const out: number[] = [];
	for (let i = 0; i <= n; i++) {
		const t = i / n, u = 1 - t;
		out.push(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1);
	}
	return out;
}

/**
 * A branch that narrows from width w0 to w1 along `pts` ([x, y, ...]), as one closed polygon
 * (left edge out, right edge back). Fewer than two points gives nothing.
 */
export function taperStrip(pts: number[], w0: number, w1: number): number[] {
	const n = pts.length / 2;
	if (n < 2) return [];
	const left: number[] = [], right: number[] = [];
	for (let i = 0; i < n; i++) {
		const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
		let dx = pts[b * 2] - pts[a * 2], dy = pts[b * 2 + 1] - pts[a * 2 + 1];
		const l = Math.hypot(dx, dy) || 1;
		dx /= l;
		dy /= l;
		const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
		left.push(pts[i * 2] - dy * w, pts[i * 2 + 1] + dx * w);
		right.push(pts[i * 2] + dy * w, pts[i * 2 + 1] - dx * w);
	}
	const out = left.slice();
	for (let i = n - 1; i >= 0; i--) out.push(right[i * 2], right[i * 2 + 1]);
	return out;
}

/**
 * Radius multipliers around the soma, `n` of them. A cell body is not a circle: it is pulled out toward the points
 * where the main dendrites leave it (`angles`, screen radians), with a slight fold of its own.
 */
export function somaRadii(angles: number[], n: number): number[] {
	const out: number[] = [];
	for (let i = 0; i < n; i++) {
		const th = (i / n) * 2 * Math.PI;
		let k = 1 + 0.05 * Math.sin(th * 3 + 1.3) + 0.04 * Math.sin(th * 5 + 0.4);
		for (const a of angles) {
			let d = Math.abs(((th - a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
			if (d > Math.PI) d = 2 * Math.PI - d;
			k += 0.26 * Math.exp(-(d * d) / 0.09);
		}
		out.push(k);
	}
	return out;
}

/* ---- dendritic arbor (the J2 look): side branches in 3D, each child 63% as thick as its parent (Rall) ---- */

const dist3 = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const unit3 = (v: number[]): number[] => {
	const l = Math.hypot(v[0], v[1], v[2]) || 1;
	return [v[0] / l, v[1] / l, v[2] / l];
};

/** Point `u` (0..1) along the quadratic a-c-b. */
export function quadAt(a: number[], c: number[], b: number[], u: number): number[] {
	const v = 1 - u;
	return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1], v * v * a[2] + 2 * v * u * c[2] + u * u * b[2]];
}

/** Unit direction of the quadratic a-c-b at `u`. */
export function quadDir(a: number[], c: number[], b: number[], u: number): number[] {
	const v = 1 - u;
	return unit3([2 * v * (c[0] - a[0]) + 2 * u * (b[0] - c[0]), 2 * v * (c[1] - a[1]) + 2 * u * (b[1] - c[1]), 2 * v * (c[2] - a[2]) + 2 * u * (b[2] - c[2])]);
}

/** The control point of primary dendrite `d` (from the soma centre to `d.t`): the middle bowed sideways in 3D, so it bends with the brain. */
export function denControl(d: { m: number[]; t: number[] }, i: number): number[] {
	const p = perpendicular(unit3(d.t), i * 2.399963), k = 0.3 * dist3(d.t, d.m);
	return [d.m[0] + p[0] * k, d.m[1] + p[1] * k, d.m[2] + p[2] * k];
}

/**
 * Grows the side branches of primary dendrite `d` (index `i`): up to `maxLvl` levels, at most `cap` branches in all.
 * `forkP` is how branchy the cell type is (0..1). `r` is a seeded generator, so a page always grows the same tree.
 */
export function arborize(d: Den, i: number, forkP: number, r: () => number, maxLvl = 3, cap = 9): Kid[] {
	const kids: Kid[] = [];
	const grow = (a: number[], c: number[], b: number[], lvl: number): void => {
		const len = dist3(a, b);
		if (lvl >= maxLvl || len < 0.8 || kids.length >= cap) return;
		const nk = lvl === 0 ? (r() < forkP ? 2 : r() < 0.6 ? 1 : 0) : r() < forkP * 0.8 ? 2 : 1;
		for (let k = 0; k < nk && kids.length < cap; k++) {
			const u = (lvl === 0 ? 0.42 : 0.55) + r() * 0.3 + k * 0.12, at = quadAt(a, c, b, Math.min(u, 0.9)), tg = quadDir(a, c, b, Math.min(u, 0.9));
			const side = perpendicular(tg, r() * 6.2832), ang = 0.4 + r() * 0.5, ca = Math.cos(ang), sa = Math.sin(ang);
			const dir = unit3([tg[0] * ca + side[0] * sa, tg[1] * ca + side[1] * sa, tg[2] * ca + side[2] * sa]);
			const cl = len * (0.5 + r() * 0.22), end = [at[0] + dir[0] * cl, at[1] + dir[1] * cl, at[2] + dir[2] * cl];
			const bow = perpendicular(dir, r() * 6.2832), ctrl = [at[0] + dir[0] * cl * 0.5 + bow[0] * cl * 0.12, at[1] + dir[1] * cl * 0.5 + bow[1] * cl * 0.12, at[2] + dir[2] * cl * 0.5 + bow[2] * cl * 0.12];
			kids.push({ a: at, c: ctrl, b: end, lvl: lvl + 1, wr: Math.pow(0.63, lvl + 1) });
			grow(at, ctrl, end, lvl + 1);
		}
	};
	grow([0, 0, 0], denControl(d, i), d.t, 0);
	return kids;
}

/* ---- type marks: a second signal besides colour, small and inside the soma ---- */

export type MarkKind = "circle" | "square" | "diamond" | "triangle";

/** The mark of each page type, in the order of the plugin's types (source, entity, concept, synthesis). */
export const MARK_OF: Record<string, MarkKind> = { source: "circle", entity: "square", concept: "diamond", synthesis: "triangle" };

/** A mark as a closed polygon, flat [x, y, ...], centred on 0 and fitting inside radius `r`. */
export function markPoly(kind: MarkKind, r: number): number[] {
	const out: number[] = [];
	if (kind === "circle") for (let i = 0; i < 14; i++) out.push(Math.cos((i / 14) * 6.2832) * r, Math.sin((i / 14) * 6.2832) * r);
	else if (kind === "diamond") out.push(0, -r, r, 0, 0, r, -r, 0);
	else if (kind === "triangle") out.push(0, -r, r * 0.866, r * 0.5, -r * 0.866, r * 0.5);
	else { // rounded square: four corners of three points
		const h = r * 0.78, c = r * 0.28;
		for (const [sx, sy] of [[1, -1], [1, 1], [-1, 1], [-1, -1]]) out.push(sx * (h - c), sy * h, sx * (h - c * 0.3), sy * (h - c * 0.3), sx * h, sy * (h - c));
	}
	return out;
}
