/* Saved views: a name, the filters and the search that were on screen. Pure, testable in Node. */

export interface SavedView {
	name: string;
	query: string;
	filters: Record<string, unknown>;
}

export const MAX_VIEWS = 20;

/** How the view was left: reopened as it was, so a working cut of the vault does not have to be rebuilt every day. */
export interface LastView {
	filters: Record<string, unknown>;
	q: string;
	extra: string;
	hide: boolean;
	color: string;
	size: string;
}

/** Whatever was stored, as a LastView or null. Text is capped; anything that is not the right shape is dropped. */
export function cleanLastView(raw: unknown): LastView | null {
	if (!raw || typeof raw !== "object") return null;
	const v = raw as Partial<LastView>;
	if (!v.filters || typeof v.filters !== "object" || Array.isArray(v.filters)) return null;
	return {
		filters: { ...(v.filters as Record<string, unknown>) },
		q: typeof v.q === "string" ? v.q.slice(0, 300) : "",
		extra: typeof v.extra === "string" ? v.extra.slice(0, 300) : "",
		hide: v.hide === true,
		color: typeof v.color === "string" ? v.color : "type",
		size: typeof v.size === "string" ? v.size : "same",
	};
}

/** Whatever was stored, as a clean list: objects with a name, filters as an object, at most MAX_VIEWS, no repeated names. */
export function cleanViews(raw: unknown): SavedView[] {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>(), out: SavedView[] = [];
	for (const item of raw as unknown[]) {
		if (!item || typeof item !== "object") continue;
		const v = item as { name?: unknown; query?: unknown; filters?: unknown };
		const name = typeof v.name === "string" ? v.name.trim().slice(0, 40) : "";
		if (!name || seen.has(name.toLowerCase())) continue;
		seen.add(name.toLowerCase());
		out.push({ name, query: typeof v.query === "string" ? v.query : "", filters: v.filters && typeof v.filters === "object" && !Array.isArray(v.filters) ? { ...(v.filters as Record<string, unknown>) } : {} });
		if (out.length >= MAX_VIEWS) break;
	}
	return out;
}

/** Adds a view, or replaces the one with the same name (case-insensitive). The newest goes first. Empty names change nothing. */
export function saveView(list: SavedView[], view: SavedView): SavedView[] {
	const name = view.name.trim().slice(0, 40);
	if (!name) return list;
	const rest = list.filter((v) => v.name.toLowerCase() !== name.toLowerCase());
	return cleanViews([{ ...view, name }, ...rest]);
}

export function removeView(list: SavedView[], name: string): SavedView[] {
	return list.filter((v) => v.name !== name);
}

/** Keeps only the keys that exist in `defaults`, and only when the value has the same type (an array stays an array). Whatever else was stored is dropped. */
export function sanitizeFilters(raw: Record<string, unknown>, defaults: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const k of Object.keys(defaults)) {
		const v = raw?.[k], d = defaults[k];
		if (v === undefined) continue;
		if (Array.isArray(d) ? Array.isArray(v) : typeof v === typeof d && !(typeof v === "number" && !Number.isFinite(v))) out[k] = v;
	}
	return out;
}
