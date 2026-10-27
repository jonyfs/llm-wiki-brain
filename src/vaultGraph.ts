import { App, TFile } from "obsidian";
import { GraphNode, PageType, TYPES } from "./engine";

export interface BrainSettings {
	wikiRoot: string;
	maxNodes: number;
	reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: BrainSettings = {
	wikiRoot: "wiki",
	maxNodes: 800,
	reduceMotion: false,
};

const FOLDER_TYPES: Record<string, PageType> = {
	sources: "source",
	source: "source",
	entities: "entity",
	entity: "entity",
	concepts: "concept",
	concept: "concept",
	syntheses: "synthesis",
	synthesis: "synthesis",
};

function hash(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
	return Math.abs(h);
}

/** Frontmatter `type`, then a wiki/<type> folder, then a stable guess from the folder name. */
export function pageType(app: App, file: TFile): PageType {
	const fm = app.metadataCache.getFileCache(file)?.frontmatter;
	const declared = typeof fm?.type === "string" ? fm.type.toLowerCase() : "";
	if (declared in FOLDER_TYPES) return FOLDER_TYPES[declared];
	for (const part of file.path.split("/").slice(0, -1)) {
		const t = FOLDER_TYPES[part.toLowerCase()];
		if (t) return t;
	}
	const folder = file.parent?.path ?? "";
	return TYPES[hash(folder) % TYPES.length];
}

export interface VaultGraph {
	pages: GraphNode[];
	links: [string, string][];
	orphans: string[];
	broken: string[];
}

export function buildVaultGraph(app: App, s: BrainSettings): VaultGraph {
	const root = s.wikiRoot.trim().replace(/^\/+|\/+$/g, "");
	const all = app.vault.getMarkdownFiles().filter((f) => !root || f.path.startsWith(root + "/"));
	const inScope = new Set(all.map((f) => f.path));
	const resolved = app.metadataCache.resolvedLinks;
	const unresolved = app.metadataCache.unresolvedLinks;
	const deg = new Map<string, number>();
	const links: [string, string][] = [];
	for (const f of all) {
		for (const target of Object.keys(resolved[f.path] ?? {})) {
			if (!inScope.has(target) || target === f.path) continue;
			links.push([f.path, target]);
			deg.set(f.path, (deg.get(f.path) ?? 0) + 1);
			deg.set(target, (deg.get(target) ?? 0) + 1);
		}
	}
	// Large vaults: keep the most connected pages so the brain stays smooth.
	let files = all;
	if (all.length > s.maxNodes) {
		files = [...all].sort((a, b) => (deg.get(b.path) ?? 0) - (deg.get(a.path) ?? 0)).slice(0, s.maxNodes);
	}
	const keep = new Set(files.map((f) => f.path));
	const pages: GraphNode[] = files.map((f) => ({ path: f.path, label: f.basename, type: pageType(app, f) }));
	const orphans = files.filter((f) => !deg.get(f.path)).map((f) => f.path);
	const broken = files.filter((f) => Object.keys(unresolved[f.path] ?? {}).length > 0).map((f) => f.path);
	return { pages, links: links.filter(([a, b]) => keep.has(a) && keep.has(b)), orphans, broken };
}

/** Pages whose name, path, tags or headings contain every word of the query. */
export function askBrain(app: App, query: string, s: BrainSettings): string[] {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return [];
	const root = s.wikiRoot.trim().replace(/^\/+|\/+$/g, "");
	const out: string[] = [];
	for (const f of app.vault.getMarkdownFiles()) {
		if (root && !f.path.startsWith(root + "/")) continue;
		const cache = app.metadataCache.getFileCache(f);
		const hay = [
			f.path,
			...(cache?.headings ?? []).map((h) => h.heading),
			...(cache?.tags ?? []).map((t) => t.tag),
		].join(" ").toLowerCase();
		if (words.every((w) => hay.includes(w))) out.push(f.path);
	}
	return out;
}
