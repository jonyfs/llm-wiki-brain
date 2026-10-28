/* Neuron drawing geometry. Pure: no DOM, testable in Node. Everything is in screen space. */

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
