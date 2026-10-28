// The real BrainView, the real engine and the real styles.css, running on a synthetic demo vault in a browser page.
// Used to make the README image. The Obsidian module is replaced by obsidian-shim.ts (DOM helpers and a few classes).
import { installDomHelpers } from "./obsidian-shim";
installDomHelpers();
import { BrainView } from "../../src/view";
import { DEFAULT_SETTINGS } from "../../src/vaultGraph";
import { translate, StringKey } from "../../src/i18n";

const DAY = 86400000, NOW = Date.now();
const SOURCES = ["attention-is-all-you-need", "scaling-laws-paper", "rlhf-paper", "flash-attention-paper", "lora-paper", "rag-paper", "react-paper", "mixture-of-experts-paper", "chain-of-thought-paper", "toolformer-paper", "retrieval-survey", "gpt-4-report"];
const ENTITIES = ["openai", "anthropic", "deepmind", "meta-ai", "mistral", "hugging-face", "nvidia", "stanford-nlp", "vaswani", "hinton", "sutskever", "karpathy"];
const CONCEPTS = ["attention", "kv-cache", "transformer", "tokenizer", "embeddings", "rlhf", "scaling-laws", "mixture-of-experts", "prompting", "fine-tuning", "rag", "agents", "tool-use", "context-window", "softmax", "backprop", "gradient-descent", "lora", "quantization", "evals", "hallucination", "alignment", "reasoning", "chain-of-thought", "retrieval", "vector-search", "chunking", "reranking", "memory", "planning", "mcp", "function-calling", "sampling", "temperature", "beam-search", "speculative-decoding", "flash-attention", "rope", "layernorm", "residual", "pretraining", "datasets", "synthetic-data", "distillation", "pruning", "inference", "batching", "latency", "throughput", "long-context", "structured-output", "system-prompt", "few-shot", "self-consistency", "tree-of-thought", "reflexion"];
const SYNTH = ["how-llms-remember", "why-attention-scales", "rag-vs-long-context", "agents-in-practice", "eval-strategy", "inference-cost-map", "alignment-landscape", "prompt-patterns"];
const TAGS = ["#ai", "#inference", "#training", "#retrieval", "#agents", "#evals"];

function rng(seed: number) {
	return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const r = rng(11);

interface Note { path: string; basename: string; folder: string; type: string; ctime: number; mtime: number; links: string[]; tags: string[]; headings: string[]; props: Record<string, unknown> }
const notes: Note[] = [];
const add = (names: string[], folder: string, type: string) => names.forEach((n) => notes.push({ path: `wiki/${folder}/${n}.md`, basename: n, folder: `wiki/${folder}`, type, ctime: NOW - Math.floor(r() * 140) * DAY, mtime: 0, links: [], tags: [], headings: ["Summary", "Notes"], props: { type } }));
add(SOURCES, "sources", "source");
add(ENTITIES, "entities", "entity");
add(CONCEPTS, "concepts", "concept");
add(SYNTH, "syntheses", "synthesis");
const index: Note = { path: "wiki/index.md", basename: "index", folder: "wiki", type: "", ctime: NOW - 150 * DAY, mtime: NOW - 1 * DAY, links: [], tags: [], headings: ["Index"], props: {} };
notes.unshift(index);
for (const n of notes) {
	n.mtime = n.ctime + Math.floor(r() * Math.max(1, (NOW - n.ctime) / DAY)) * DAY;
	n.tags = [TAGS[Math.floor(r() * TAGS.length)]];
}
for (const n of notes.slice(0, 18)) n.mtime = NOW - Math.floor(r() * 20) * 3600000; // a few edited today
// every page is linked from the index or from an older page; hubs collect more links
const concepts = notes.filter((n) => n.type === "concept");
for (const n of notes.slice(1)) {
	index.links.push(n.path);
	const k = n.type === "synthesis" ? 5 : n.type === "source" ? 2 : 3;
	for (let i = 0; i < k; i++) {
		const t = r() < 0.55 ? concepts[Math.floor(Math.pow(r(), 1.7) * concepts.length)] : notes[1 + Math.floor(r() * (notes.length - 1))];
		if (t && t !== n && !n.links.includes(t.path)) n.links.push(t.path);
	}
}
for (const n of notes) n.props = n.type ? { type: n.type, status: r() < 0.3 ? "draft" : "stable" } : {};

const files = notes.map((n) => ({ path: n.path, basename: n.basename, stat: { ctime: n.ctime, mtime: n.mtime }, parent: { path: n.folder } }));
const byPath = new Map(files.map((f) => [f.path, f]));
const cache = (f: { path: string }) => {
	const n = notes.find((x) => x.path === f.path) as Note;
	return { tags: n.tags.map((t) => ({ tag: t })), headings: n.headings.map((h) => ({ heading: h })), frontmatter: n.props, frontmatterLinks: [] };
};
const app = {
	vault: { getMarkdownFiles: () => files, getAbstractFileByPath: (p: string) => byPath.get(p) ?? null, create: async () => {}, createBinary: async () => {} },
	metadataCache: {
		resolvedLinks: Object.fromEntries(notes.map((n) => [n.path, Object.fromEntries(n.links.map((l) => [l, 1]))])),
		unresolvedLinks: {},
		getFileCache: cache,
		getFirstLinkpathDest: () => null,
	},
	workspace: { on: () => ({}), trigger: () => {}, getLeaf: () => ({ openFile: async () => {} }) },
};

const log = notes
	.slice(1)
	.sort((a, b) => a.ctime - b.ctime)
	.map((n) => `## [${new Date(n.ctime).toISOString().slice(0, 10)}] ingest | ${n.basename}`)
	.join("\n");

const settings = { ...DEFAULT_SETTINGS, onboarded: true, ambient: "calm" as const, recentRing: true, ghosts: true, neuronDetail: "high" as const };
const plugin = {
	settings,
	lang: "en" as const,
	layout: {} as Record<string, number[]>,
	t: (k: StringKey, v?: Record<string, string | number>) => translate("en", k, v),
	readLog: async () => log,
	saveLayout: () => {},
	persist: async () => {},
	saveViews: async () => {},
};

const view = new BrainView({} as never, plugin as never);
(view as unknown as { app: unknown }).app = app;
const pane = document.getElementById("pane") as HTMLElement;
pane.appendChild(view.contentEl);
view.contentEl.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;padding:0";
void view.onOpen().then(() => {
	(window as unknown as Record<string, unknown>).view = view;
	(window as unknown as Record<string, unknown>).engine = view.engine;
	console.log("ui-ready", notes.length);
});
