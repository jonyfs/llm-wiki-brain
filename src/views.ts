/* Saved views: a name, the filters and the search that were on screen. Pure, testable in Node. */

export interface SavedView {
	name: string;
	query: string;
	filters: Record<string, unknown>;
}

export const MAX_VIEWS = 20;

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
