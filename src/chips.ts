/* The filters that are on, as a list the view shows as removable chips. Pure. */

export interface ChipFilters {
	folder: string;
	tag: string;
	minDeg: number;
	maxDeg: number;
	orphansOnly: boolean;
	days: number;
	createdDays: number;
	invert: boolean;
	op: string;
	dir: string;
	hidden: string[];
}

export type ChipKey = "folder" | "tag" | "minDeg" | "maxDeg" | "orphansOnly" | "days" | "createdDays" | "invert" | "op" | "dir" | "hidden" | "hood" | "extra" | "isolate";

export interface Chip {
	key: ChipKey;
	value: string;
}

/** One chip per active filter, in a stable order. `hood` is the isolated neighbourhood's page, `extra` the filter query, `isolate` a count. */
export function activeChips(f: ChipFilters, hood: string | null, extra: string, isolate: number): Chip[] {
	const out: Chip[] = [];
	if (f.folder) out.push({ key: "folder", value: f.folder });
	if (f.tag) out.push({ key: "tag", value: f.tag });
	if (f.op) out.push({ key: "op", value: f.op });
	if (f.minDeg) out.push({ key: "minDeg", value: String(f.minDeg) });
	if (f.maxDeg) out.push({ key: "maxDeg", value: String(f.maxDeg) });
	if (f.orphansOnly) out.push({ key: "orphansOnly", value: "" });
	if (f.days) out.push({ key: "days", value: String(f.days) });
	if (f.createdDays) out.push({ key: "createdDays", value: String(f.createdDays) });
	if (f.dir) out.push({ key: "dir", value: f.dir });
	if (f.invert) out.push({ key: "invert", value: "" });
	if (f.hidden.length) out.push({ key: "hidden", value: f.hidden.join(", ") });
	if (hood) out.push({ key: "hood", value: hood.split("/").pop()?.replace(/\.md$/, "") ?? hood });
	if (extra.trim()) out.push({ key: "extra", value: extra.trim() });
	if (isolate > 0) out.push({ key: "isolate", value: String(isolate) });
	return out;
}

/** The filters with the one behind `chip` reset (hidden types and the neighbourhood are handled by the caller). */
export function withoutChip<T extends ChipFilters>(f: T, key: ChipKey): T {
	const next = { ...f };
	switch (key) {
		case "folder": next.folder = ""; break;
		case "tag": next.tag = ""; break;
		case "op": next.op = ""; break;
		case "minDeg": next.minDeg = 0; break;
		case "maxDeg": next.maxDeg = 0; break;
		case "orphansOnly": next.orphansOnly = false; break;
		case "days": next.days = 0; break;
		case "createdDays": next.createdDays = 0; break;
		case "dir": next.dir = ""; break;
		case "invert": next.invert = false; break;
		case "hidden": next.hidden = []; break;
		default: break;
	}
	return next;
}
