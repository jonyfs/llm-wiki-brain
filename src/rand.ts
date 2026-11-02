/* Small deterministic randomness. Pure: no DOM, testable in Node. */

/** FNV-1a: a 32-bit hash of a string. */
export function hashStr(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** A seeded generator of numbers in [0, 1) (mulberry32). */
export function rng(seed: number): () => number {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A cell's drift: amplitude 1.5 to 3 world units, a different slow rhythm (12 to 25 s) on each axis, from the page path. */
export function makeDrift(path: string): Float64Array {
	const r = rng(hashStr(path) ^ 0x2545f491), w = () => (2 * Math.PI) / (12000 + r() * 13000);
	return Float64Array.of(1.5 + r() * 1.5, w(), w(), w(), r() * 6.2832, r() * 6.2832, r() * 6.2832);
}
