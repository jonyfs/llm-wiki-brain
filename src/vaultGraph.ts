import { App, TFile } from "obsidian";
import { GraphNode, PageType, TYPES } from "./engine";

export interface BrainSettings {
	wikiRoot: string;
	maxNodes: number;
	reduceMotion: boolean;
	ambient: "off" | "calm" | "lively";
	flowSpeed: "slow" | "normal" | "fast";
	flowTarget: "created" | "edited";
	flowViewOnly: boolean;
	autoFlowOnCreate: boolean;
}

export const DEFAULT_SETTINGS: BrainSettings = {
	wikiRoot: "wiki",
	maxNodes: 800,
	reduceMotion: false,
	ambient: "calm",
	flowSpeed: "normal",
	flowTarget: "created",
	flowViewOnly: false,
	autoFlowOnCreate: true,
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

function declaredType(app: App, file: TFile): PageType | null {
	const fm = app.metadataCache.getFileCache(file)?.frontmatter;
	const declared = typeof fm?.type === "string" ? fm.type.toLowerCase() : "";
	return declared in FOLDER_TYPES ? FOLDER_TYPES[declared] : null;
}

/** Frontmatter `type`, then a wiki/<type> folder, then a stable guess from the folder name. */
export function pageType(app: App, file: TFile): PageType {
	const d = declaredType(app, file);
	if (d) return d;
	for (const part of file.path.split("/").slice(0, -1)) {
		const t = FOLDER_TYPES[part.toLowerCase()];
		if (t) return t;
	}
	return TYPES[hash(file.parent?.path ?? "") % TYPES.length];
}

export interface PageMeta {
	folder: string;
	tags: string[];
	text: string; // lower-case name, path, headings and tags for search
}

export interface VaultGraph {
	pages: GraphNode[];
	links: [string, string][];
	meta: Map<string, PageMeta>;
	orphans: string[];
	broken: string[];
	untyped: string[];
}

function normTag(t: string): string {
	return t.startsWith("#") ? t.toLowerCase() : "#" + t.toLowerCase();
}

export function inScope(path: string, s: BrainSettings): boolean {
	const root = s.wikiRoot.trim().replace(/^\/+|\/+$/g, "");
	return !root || path.startsWith(root + "/");
}

export function buildVaultGraph(app: App, s: BrainSettings): VaultGraph {
	const all = app.vault.getMarkdownFiles().filter((f) => inScope(f.path, s));
	const scope = new Set(all.map((f) => f.path));
	const resolved = app.metadataCache.resolvedLinks;
	const unresolved = app.metadataCache.unresolvedLinks;
	const deg = new Map<string, number>();
	const links: [string, string][] = [];
	for (const f of all) {
		for (const target of Object.keys(resolved[f.path] ?? {})) {
			if (!scope.has(target) || target === f.path) continue;
			links.push([f.path, target]);
			deg.set(f.path, (deg.get(f.path) ?? 0) + 1);
			deg.set(target, (deg.get(target) ?? 0) + 1);
		}
	}
	// Large vaults: keep the most connected pages (and the index) so the brain stays smooth.
	let files = all;
	if (all.length > s.maxNodes) {
		const rank = (f: TFile) => (f.basename.toLowerCase() === "index" ? 1e9 : deg.get(f.path) ?? 0);
		files = [...all].sort((a, b) => rank(b) - rank(a)).slice(0, s.maxNodes);
	}
	const keep = new Set(files.map((f) => f.path));
	const meta = new Map<string, PageMeta>();
	const pages: GraphNode[] = files.map((f) => {
		const cache = app.metadataCache.getFileCache(f);
		const fmTags = cache?.frontmatter?.tags;
		const tags = [
			...(cache?.tags ?? []).map((t) => normTag(t.tag)),
			...(Array.isArray(fmTags) ? fmTags : typeof fmTags === "string" ? fmTags.split(/[\s,]+/) : []).filter(Boolean).map((t: string) => normTag(String(t))),
		];
		const rel = s.wikiRoot.trim() ? f.path.slice(s.wikiRoot.trim().replace(/^\/+|\/+$/g, "").length + 1) : f.path;
		meta.set(f.path, {
			folder: rel.includes("/") ? rel.split("/")[0] : "",
			tags: Array.from(new Set(tags)),
			text: [f.path, ...(cache?.headings ?? []).map((h) => h.heading), ...tags].join(" ").toLowerCase(),
		});
		const base = f.basename.toLowerCase();
		return { path: f.path, label: f.basename, type: pageType(app, f), ctime: f.stat.ctime, mtime: f.stat.mtime, isIndex: base === "index", isLog: base === "log" };
	});
	const special = new Set(pages.filter((p) => p.isIndex || p.isLog).map((p) => p.path));
	return {
		pages,
		links: links.filter(([a, b]) => keep.has(a) && keep.has(b)),
		meta,
		orphans: files.filter((f) => !deg.get(f.path) && !special.has(f.path)).map((f) => f.path),
		broken: files.filter((f) => Object.keys(unresolved[f.path] ?? {}).length > 0).map((f) => f.path),
		untyped: files.filter((f) => !special.has(f.path) && !declaredType(app, f)).map((f) => f.path),
	};
}

/** Pages whose name, path, tags or headings contain every word of the query. */
export function matchQuery(graph: VaultGraph, query: string): Set<string> {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	const out = new Set<string>();
	if (!words.length) return out;
	for (const [path, m] of graph.meta) if (words.every((w) => m.text.includes(w))) out.add(path);
	return out;
}
