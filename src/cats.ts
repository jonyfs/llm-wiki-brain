/* Colour-by and size-by: which of the four palette colours a page takes, and how big it is drawn. Pure. */

export type ColorMode = "type" | "folder" | "tag" | "age" | "degree";
export type SizeMode = "same" | "degree" | "recent";

export interface CatPage {
	path: string;
	folder: string;
	tags: string[];
	mtime: number;
	deg: number;
}

/** Category 0..3 per page, and the four legend labels (a leading "@" marks a translation key). */
export function colorCats(mode: ColorMode, pages: CatPage[]): { cat: Map<string, number>; labels: string[] } | null {
	if (mode === "type") return null;
	const cat = new Map<string, number>();
	if (mode === "folder" || mode === "tag") {
		const count = new Map<string, number>();
		for (const p of pages) for (const k of mode === "folder" ? (p.folder ? [p.folder] : []) : p.tags) count.set(k, (count.get(k) ?? 0) + 1);
		const top = Array.from(count.entries()).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3).map(([k]) => k);
		for (const p of pages) {
			const mine = mode === "folder" ? [p.folder] : p.tags;
			const at = top.findIndex((k) => mine.includes(k));
			cat.set(p.path, at >= 0 ? at : 3);
		}
		const labels = top.slice();
		while (labels.length < 3) labels.push("");
		labels.push("@legend.other");
		return { cat, labels };
	}
	if (mode === "age") {
		const sorted = pages.map((p) => p.mtime).sort((a, b) => b - a);
		const q = (f: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * f))] ?? 0;
		const c1 = q(0.25), c2 = q(0.5), c3 = q(0.75);
		for (const p of pages) cat.set(p.path, p.mtime >= c1 ? 0 : p.mtime >= c2 ? 1 : p.mtime >= c3 ? 2 : 3);
		return { cat, labels: ["@legend.age.0", "@legend.age.1", "@legend.age.2", "@legend.age.3"] };
	}
	for (const p of pages) cat.set(p.path, p.deg >= 8 ? 0 : p.deg >= 4 ? 1 : p.deg >= 1 ? 2 : 3);
	return { cat, labels: ["@legend.deg.0", "@legend.deg.1", "@legend.deg.2", "@legend.deg.3"] };
}

/** Size multiplier per page, 0.8 to 1.9; null for "same". */
export function sizeFactors(mode: SizeMode, pages: CatPage[], now: number): Map<string, number> | null {
	if (mode === "same" || !pages.length) return null;
	const out = new Map<string, number>();
	if (mode === "degree") {
		const max = Math.max(1, ...pages.map((p) => p.deg));
		for (const p of pages) out.set(p.path, 0.8 + 1.1 * Math.sqrt(p.deg / max));
		return out;
	}
	for (const p of pages) {
		const days = Math.max(0, (now - p.mtime) / 86400000);
		out.set(p.path, 0.8 + 1.1 * Math.exp(-days / 30)); // edited today: 1.9, a month ago: about 1.2, a year ago: 0.8
	}
	return out;
}
