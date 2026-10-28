import type { App, TFile } from "obsidian";
import { GraphNode, PageType, TYPES } from "./engine";
import { creationTimes } from "./logParser";
import { isInhibitoryKey } from "./synapse";
import type { SavedView } from "./views";
import { fuzzyScore, matchesQuery, parseQuery } from "./query";
import type { LangPref } from "./i18n";

export interface BrainSettings {
	wikiRoot: string;
	maxNodes: number;
	reduceMotion: boolean;
	ambient: "off" | "calm" | "lively";
	flowSpeed: "slow" | "normal" | "fast";
	flowTarget: "created" | "edited";
	flowViewOnly: boolean;
	autoFlowOnCreate: boolean;
	neuronDetail: "auto" | "high" | "simple";
	followActiveNote: boolean;
	hoverPreview: boolean;
	language: LangPref;
	savedViews: SavedView[];
	pinned: string[];
	onboarded: boolean;
	explorerHover: boolean;
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
	neuronDetail: "auto",
	followActiveNote: true,
	hoverPreview: true,
	language: "auto",
	savedViews: [],
	pinned: [],
	onboarded: false,
	explorerHover: true,
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
	headings: string; // lower-case headings
	props: Record<string, string>; // frontmatter, lower-cased keys
}

export interface VaultGraph {
	pages: GraphNode[];
	links: [string, string][];
	inhibit: Set<string>; // "from>to" links that inhibit (frontmatter contradicts: [[x]])
	counts: Map<string, number>; // "from>to" -> how many times the page links there
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

export function buildVaultGraph(app: App, s: BrainSettings, logText?: string | null): VaultGraph {
	const all = app.vault.getMarkdownFiles().filter((f) => inScope(f.path, s));
	const scope = new Set(all.map((f) => f.path));
	const resolved = app.metadataCache.resolvedLinks;
	const unresolved = app.metadataCache.unresolvedLinks;
	const deg = new Map<string, number>();
	const links: [string, string][] = [];
	const counts = new Map<string, number>();
	for (const f of all) {
		for (const target of Object.keys(resolved[f.path] ?? {})) {
			if (!scope.has(target) || target === f.path) continue;
			links.push([f.path, target]);
			counts.set(f.path + ">" + target, Number(resolved[f.path][target]) || 1);
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
	const inhibit = new Set<string>();
	for (const f of files) {
		for (const fl of app.metadataCache.getFileCache(f)?.frontmatterLinks ?? []) {
			const key = fl.key.split(".")[0];
			if (!isInhibitoryKey(key)) continue;
			const dest = app.metadataCache.getFirstLinkpathDest?.(fl.link.split("#")[0], f.path);
			if (dest && keep.has(dest.path) && dest.path !== f.path) inhibit.add(f.path + ">" + dest.path);
		}
	}
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
			headings: (cache?.headings ?? []).map((h) => h.heading).join(" ").toLowerCase(),
			props: frontmatterProps(cache?.frontmatter),
		});
		const base = f.basename.toLowerCase();
		return { path: f.path, label: f.basename, type: pageType(app, f), ctime: f.stat.ctime, mtime: f.stat.mtime, isIndex: base === "index", isLog: base === "log" };
	});
	// File dates collapse in vaults restored from Git or iCloud: then the log says what came first.
	const times = creationTimes(pages.map((p) => ({ path: p.path, label: p.label, ctime: p.ctime })), logText);
	for (const p of pages) p.ctime = times.get(p.path) ?? p.ctime;
	const special = new Set(pages.filter((p) => p.isIndex || p.isLog).map((p) => p.path));
	return {
		pages,
		links: links.filter(([a, b]) => keep.has(a) && keep.has(b)),
		counts,
		inhibit,
		meta,
		orphans: files.filter((f) => !deg.get(f.path) && !special.has(f.path)).map((f) => f.path),
		broken: files.filter((f) => Object.keys(unresolved[f.path] ?? {}).length > 0).map((f) => f.path),
		untyped: files.filter((f) => !special.has(f.path) && !declaredType(app, f)).map((f) => f.path),
	};
}

/** Frontmatter as lower-cased keys and flat strings (lists joined by commas), so `prop:status=draft` works. */
export function frontmatterProps(fm: Record<string, unknown> | undefined): Record<string, string> {
	const out: Record<string, string> = {};
	if (!fm) return out;
	for (const [k, v] of Object.entries(fm)) {
		if (k === "position" || v == null || typeof v === "object" && !Array.isArray(v)) continue;
		out[k.toLowerCase()] = Array.isArray(v) ? v.map(String).join(",") : String(v);
	}
	return out;
}

function linkCounts(graph: VaultGraph): Map<string, number> {
	const deg = new Map<string, number>();
	for (const [a, b] of graph.links) {
		deg.set(a, (deg.get(a) ?? 0) + 1);
		deg.set(b, (deg.get(b) ?? 0) + 1);
	}
	return deg;
}

/** The pages that satisfy the search box (see query.ts for the syntax). */
export function matchQuery(graph: VaultGraph, query: string, now = Date.now()): Set<string> {
	const terms = parseQuery(query);
	const deg = linkCounts(graph);
	const flag = (list: string[]) => new Set(list);
	const orphan = flag(graph.orphans), broken = flag(graph.broken), untyped = flag(graph.untyped);
	const out = new Set<string>();
	for (const p of graph.pages) {
		const m = graph.meta.get(p.path);
		if (!m) continue;
		const flags: string[] = [];
		if (orphan.has(p.path)) flags.push("orphan");
		if (broken.has(p.path)) flags.push("broken");
		if (untyped.has(p.path)) flags.push("untyped");
		if (p.isIndex) flags.push("index");
		if (p.isLog) flags.push("log");
		if ((deg.get(p.path) ?? 0) >= 8) flags.push("hub");
		const page = { path: p.path, label: p.label, tags: m.tags, type: p.type, text: m.text, headings: m.headings, degree: deg.get(p.path) ?? 0, ctime: p.ctime, mtime: p.mtime, props: m.props, flags };
		if (matchesQuery(terms, page, now)) out.add(p.path);
	}
	// Nothing matched: fall back to fuzzy file names for a plain one-word query ("kvcch" finds "kv-cache").
	if (!out.size && terms.length === 1 && terms[0].length === 1 && terms[0][0].key === "" && !terms[0][0].not && terms[0][0].value.length >= 3) {
		const needle = terms[0][0].value;
		for (const p of graph.pages) if (fuzzyScore(needle, p.label) >= 0.5) out.add(p.path);
	}
	return out;
}
