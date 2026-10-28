/* Brain engine: Canvas 2D with real perspective, depth sorting and neuron-shaped nodes.
   Ported from the llm-wiki-template demo graph (MIT), extended with information flow
   (index to page packets, ask waves, replay), persistent selection and filters. */
import { Net, cascade, conduction, hebb, myelinOf, synapsesOf, Spike } from "./synapse";
import { assignLobes, countBefore, creationOrder, findRoute, spreadFrom } from "./route";
import { LOBES, LOBE_SUM, simStep as stepPhysics } from "./physics";
import { AXON_TIPS, assignPorts as assignPortsPure, edgeCurve, freeDirection, growDendrites } from "./ports";
import { quadPoints, somaRadii, taperStrip } from "./neuron";
import type { Den as Dendrite } from "./ports";
import { once } from "./refresh";

export type PageType = "source" | "entity" | "concept" | "synthesis";
export const TYPES: PageType[] = ["source", "entity", "concept", "synthesis"];

export interface GraphNode {
	path: string;
	label: string;
	type: PageType;
	ctime: number;
	mtime: number;
	isIndex: boolean;
	isLog: boolean;
}

export interface NodeInfo {
	path: string;
	label: string;
	type: PageType;
	deg: number;
	ctime: number;
	mtime: number;
	neighbors: { path: string; label: string }[];
	inputs: { path: string; label: string }[]; // pages that link here (dendrites)
	outputs: { path: string; label: string }[]; // pages this one links to (axon)
	threshold: number; // input the page needs before it fires
	pinned: boolean;
}

export interface FlowOptions {
	to?: string;
	mode?: "created" | "edited" | "selected";
	viewOnly?: boolean;
}

export interface FlowResult {
	from: string;
	to: string;
	hops: number;
	virtual: boolean;
}

export interface EngineOptions {
	reducedMotion: boolean;
	ambient: () => number; // 0 off, 1 calm, 2 lively
	flowSpeed: () => number; // 0.6 slow, 1 normal, 1.6 fast
	detail: () => "auto" | "high" | "simple"; // auto adapts to frame time, high keeps full neurons, simple keeps spheres
	onOpen: (path: string) => void;
	onHover: (path: string | null, ev?: PointerEvent) => void;
	onSelect: (info: NodeInfo | null) => void;
	onStatus: (msg: string) => void;
	onFullscreen: () => void;
	onSettled?: () => void; // the layout stopped moving: a good moment to save it
	onPin?: (paths: string[]) => void; // the set of pinned pages changed
	onReplay?: (step: { i: number; n: number; time: number; path: string } | null) => void; // a page just came back (null: the replay ended)
	text: (key: "status.replayDone" | "status.drawFailed", vars?: Record<string, string | number>) => string;
}

interface Cell {
	id: number;
	path: string;
	label: string;
	type: PageType;
	ctime: number;
	mtime: number;
	isIndex: boolean;
	isLog: boolean;
	lobe: number;
	side: number;
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	pinned?: boolean;
	deg: number;
	adj: number[];
	pulse: number;
	lit: number;
	flag: boolean;
	match: boolean;
	typeHidden: boolean;
	filtered: boolean;
	replayHidden: boolean;
	off: boolean;
	px: number;
	py: number;
	pz: number;
	pr: number;
	pd: number;
	den: Dendrite[];
	port: number[]; // how many links leave through each dendrite
	din: number; // links that arrive here
	axon: number[]; // unit direction (cell frame) with the most room, where the axon leaves
}

// a, b, bend, crosses the midline, dendrite used at a, dendrite used at b
type Edge = [number, number, number, boolean, number, number];

interface Signal {
	e: number;
	t: number;
	v: number;
	rev: boolean;
	gen: number;
	w: number; // strength carried to the target (negative inhibits)
	m: number; // myelination: how fast the spike runs between the nodes of Ranvier
}

interface Packet {
	segs: [number, number, number, number][]; // from, to, curvature in travel direction, edge index (-1 for a virtual arc)
	seg: number;
	t: number;
	v: number;
	virtual: boolean;
	fade: number; // 1 while the route is being drawn, then decays after arrival
	done: boolean;
}

interface Wave {
	id: number;
	from: number;
	at: number;
	fires: boolean; // the target crossed its threshold (otherwise it only charged)
}

const DIST = 820;
const MORPH: Record<PageType, number[]> = {
	source: [3, 1.5, 2.8, 0.4, 6.2],
	entity: [8, 1.4, 2.6, 0.25, 0],
	concept: [5, 1.8, 3.6, 0.65, 0],
	synthesis: [6, 2.2, 5.2, 0.9, 0],
};
const COLORS = {
	dark: { source: "#5eead4", entity: "#fbbf24", concept: "#8b97ff", synthesis: "#f472b6" },
	light: { source: "#0f766e", entity: "#b45309", concept: "#4338ca", synthesis: "#be185d" },
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function hashStr(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function rng(seed: number): () => number {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hexToRgb(h: string): number[] {
	return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
}

function mix(h: string, t: number[], amt: number): string {
	const c = hexToRgb(h);
	return "rgb(" + c.map((v, i) => Math.round(v + (t[i] - v) * amt)).join(",") + ")";
}

function makeSprite(color: string, glow: number, core = true): HTMLCanvasElement {
	const S = 96;
	const c = document.createElement("canvas");
	c.width = c.height = S;
	const g = c.getContext("2d") as CanvasRenderingContext2D;
	const rgb = hexToRgb(color);
	const gl = g.createRadialGradient(S / 2, S / 2, S * 0.08, S / 2, S / 2, S / 2);
	gl.addColorStop(0, "rgba(" + rgb + "," + glow + ")");
	gl.addColorStop(1, "rgba(" + rgb + ",0)");
	g.fillStyle = gl;
	g.fillRect(0, 0, S, S);
	if (!core) return c;
	const b = g.createRadialGradient(S / 2 - S * 0.07, S / 2 - S * 0.08, S * 0.015, S / 2, S / 2, S * 0.22);
	b.addColorStop(0, mix(color, [255, 255, 255], 0.6));
	b.addColorStop(0.55, color);
	b.addColorStop(1, mix(color, [0, 0, 0], 0.4));
	g.fillStyle = b;
	g.beginPath();
	g.arc(S / 2, S / 2, S * 0.22, 0, 6.2832);
	g.fill();
	return c;
}

function makeGhost(rgb: string): HTMLCanvasElement {
	const S = 128;
	const c = document.createElement("canvas");
	c.width = c.height = S;
	const g = c.getContext("2d") as CanvasRenderingContext2D;
	const gr = g.createRadialGradient(S / 2, S / 2, S * 0.12, S / 2, S / 2, S / 2);
	// Same cloud as before, only easier to see: a brighter core and a slower fade, still dissolving at the edge.
	gr.addColorStop(0, "rgba(" + rgb + ",0.34)");
	gr.addColorStop(0.55, "rgba(" + rgb + ",0.24)");
	gr.addColorStop(0.85, "rgba(" + rgb + ",0.1)");
	gr.addColorStop(1, "rgba(" + rgb + ",0)");
	g.fillStyle = gr;
	g.fillRect(0, 0, S, S);
	return c;
}

export class BrainEngine {
	private ctx: CanvasRenderingContext2D;
	private nodes: Cell[] = [];
	private byPath = new Map<string, Cell>();
	private edges: Edge[] = [];
	private edgeIdx = new Map<string, number>();
	private order: Cell[] = [];
	private hidden: Partial<Record<PageType, boolean>> = {};
	private signals: Signal[] = [];
	private net: Net | null = null;
	private pinnedSet = new Set<string>();
	private mutual: boolean[] = [];
	private leakAt = 0;
	private packets: Packet[] = [];
	private waves: Wave[] = [];
	private replayState: { ids: number[]; i: number; next: number; step: number; index: number; paused: boolean; speed: number; key: "ctime" | "mtime"; base: number } | null = null;
	private matchActive = false;
	private alpha = 1;
	private yaw = 0.6;
	private pitch = -0.22;
	private zoom = 1;
	private panX = 0;
	private panY = 0;
	private tz = 1;
	private tpx = 0;
	private tpy = 0;
	private animating = false;
	private vyaw = 0;
	private vpitch = 0;
	private W = 1;
	private H = 1;
	private dpr = 1;
	private S0 = 1;
	private tNow = 0;
	private last = 0;
	private lastDraw = 0;
	private raf = 0;
	private visible = true;
	private dragging = false;
	private panning = false;
	private down: { x: number; y: number; t: number; moved: boolean } | null = null;
	private pts = new Map<number, { x: number; y: number }>();
	private pinch: { d: number; z: number } | null = null;
	private lastTap: { x: number; y: number; t: number } | null = null;
	private hist: [number, number, number][] = [];
	private hovered = -1;
	private selected = -1;
	private hubPos = -1;
	private flagUntil = 0;
	private auto: boolean;
	private ro: ResizeObserver;
	private io: IntersectionObserver | null = null;
	private sprites: Partial<Record<PageType, HTMLCanvasElement>> = {};
	private glowSprites: Partial<Record<PageType, HTMLCanvasElement>> = {};
	private somaStops: Partial<Record<PageType, string[]>> = {};
	private boutonColor = "rgb(230,255,251)";
	private light = false;
	private palRGB: Partial<Record<PageType, string>> = {};
	private pal = COLORS.dark;
	private ghost: HTMLCanvasElement | null = null;
	private edgeRGB = "139,151,255";
	private labelColor = "#e8eaf0";
	private bgColor = "#0d1017";
	private warnColor = "#f59e0b";
	private ghostAlpha = 0.55;
	private camCy = 1;
	private camSy = 0;
	private camCp = 1;
	private camSp = 0;
	private cleanups: (() => void)[] = [];
	private running = false;
	private quality = 2;
	private simpleEdges = false;
	private simTick = 0;
	private fullFlags = new Uint8Array(0);
	private candBuf: Cell[] = [];
	private ema = 4;
	private slow = 0;
	private fast = 0;
	private frames = 0;
	private frameMs = 0;
	private lowDetail = false;
	private reportDrawFailure = once((m) => this.opts.onStatus(m));
	private portsDirty = true;
	private anc = new Float64Array(0);

	constructor(private canvas: HTMLCanvasElement, private opts: EngineOptions) {
		this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		this.auto = !opts.reducedMotion;
		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(canvas.parentElement ?? canvas);
		// No frames while the pane is off screen.
		if ("IntersectionObserver" in window) {
			this.io = new IntersectionObserver((en) => {
				this.visible = en[0].isIntersecting;
				if (this.visible) this.start();
			});
			this.io.observe(canvas);
		}
		this.bind();
		this.readTheme();
		this.resize();
	}

	/* ---------- Data ---------- */

	/** Replace the graph, keeping the position of pages that already exist so the brain does not jump. */
	setGraph(pages: GraphNode[], links: [string, string][], saved?: Record<string, number[]>, counts?: Map<string, number>, inhibit?: Set<string>): void {
		const old = this.byPath;
		const next: Cell[] = [];
		const byPath = new Map<string, Cell>();
		const adjHint = new Map<string, string[]>();
		for (const [a, b] of links) {
			(adjHint.get(a) ?? adjHint.set(a, []).get(a)!).push(b);
			(adjHint.get(b) ?? adjHint.set(b, []).get(b)!).push(a);
		}
		const selectedPath = this.selected >= 0 ? this.nodes[this.selected]?.path : null;
		// First build: group linked pages into brain regions. Later builds keep positions and place new pages near a neighbour.
		const fresh = old.size === 0;
		let lobeOf: number[] = [];
		if (fresh) {
			const idx = new Map(pages.map((p, i) => [p.path, i]));
			const adj: number[][] = pages.map(() => []);
			for (const [a, b] of links) {
				const ia = idx.get(a), ib = idx.get(b);
				if (ia === undefined || ib === undefined || ia === ib) continue;
				adj[ia].push(ib);
				adj[ib].push(ia);
			}
			lobeOf = assignLobes(adj, LOBES.map((l) => l.w), [0, 1, 4, 2, 3, 5, 6]);
		}
		for (const [pi, p] of pages.entries()) {
			const prev = old.get(p.path);
			if (prev) {
				Object.assign(prev, { din: 0, type: p.type, label: p.label, ctime: p.ctime, mtime: p.mtime, isIndex: p.isIndex, isLog: p.isLog, deg: 0, adj: [] as number[] });
				next.push(prev);
				byPath.set(p.path, prev);
				continue;
			}
			const r = rng(hashStr(p.path));
			let nearCell: Cell | undefined;
			if (!fresh) {
				for (const q of adjHint.get(p.path) ?? []) {
					nearCell = byPath.get(q) ?? old.get(q);
					if (nearCell) break;
				}
			}
			const lobe = nearCell ? nearCell.lobe : fresh ? lobeOf[pi] : this.lobeFor(r);
			let pos = this.pointIn(lobe, r);
			if (nearCell) pos = [nearCell.x + (r() - 0.5) * 30, nearCell.y + (r() - 0.5) * 30, nearCell.z + (r() - 0.5) * 30];
			const kept = saved?.[p.path];
			if (kept && kept.length >= 3) pos = [kept[0], kept[1], kept[2]]; // where it was left last time
			next.push({
				id: 0, path: p.path, label: p.label, type: p.type, ctime: p.ctime, mtime: p.mtime, isIndex: p.isIndex, isLog: p.isLog,
				lobe, side: LOBES[lobe].side, x: pos[0], y: pos[1], z: pos[2], vx: 0, vy: 0, vz: 0, deg: 0, adj: [], pulse: 1, lit: 0,
				flag: false, match: false, typeHidden: !!this.hidden[p.type], filtered: false, replayHidden: false, off: false,
				pinned: this.pinnedSet.has(p.path), px: 0, py: 0, pz: 0, pr: 0, pd: 0, den: this.makeDendrites(p.type, r), port: [], din: 0, axon: [0, 1, 0],
			});
			byPath.set(p.path, next[next.length - 1]);
		}
		next.forEach((c, i) => (c.id = i));
		this.nodes = next;
		this.byPath = byPath;
		this.order = next.slice();
		this.edges = [];
		this.mutual = [];
		this.edgeIdx.clear();
		this.signals = [];
		this.packets = [];
		this.waves = [];
		this.replayState = null;
		this.hovered = -1;
		this.selected = selectedPath && byPath.has(selectedPath) ? (byPath.get(selectedPath) as Cell).id : -1;
		const er = rng(0x9e3779b1);
		for (const [a, b] of links) {
			const na = byPath.get(a);
			const nb = byPath.get(b);
			if (!na || !nb || na === nb) continue;
			const k = na.id < nb.id ? na.id + "," + nb.id : nb.id + "," + na.id;
			const had = this.edgeIdx.get(k);
			if (had !== undefined) {
				if (this.edges[had][0] !== na.id) this.mutual[had] = true; // the link also goes the other way
				continue;
			}
			this.mutual.push(false);
			this.edgeIdx.set(k, this.edges.length);
			this.edges.push([na.id, nb.id, (er() < 0.5 ? -1 : 1) * (0.04 + er() * 0.08), na.side !== 0 && nb.side === -na.side, 0, 0]);
			na.deg++;
			nb.deg++;
			na.adj.push(nb.id);
			nb.adj.push(na.id);
		}
		this.net = new Net(this.nodes.length, synapsesOf(links.flatMap(([a, b]) => {
			const x = byPath.get(a), y = byPath.get(b);
			return x && y ? [[x.id, y.id, counts?.get(a + ">" + b), inhibit?.has(a + ">" + b)] as [number, number, number?, boolean?]] : [];
		})));
		if (this.opts.detail() === "auto") this.quality = this.nodes.length > 3000 ? 0 : this.nodes.length > 900 ? 1 : 2; // start where a big vault can keep up
		this.applyVisibility();
		const known = saved ? pages.filter((p) => saved[p.path]).length / Math.max(1, pages.length) : 0;
		this.alpha = this.opts.reducedMotion ? 0 : known > 0.7 ? 0.1 : 0.6; // mostly known: only settle gently
		if (this.opts.reducedMotion) for (let s = 0, a = 1, steps = this.nodes.length > 3000 ? 70 : 220; s < steps; s++, a *= this.nodes.length > 3000 ? 0.95 : 0.985) this.simStep(a);
		this.assignPorts();
		this.opts.onSelect(this.selected >= 0 ? this.infoOf(this.selected) : null);
		this.start();
	}

	private lobeFor(r: () => number): number {
		let x = r() * LOBE_SUM;
		for (let i = 0; i < LOBES.length; i++) {
			x -= LOBES[i].w;
			if (x <= 0) return i;
		}
		return LOBES.length - 1;
	}

	private pointIn(l: number, r: () => number): number[] {
		const u = r() * 6.2832, v = r() * 2 - 1, s = Math.sqrt(1 - v * v), L = LOBES[l];
		const k = r() < 0.72 ? 0.9 + r() * 0.1 : 0.35 + Math.cbrt(r()) * 0.5;
		return [L.c[0] + L.r[0] * s * Math.cos(u) * k, L.c[1] + L.r[1] * s * Math.sin(u) * k, L.c[2] + L.r[2] * v * k];
	}

	private makeDendrites(type: PageType, r: () => number): Dendrite[] {
		const m = MORPH[type], out: Dendrite[] = [], count = m[0] + Math.floor(r() * 2);
		const jit = () => (r() - 0.5) * 0.9;
		const dir = () => {
			const u = r() * 6.2832, v = r() * 2 - 1, s = Math.sqrt(1 - v * v);
			return [s * Math.cos(u), v, s * Math.sin(u)];
		};
		for (let i = 0; i < count; i++) {
			const d = dir(), a = m[1] + r() * 0.7, b = m[2] + r() * 1.6;
			const den: Dendrite = {
				m: [d[0] * a + jit(), d[1] * a + jit(), d[2] * a + jit()],
				t: [d[0] * b + jit(), d[1] * b + jit(), d[2] * b + jit()],
				b: null,
			};
			if (r() < m[3]) {
				const q = dir(), l = 1.2 + r() * 1.2;
				den.b = [den.m[0] + q[0] * l, den.m[1] + q[1] * l, den.m[2] + q[2] * l];
			}
			out.push(den);
		}
		if (m[4]) out.push({ m: [0.2, -m[4] * 0.55, 0], t: [0, -m[4], 0.2], b: [0.9, -m[4] * 0.8, 0.3] });
		return out;
	}

	/* ---------- Visibility, filters, search ---------- */

	private applyVisibility(): void {
		for (const n of this.nodes) n.off = n.typeHidden || n.filtered || n.replayHidden;
		if (this.selected >= 0 && this.nodes[this.selected]?.off) this.select(-1);
		this.start();
	}

	setHidden(type: PageType, hide: boolean): void {
		this.hidden[type] = hide;
		for (const n of this.nodes) if (n.type === type) n.typeHidden = hide;
		this.applyVisibility();
	}

	/** Show only these pages (null shows all). */
	setFilter(paths: Set<string> | null): void {
		for (const n of this.nodes) n.filtered = paths !== null && !paths.has(n.path);
		this.applyVisibility();
	}

	/** Search: matching pages stay bright, the rest dim (null clears). */
	setMatch(paths: Set<string> | null): void {
		this.matchActive = paths !== null;
		for (const n of this.nodes) n.match = paths !== null && paths.has(n.path);
		this.start();
	}

	/** Where every neuron is, for saving. */
	layout(): Record<string, number[]> {
		const out: Record<string, number[]> = {};
		for (const n of this.nodes) out[n.path] = [n.x, n.y, n.z];
		return out;
	}

	counts(): Record<PageType, number> {
		const c: Record<PageType, number> = { source: 0, entity: 0, concept: 0, synthesis: 0 };
		for (const n of this.nodes) c[n.type]++;
		return c;
	}

	typeColor(t: PageType): string {
		return this.pal[t];
	}

	size(): number {
		return this.nodes.length;
	}

	degree(path: string): number {
		return this.byPath.get(path)?.deg ?? 0;
	}

	stats(): { nodes: number; visible: number; links: number; quality: number; frameMs: number } {
		return { nodes: this.nodes.length, visible: this.nodes.filter((n) => !n.off).length, links: this.edges.length, quality: this.quality, frameMs: Math.round(this.frameMs * 10) / 10 };
	}

	/* ---------- Selection and camera ---------- */

	private infoOf(id: number): NodeInfo {
		const n = this.nodes[id];
		return {
			path: n.path, label: n.label, type: n.type, deg: n.deg, ctime: n.ctime, mtime: n.mtime,
			neighbors: n.adj.slice().sort((a, b) => this.nodes[b].deg - this.nodes[a].deg).slice(0, 12).map((j) => ({ path: this.nodes[j].path, label: this.nodes[j].label })),
			inputs: (this.net?.inn[id] ?? []).map((x) => this.nodes[x.from]).sort((a, b) => b.deg - a.deg).slice(0, 12).map((c) => ({ path: c.path, label: c.label })),
			outputs: (this.net?.out[id] ?? []).map((x) => this.nodes[x.to]).sort((a, b) => b.deg - a.deg).slice(0, 12).map((c) => ({ path: c.path, label: c.label })),
			threshold: Math.round((this.net?.theta[id] ?? 1) * 100) / 100,
			pinned: !!n.pinned,
		};
	}

	private select(id: number): void {
		if (id === this.selected) return;
		this.selected = id;
		this.opts.onSelect(id >= 0 ? this.infoOf(id) : null);
		this.start();
	}

	selectPath(path: string | null, fly = false): void {
		const n = path ? this.byPath.get(path) : undefined;
		this.select(n && !n.off ? n.id : -1);
		if (n && fly && !n.off) this.flyTo(n);
	}

	private flyTo(n: Cell): void {
		this.project(); // positions on screen may be stale (or never drawn) when the pane was hidden
		const z1 = clamp(Math.max(this.zoom, 2), 0.55, 4), ox = n.px - this.W / 2 - this.panX;
		this.tz = z1;
		this.tpx = (-ox * z1) / this.zoom;
		this.tpy = (-(n.py - this.H / 2 - this.panY) * z1) / this.zoom;
		this.animating = true;
		this.start();
	}

	resetView(): void {
		this.yaw = 0.6;
		this.pitch = -0.22;
		this.vyaw = this.vpitch = 0;
		this.tz = 1;
		this.tpx = this.tpy = 0;
		this.animating = true;
		this.select(-1);
		this.start();
	}

	setAuto(on: boolean): void {
		this.auto = on && !this.opts.reducedMotion;
		this.start();
	}

	isAuto(): boolean {
		return this.auto;
	}

	private zoomAt(z1: number, sx: number, sy: number, soft: boolean): void {
		z1 = clamp(z1, 0.55, 4);
		const z0 = soft ? this.tz : this.zoom, p0x = soft ? this.tpx : this.panX, p0y = soft ? this.tpy : this.panY;
		const ox = sx - this.W / 2, oy = sy - this.H / 2;
		const nx = ox - ((ox - p0x) * z1) / z0, ny = oy - ((oy - p0y) * z1) / z0;
		if (soft) {
			this.tz = z1;
			this.tpx = nx;
			this.tpy = ny;
			this.animating = true;
		} else {
			this.zoom = this.tz = z1;
			this.panX = this.tpx = nx;
			this.panY = this.tpy = ny;
			this.animating = false;
		}
		this.start();
	}

	/* ---------- Information flow ---------- */

	private indexCell(): Cell | null {
		let best: Cell | null = null;
		for (const n of this.nodes) if (n.isIndex && !n.off) return n;
		for (const n of this.nodes) if (!n.off && !n.isLog && (!best || n.deg > best.deg)) best = n;
		return best;
	}

	private onScreen(n: Cell): boolean {
		return n.px >= 0 && n.px <= this.W && n.py >= 0 && n.py <= this.H;
	}

	private packetSpeed(): number {
		return 0.011 * this.opts.flowSpeed();
	}

	private edgeOf(a: number, b: number): number {
		return this.edgeIdx.get(a < b ? a + "," + b : b + "," + a) ?? -1;
	}

	private edgeK(a: number, b: number): number | null {
		const e = this.edgeIdx.get(a < b ? a + "," + b : b + "," + a);
		if (e == null) return null;
		const ed = this.edges[e];
		return a === ed[0] ? ed[2] : -ed[2];
	}

	/** Index to a page: along the links when a route exists, otherwise an arc that stands for the missing link. */
	playFlow(o: FlowOptions = {}): FlowResult | null {
		const from = this.indexCell();
		if (!from) return null;
		let target: Cell | undefined;
		if (o.to) target = this.byPath.get(o.to);
		else if (o.mode === "selected") target = this.selected >= 0 ? this.nodes[this.selected] : undefined;
		else {
			const key = o.mode === "edited" ? "mtime" : "ctime";
			for (const n of this.nodes) {
				if (n.off || n.isIndex || n.isLog) continue;
				if (!target || n[key] > target[key]) target = n;
			}
		}
		if (!target || target === from || target.off) return null;
		const allowed = (i: number) => !this.nodes[i].off && (!o.viewOnly || this.onScreen(this.nodes[i]));
		const route = findRoute(this.nodes.map((n) => n.adj), from.id, target.id, (i) => allowed(i) || i === from.id || i === target!.id, 8);
		const segs: [number, number, number, number][] = [];
		if (route) {
			for (let i = 0; i + 1 < route.length; i++) segs.push([route[i], route[i + 1], this.edgeK(route[i], route[i + 1]) ?? 0.1, this.edgeOf(route[i], route[i + 1])]);
		} else {
			segs.push([from.id, target.id, 0.3, -1]);
		}
		this.packets.push({ segs, seg: 0, t: 0, v: this.packetSpeed(), virtual: !route, fade: 1, done: false });
		from.pulse = 1;
		from.lit = this.tNow + 2500;
		this.start();
		return { from: from.path, to: target.path, hops: segs.length, virtual: !route };
	}

	setPinned(paths: string[]): void {
		this.pinnedSet = new Set(paths);
		for (const n of this.nodes) n.pinned = this.pinnedSet.has(n.path);
	}

	/** Pin a page where it is (it stops moving), or release it. Returns true when it is now pinned. */
	togglePin(path: string): boolean {
		const n = this.byPath.get(path);
		if (!n) return false;
		n.pinned = !n.pinned;
		if (n.pinned) this.pinnedSet.add(path);
		else this.pinnedSet.delete(path);
		n.vx = n.vy = n.vz = 0;
		this.opts.onPin?.(Array.from(this.pinnedSet));
		this.opts.onSelect(this.selected >= 0 ? this.infoOf(this.selected) : null);
		this.alpha = Math.max(this.alpha, 0.1);
		this.start();
		return n.pinned;
	}

	/** Attention: `focus` reaches pages it does not link to, with weights that exist only for the moment (dashed arcs, brighter = heavier). */
	attend(focus: string, items: { path: string; w: number }[]): number {
		const from = this.byPath.get(focus);
		if (!from || from.off) return 0;
		let n = 0;
		for (const it of items) {
			const to = this.byPath.get(it.path);
			if (!to || to.off || to === from) continue;
			const segs: [number, number, number, number][] = [[from.id, to.id, 0.3, -1]];
			this.packets.push({ segs, seg: 0, t: 0, v: this.packetSpeed() * (0.5 + it.w * 1.5), virtual: true, fade: 1, done: false });
			to.lit = this.tNow + 1200 + it.w * 3500;
			to.pulse = Math.max(to.pulse, 0.3 + it.w * 0.7);
			n++;
		}
		from.pulse = 1;
		from.lit = this.tNow + 2500;
		if (n) this.start();
		return n;
	}

	/** Ask: matching pages light up and the answer spreads two hops along the links. */
	ask(paths: string[]): number {
		const ids = paths.map((p) => this.byPath.get(p)).filter((n): n is Cell => !!n && !n.off).map((n) => n.id);
		if (!ids.length) return 0;
		const now = this.tNow || performance.now();
		for (const id of ids) {
			this.nodes[id].lit = now + 6500;
			this.nodes[id].pulse = 1;
		}
		const seeds = ids.slice().sort((a, b) => this.nodes[b].deg - this.nodes[a].deg).slice(0, 5);
		// The answer follows the links the way a signal follows axons; charges add up, so a page fed by several matches fires.
		let spikes: Spike[] = this.net ? cascade(this.net, seeds, 3, 40).filter((sp) => !this.nodes[sp.to].off) : [];
		if (spikes.length) {
			if (this.net) hebb(this.net, spikes);
			for (const sp of spikes) this.waves.push({ id: sp.to, from: sp.from, at: now + sp.tick * 420 + Math.random() * 120, fires: sp.fires });
		} else {
			const hits = spreadFrom(this.nodes.map((n) => n.adj), this.nodes.map((n) => n.deg), seeds.slice(0, 3), (i) => !this.nodes[i].off, 2, 4, 24);
			for (const h of hits) this.waves.push({ id: h.id, from: h.from, at: now + h.hop * 420 + Math.random() * 120, fires: true });
		}
		this.start();
		return ids.length;
	}

	/** Replay: the brain empties, then pages return in creation order, each fed from the index. */
	replay(o: { key?: "ctime" | "mtime"; speed?: number; startAt?: number } = {}): boolean {
		if (this.replayState) {
			this.stopReplay();
			return false;
		}
		const index = this.indexCell();
		const key = o.key ?? "ctime";
		const all = index ? creationOrder(this.nodes, index.id, key) : [];
		// Starting from a date: pages from before it are already there, the replay grows the rest.
		const base = o.startAt ? countBefore(all.map((id) => this.nodes[id][key]), o.startAt) : 0;
		const ids = all.slice(base);
		if (!index || !ids.length) return false;
		const present = new Set(all.slice(0, base));
		for (const n of this.nodes) if (n.id !== index.id && !present.has(n.id)) n.replayHidden = true;
		this.packets = [];
		this.signals = [];
		this.replayDone = false;
		this.replayState = { ids, i: 0, next: (this.tNow || performance.now()) + 500, step: clamp(25000 / ids.length, 120, 900), index: index.id, paused: false, speed: o.speed ?? 1, key, base };
		this.applyVisibility();
		return true;
	}

	private revealNext(rp: NonNullable<BrainEngine["replayState"]>, packet: boolean): void {
		const id = rp.ids[rp.i++];
		const n = this.nodes[id];
		n.replayHidden = false;
		n.off = n.typeHidden || n.filtered;
		n.pulse = 1;
		n.lit = this.tNow + 2000;
		if (packet && !n.off) {
			const route = findRoute(this.nodes.map((x) => x.adj), rp.index, id, (j) => !this.nodes[j].off, 8);
			const segs: [number, number, number, number][] = [];
			if (route) for (let k = 0; k + 1 < route.length; k++) segs.push([route[k], route[k + 1], this.edgeK(route[k], route[k + 1]) ?? 0.1, this.edgeOf(route[k], route[k + 1])]);
			else segs.push([rp.index, id, 0.3, -1]);
			this.packets.push({ segs, seg: 0, t: 0, v: this.packetSpeed() * 1.4, virtual: !route, fade: 1, done: false });
		}
		this.opts.onReplay?.({ i: rp.i + rp.base, n: rp.ids.length + rp.base, time: n[rp.key], path: n.path });
	}

	/** True while a flow, an ask wave or a replay is playing. The view waits for this before rebuilding the graph. */
	isBusy(): boolean {
		return this.packets.length > 0 || this.waves.length > 0 || this.replayState !== null;
	}

	isReplaying(): boolean {
		return this.replayState !== null;
	}

	private replayDone = false;

	/** True when the last replay ran to the end (it was not stopped by hand). */
	replayFinished(): boolean {
		return this.replayDone;
	}

	/** Pause or resume the replay; returns true when it is now paused. */
	pauseReplay(): boolean {
		const rp = this.replayState;
		if (!rp) return false;
		rp.paused = !rp.paused;
		if (!rp.paused) {
			rp.next = (this.tNow || performance.now()) + 200;
			this.start();
		}
		return rp.paused;
	}

	setReplaySpeed(x: number): void {
		if (this.replayState) this.replayState.speed = clamp(x, 0.25, 8);
	}

	/** Skip ahead: bring back the next `k` pages at once, without packets. */
	stepReplay(k = 1): void {
		const rp = this.replayState;
		if (!rp) return;
		for (let j = 0; j < k && rp.i < rp.ids.length; j++) this.revealNext(rp, j === k - 1);
		this.applyVisibility();
	}

	stopReplay(): void {
		if (!this.replayState) return;
		this.replayState = null;
		for (const n of this.nodes) n.replayHidden = false;
		this.applyVisibility();
		this.opts.onReplay?.(null);
	}

	/** Lint: ring the flagged pages. */
	flag(paths: string[], ms = 9000): void {
		for (const n of this.nodes) n.flag = false;
		for (const p of paths) {
			const n = this.byPath.get(p);
			if (n) n.flag = true;
		}
		this.flagUntil = this.tNow + ms;
		this.start();
	}

	/** Ingest: the page fires and sends signals to its neighbours. */
	pulse(path: string): void {
		const n = this.byPath.get(path);
		if (!n) return;
		n.pulse = 1;
		n.lit = this.tNow + 2500;
		this.net?.fire(n.id);
		for (const s of this.net?.out[n.id] ?? []) this.sendSignal(n.id, s.to, 1);
		this.alpha = Math.max(this.alpha, 0.2);
		this.start();
	}

	highlight(paths: string[], ms = 6000): void {
		for (const p of paths) {
			const n = this.byPath.get(p);
			if (!n) continue;
			n.lit = this.tNow + ms;
			n.pulse = 1;
		}
		this.start();
	}

	clearMarks(): void {
		for (const n of this.nodes) {
			n.flag = false;
			n.lit = 0;
		}
		this.flagUntil = 0;
		this.waves = [];
		this.packets = [];
		this.start();
	}

	/** A spike leaves the axon of `from` and travels to a dendrite of `to`: only along the direction of the link (both ways if the pages link each other). */
	private sendSignal(from: number, to: number, gen: number): void {
		const e = this.edgeIdx.get(from < to ? from + "," + to : to + "," + from);
		if (e == null || this.signals.length > (this.quality > 1 ? 16 : 6)) return;
		const ed = this.edges[e];
		if (ed[0] !== from && !this.mutual[e]) return;
		const syn = this.net?.out[from].find((x) => x.to === to);
		this.signals.push({ e, t: 0, v: 0.008 + Math.random() * 0.01, rev: ed[1] === from, gen, w: syn?.w ?? 1, m: syn && this.net ? myelinOf(this.net, syn) : 0 });
	}

	private spawnAmbient(): void {
		if (!this.edges.length) return;
		const e = Math.floor(Math.random() * this.edges.length), ed = this.edges[e];
		if (this.nodes[ed[0]].off || this.nodes[ed[1]].off) return;
		const back = this.mutual[e] && Math.random() < 0.5;
		this.sendSignal(back ? ed[1] : ed[0], back ? ed[0] : ed[1], 0);
	}

	/* ---------- Ports: where each link leaves the neuron ---------- */

	private assignPorts(): void {
		for (const n of this.nodes) n.din = 0;
		this.edges.forEach((e, i) => {
			this.nodes[e[1]].din++;
			if (e[0] !== e[1] && this.mutual[i]) this.nodes[e[0]].din++;
		});
		assignPortsPure(this.nodes, this.edges, (n, want) => {
			const c = n as Cell, r = rng(hashStr(c.path) ^ 0x5bd1e995);
			growDendrites(c.den, this.makeDendrites(c.type, r), want, r);
		}, (ei, id) => this.edges[ei][0] === id && !this.mutual[ei]); // a one-way link leaves through the axon of the page that holds it
		for (const n of this.nodes) n.axon = freeDirection(n.den);
		this.portsDirty = false;
	}

	private denScale(n: Cell): number {
		return n.pr * Math.min(1, (40 * this.dpr) / (5 * n.pr));
	}

	private denVisible(n: Cell): boolean {
		return !this.lowDetail && n.pr > 2.2 * this.dpr;
	}

	/** Screen position where dendrite `di` of `n` ends, and the direction it points. */
	private anchorOf(n: Cell, di: number, out: Float64Array, o: number): void {
		if (di < 0) {
			const tip = this.axonGeom(n)?.tips[-1 - di];
			if (tip) {
				out[o] = tip[0]; out[o + 1] = tip[1]; out[o + 2] = tip[2]; out[o + 3] = tip[3];
				return;
			}
			const [vx, vy] = this.rotv(n.axon), l = Math.hypot(vx, vy) || 1; // axon foreshortened: leave from the soma edge
			out[o] = n.px + (vx / l) * n.pr * 0.9; out[o + 1] = n.py + (vy / l) * n.pr * 0.9; out[o + 2] = vx / l; out[o + 3] = vy / l;
			return;
		}
		const d = n.den[di];
		if (!d) {
			out[o] = n.px; out[o + 1] = n.py; out[o + 2] = 0; out[o + 3] = 0;
			return;
		}
		const [rx, ry] = this.rotv(d.t);
		const len = Math.hypot(rx, ry) || 1;
		const k = this.denVisible(n) ? this.denScale(n) : (n.pr * 0.9) / Math.hypot(d.t[0], d.t[1], d.t[2] || 1);
		out[o] = n.px + rx * k;
		out[o + 1] = n.py + ry * k;
		out[o + 2] = rx / len;
		out[o + 3] = ry / len;
	}

	/** Anchors of one link only (the large-graph path draws most links as straight lines and needs curves for few). */
	private anchorEdge(i: number): void {
		if (this.anc.length < this.edges.length * 8) this.anc = new Float64Array(this.edges.length * 8);
		const e = this.edges[i];
		this.anchorOf(this.nodes[e[0]], e[4], this.anc, i * 8);
		this.anchorOf(this.nodes[e[1]], e[5], this.anc, i * 8 + 4);
	}

	private computeAnchors(): void {
		if (this.anc.length < this.edges.length * 8) this.anc = new Float64Array(this.edges.length * 8);
		for (let i = 0; i < this.edges.length; i++) {
			const e = this.edges[i];
			this.anchorOf(this.nodes[e[0]], e[4], this.anc, i * 8);
			this.anchorOf(this.nodes[e[1]], e[5], this.anc, i * 8 + 4);
		}
	}

	/** The link as a cubic: it leaves each dendrite tip along the branch, then bends toward the other cell. */
	private ePts(ei: number, fwd: boolean): number[] {
		if (this.simpleEdges) this.anchorEdge(ei);
		return edgeCurve(this.anc, ei * 8, fwd, this.edges[ei][2]);
	}

	/** A point along a link, soma to dendrite, then the process, then the other dendrite to its soma. */
	private edgePoint(ei: number, fwd: boolean, t: number): [number, number] {
		const ed = this.edges[ei], na = this.nodes[fwd ? ed[0] : ed[1]], nb = this.nodes[fwd ? ed[1] : ed[0]];
		const c = this.ePts(ei, fwd);
		if (t < 0.1) {
			const u = t / 0.1;
			return [na.px + (c[0] - na.px) * u, na.py + (c[1] - na.py) * u];
		}
		if (t > 0.9) {
			const u = (t - 0.9) / 0.1;
			return [c[6] + (nb.px - c[6]) * u, c[7] + (nb.py - c[7]) * u];
		}
		const s = (t - 0.1) / 0.8, v = 1 - s;
		return [
			v * v * v * c[0] + 3 * v * v * s * c[2] + 3 * v * s * s * c[4] + s * s * s * c[6],
			v * v * v * c[1] + 3 * v * v * s * c[3] + 3 * v * s * s * c[5] + s * s * s * c[7],
		];
	}

	/* ---------- Physics ---------- */

	private simStep(k: number): void {
		stepPhysics(this.nodes, this.edges, k);
	}

	/* ---------- Theme ---------- */

	readTheme(): void {
		const light = document.body.classList.contains("theme-light");
		const cs = getComputedStyle(this.canvas);
		this.pal = COLORS[light ? "light" : "dark"];
		this.edgeRGB = light ? "67,56,202" : "139,151,255";
		this.labelColor = cs.getPropertyValue("--text-normal").trim() || (light ? "#222" : "#e8eaf0");
		this.bgColor = cs.getPropertyValue("--background-primary").trim() || (light ? "#fff" : "#0d1017");
		this.warnColor = light ? "#b45309" : "#f59e0b";
		this.ghostAlpha = light ? 0.7 : 0.55;
		this.light = light;
		this.boutonColor = light ? "rgb(30,40,60)" : "rgb(230,255,251)";
		for (const t of TYPES) {
			this.sprites[t] = makeSprite(this.pal[t], light ? 0.22 : 0.4);
			this.glowSprites[t] = makeSprite(this.pal[t], light ? 0.22 : 0.4, false);
			this.somaStops[t] = [mix(this.pal[t], [255, 255, 255], 0.75), this.pal[t], mix(this.pal[t], [0, 0, 0], 0.5)];
			this.palRGB[t] = hexToRgb(this.pal[t]).join(",");
		}
		this.ghost = makeGhost(this.edgeRGB);
		this.start();
	}

	/* ---------- Input ---------- */

	private bind(): void {
		const c = this.canvas;
		const on = <K extends keyof HTMLElementEventMap>(t: K, fn: (e: HTMLElementEventMap[K]) => void, o?: AddEventListenerOptions) => {
			c.addEventListener(t, fn as EventListener, o);
			this.cleanups.push(() => c.removeEventListener(t, fn as EventListener));
		};
		const toCanvas = (e: { clientX: number; clientY: number }) => {
			const r = c.getBoundingClientRect();
			return { x: (e.clientX - r.left) * (this.W / r.width), y: (e.clientY - r.top) * (this.H / r.height), r };
		};
		on("pointerdown", (e) => {
			this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
			try { c.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
			if (this.pts.size === 1) {
				this.down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
				this.panning = e.button === 1 || e.button === 2 || e.shiftKey;
				this.dragging = true;
				this.vyaw = this.vpitch = 0;
				this.hist = [];
			}
			if (this.pts.size === 2) {
				const [a, b] = Array.from(this.pts.values());
				this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.zoom };
			}
		});
		on("pointermove", (e) => {
			const p = this.pts.get(e.pointerId);
			if (!p) {
				if (e.pointerType === "mouse") {
					const h = this.pick(e);
					if (h !== this.hovered) {
						this.hovered = h;
						this.opts.onHover(h >= 0 ? this.nodes[h].path : null, e);
						c.style.cursor = h >= 0 ? "pointer" : "";
						this.start();
					}
				}
				return;
			}
			const dx = e.clientX - p.x, dy = e.clientY - p.y;
			p.x = e.clientX;
			p.y = e.clientY;
			const { r } = toCanvas(e);
			if (this.pts.size === 2 && this.pinch) {
				const [a, b] = Array.from(this.pts.values());
				const m = toCanvas({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
				this.zoomAt((this.pinch.z * Math.hypot(a.x - b.x, a.y - b.y)) / this.pinch.d, m.x, m.y, false);
				this.panX += dx * (this.W / r.width) * 0.5;
				this.panY += dy * (this.H / r.height) * 0.5;
				this.tpx = this.panX;
				this.tpy = this.panY;
				return;
			}
			if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > (e.pointerType === "mouse" ? 4 : 10)) this.down.moved = true;
			if (this.down?.moved) {
				if (this.panning) {
					this.panX += dx * (this.W / r.width);
					this.panY += dy * (this.H / r.height);
					this.tpx = this.panX;
					this.tpy = this.panY;
				} else {
					const ry = (dx / r.width) * Math.PI * 1.1, rx = (dy / r.height) * Math.PI * 0.9;
					this.yaw += ry;
					this.pitch = clamp(this.pitch + rx, -1.25, 1.25);
					this.hist.push([performance.now(), ry, rx]);
					if (this.hist.length > 6) this.hist.shift();
				}
				this.start();
			}
		});
		const end = (e: PointerEvent) => {
			if (!this.pts.has(e.pointerId)) return;
			this.pts.delete(e.pointerId);
			this.pinch = null;
			try { c.releasePointerCapture(e.pointerId); } catch { /* already released */ }
			if (this.pts.size > 0) return;
			this.dragging = false;
			this.panning = false;
			const now = performance.now();
			if (this.down && !this.down.moved && e.type === "pointerup" && now - this.down.t < 500) {
				const h = this.pick(e);
				const dbl = this.lastTap && now - this.lastTap.t < 320 && Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < 24;
				if (dbl) {
					if (h >= 0) {
						this.select(h);
						this.flyTo(this.nodes[h]);
						this.opts.onOpen(this.nodes[h].path);
					} else this.resetView();
					this.lastTap = null;
				} else {
					this.select(h === this.selected ? -1 : h); // click selects and keeps the selection; click again or on empty space clears
					this.lastTap = { x: e.clientX, y: e.clientY, t: now };
				}
			} else if (this.down?.moved && !this.opts.reducedMotion && this.hist.length > 1) {
				const span = this.hist[this.hist.length - 1][0] - this.hist[0][0] || 1;
				if (now - this.hist[this.hist.length - 1][0] < 80) {
					let sy = 0, sx = 0;
					for (let i = 1; i < this.hist.length; i++) { sy += this.hist[i][1]; sx += this.hist[i][2]; }
					this.vyaw = (sy / span) * 16.67;
					this.vpitch = (sx / span) * 16.67;
				}
			}
			this.down = null;
			this.start();
		};
		on("pointerup", end);
		on("pointercancel", end);
		on("pointerleave", () => {
			if (this.hovered !== -1 && !this.dragging) {
				this.hovered = -1;
				this.opts.onHover(null);
				this.start();
			}
		});
		on("contextmenu", (e) => e.preventDefault());
		on("wheel", (e) => {
			e.preventDefault();
			const p = toCanvas(e);
			this.zoomAt(this.zoom * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.006)), p.x, p.y, false);
		}, { passive: false });
		on("keydown", (e) => {
			const k = e.key, step = 0.12;
			let ok = true;
			if (k === "ArrowLeft") this.yaw -= step;
			else if (k === "ArrowRight") this.yaw += step;
			else if (k === "ArrowUp") this.pitch = clamp(this.pitch - step, -1.25, 1.25);
			else if (k === "ArrowDown") this.pitch = clamp(this.pitch + step, -1.25, 1.25);
			else if (k === "+" || k === "=") this.zoomAt(this.tz * 1.2, this.W / 2, this.H / 2, true);
			else if (k === "-" || k === "_") this.zoomAt(this.tz / 1.2, this.W / 2, this.H / 2, true);
			else if (k === "0") this.resetView();
			else if (k === "f" || k === "F") this.opts.onFullscreen();
			else if (k === "Escape") this.select(-1);
			else if (k === "Enter" && this.selected >= 0) {
				this.flyTo(this.nodes[this.selected]);
				this.opts.onOpen(this.nodes[this.selected].path);
			} else if (k === "]" || k === "[" || k === "n" || k === "p") {
				const hubs = this.nodes.filter((n) => !n.off).sort((a, b) => b.deg - a.deg);
				if (hubs.length) {
					this.hubPos = (this.hubPos + (k === "]" || k === "n" ? 1 : -1) + hubs.length) % hubs.length;
					this.select(hubs[this.hubPos].id);
				}
			} else ok = false;
			if (ok) {
				e.preventDefault();
				this.auto = false;
				this.start();
			}
		});
	}

	private pick(e: { clientX: number; clientY: number; pointerType?: string }): number {
		const r = this.canvas.getBoundingClientRect();
		const x = (e.clientX - r.left) * (this.W / r.width), y = (e.clientY - r.top) * (this.H / r.height);
		const pad = (e.pointerType === "touch" ? 22 : 12) * this.dpr;
		let best = -1, bd = 1e9;
		for (const n of this.nodes) {
			if (n.off) continue;
			const d = Math.hypot(n.px - x, n.py - y) - n.pr;
			if (d < pad && d < bd) {
				bd = d;
				best = n.id;
			}
		}
		return best;
	}

	private resize(): void {
		const box = this.canvas.parentElement ?? this.canvas;
		const cssW = Math.max(1, box.clientWidth), cssH = Math.max(1, box.clientHeight);
		let dpr = Math.min(2, window.devicePixelRatio || 1);
		if (cssW * cssH * dpr * dpr > 2.6e6) dpr = Math.max(1, Math.sqrt(2.6e6 / (cssW * cssH))); // keep very large panes affordable
		this.dpr = dpr;
		this.canvas.style.width = cssW + "px";
		this.canvas.style.height = cssH + "px";
		this.W = this.canvas.width = Math.round(cssW * dpr);
		this.H = this.canvas.height = Math.round(cssH * dpr);
		this.start();
	}

	/* ---------- Loop ---------- */

	start(): void {
		if (this.running || !this.visible) return;
		this.running = true;
		this.last = performance.now();
		this.raf = requestAnimationFrame((t) => this.frame(t));
	}

	destroy(): void {
		cancelAnimationFrame(this.raf);
		this.running = false;
		this.ro.disconnect();
		this.io?.disconnect();
		this.cleanups.forEach((f) => f());
		this.cleanups = [];
	}

	private tune(ms: number): void {
		const mode = this.opts.detail();
		if (mode !== "auto") {
			this.quality = mode === "high" ? 2 : 0;
			this.ema = ms;
			this.frameMs = ms;
			return;
		}
		this.ema = this.ema * 0.9 + ms * 0.1;
		this.frameMs = this.ema;
		this.frames++;
		if (this.frames % 20) return;
		if (this.ema > 18) { // over ~55 fps: give up detail, spines and the axon first
			this.fast = 0;
			if (++this.slow >= 2 && this.quality > 0) {
				this.quality--;
				this.slow = 0;
			}
		} else if (this.ema < 9) {
			this.slow = 0;
			if (++this.fast >= 10 && this.quality < 2) {
				this.quality++;
				this.fast = 0;
			}
		} else {
			this.slow = 0;
			this.fast = 0;
		}
	}

	private frame(now: number): void {
		const dt = Math.min(48, now - this.last) / 16.67;
		this.last = now;
		this.tNow = now;
		let busy = false; // something the user is driving or a one-off effect
		let ambientOnly = false;
		if (this.alpha > 0.004) {
			// A step costs time in proportion to the nodes: with thousands, one step every few frames keeps the view responsive while it settles.
			if (++this.simTick >= Math.min(4, Math.ceil(this.nodes.length / 3000))) {
				this.simTick = 0;
				this.simStep(this.alpha);
				this.alpha *= 0.965;
				this.portsDirty = true;
			}
			busy = true;
		} else {
			this.alpha = 0;
			if (this.portsDirty) {
				this.assignPorts(); // the layout settled: re-aim every link at the nearest free branch
				this.opts.onSettled?.();
			}
		}
		if (!this.dragging) {
			if (Math.abs(this.vyaw) > 1e-4 || Math.abs(this.vpitch) > 1e-4) {
				this.yaw += this.vyaw * dt;
				this.pitch = clamp(this.pitch + this.vpitch * dt, -1.25, 1.25);
				this.vyaw *= 0.94;
				this.vpitch *= 0.94;
				busy = true;
			} else if (this.auto && this.hovered === -1) {
				this.yaw += 0.0016 * dt;
				ambientOnly = true;
			}
		}
		if (this.animating) {
			const k = 1 - Math.pow(0.001, dt / 14);
			this.zoom += (this.tz - this.zoom) * k;
			this.panX += (this.tpx - this.panX) * k;
			this.panY += (this.tpy - this.panY) * k;
			if (Math.abs(this.tz - this.zoom) < 0.002 && Math.abs(this.tpx - this.panX) < 0.4 && Math.abs(this.tpy - this.panY) < 0.4) {
				this.zoom = this.tz;
				this.panX = this.tpx;
				this.panY = this.tpy;
				this.animating = false;
			}
			busy = true;
		}
		if (this.net && this.tNow >= this.leakAt) {
			this.net.tick();
			this.leakAt = this.tNow + 350;
		}
		// Ambient signals keep the brain alive between events.
		const amb = this.opts.ambient();
		if (amb > 0 && !this.opts.reducedMotion && this.quality > 0) {
			if (Math.random() < (amb === 2 ? 0.07 : 0.028) * dt) this.spawnAmbient();
			ambientOnly = true;
		}
		for (let i = this.signals.length - 1; i >= 0; i--) {
			const s = this.signals[i];
			s.t += s.v * dt * conduction(s.m, s.t);
			if (this.signals.length) ambientOnly = true;
			if (s.t < 1) continue;
			const ed = this.edges[s.e], to = s.rev ? ed[0] : ed[1], tn = this.nodes[to];
			this.signals.splice(i, 1);
			// The dendrite receives: the soma adds the charge and fires all-or-nothing once it crosses its threshold.
			if (this.net?.receive(to, s.w)) {
				tn.pulse = 1;
				tn.lit = this.tNow + 1800;
				if (s.gen < 3) for (const o of this.net.fire(to)) this.sendSignal(to, o.to, s.gen + 1);
				else this.net.fire(to);
			} else {
				tn.pulse = Math.max(tn.pulse, s.w < 0 ? 0.1 : 0.25); // charged (or held back by an inhibitory spike), not fired
			}
		}
		for (let i = this.packets.length - 1; i >= 0; i--) {
			const p = this.packets[i];
			busy = true;
			if (p.done) {
				p.fade -= dt / 70;
				if (p.fade <= 0) this.packets.splice(i, 1);
				continue;
			}
			p.t += p.v * dt;
			if (p.t < 1) continue;
			const [, to] = p.segs[p.seg];
			const tn = this.nodes[to];
			tn.pulse = 1;
			tn.lit = this.tNow + 3500;
			p.seg++;
			p.t = 0;
			if (p.seg >= p.segs.length) {
				p.done = true;
				tn.lit = this.tNow + 6000;
				this.alpha = Math.max(this.alpha, 0.1);
			}
		}
		for (let i = this.waves.length - 1; i >= 0; i--) {
			const w = this.waves[i];
			busy = true;
			if (this.tNow < w.at) continue;
			const n = this.nodes[w.id];
			n.pulse = w.fires ? 1 : 0.35;
			n.lit = this.tNow + (w.fires ? 3200 : 900);
			if (w.from >= 0 && !this.opts.reducedMotion) this.sendSignal(w.from, w.id, 3);
			this.waves.splice(i, 1);
		}
		const rp = this.replayState;
		if (rp && !rp.paused) {
			busy = true;
			if (this.tNow >= rp.next) {
				this.revealNext(rp, true);
				rp.next = this.tNow + rp.step / rp.speed;
				if (rp.i >= rp.ids.length) {
					this.replayState = null;
					this.replayDone = true;
					this.opts.onStatus(this.opts.text("status.replayDone"));
					this.opts.onReplay?.(null);
				}
			}
		}
		for (const n of this.nodes) {
			if (n.pulse > 0) {
				n.pulse = Math.max(0, n.pulse - 0.012 * dt);
				busy = true;
			}
			if (this.tNow < n.lit) busy = true;
		}
		if (this.tNow < this.flagUntil) busy = true;
		else if (this.flagUntil) {
			this.flagUntil = 0;
			for (const n of this.nodes) n.flag = false;
		}
		// With only ambient motion on screen, 30 fps is plenty and saves battery.
		const idleOnly = !busy && ambientOnly;
		if (!idleOnly || now - this.lastDraw >= 33) {
			const t0 = performance.now();
			try {
				this.draw();
			} catch (err) {
				this.quality = 0;
				this.signals = [];
				console.warn("llm-wiki-brain: draw failed", err);
				this.reportDrawFailure(this.opts.text("status.drawFailed", { error: err instanceof Error ? err.message : String(err) }));
			}
			this.lastDraw = now;
			this.tune(performance.now() - t0);
		}
		if ((busy || ambientOnly) && this.canvas.isConnected && this.visible) this.raf = requestAnimationFrame((t) => this.frame(t));
		else this.running = false;
	}

	/* ---------- Draw ---------- */

	private ctrl(a: Cell, b: Cell, k: number): [number, number] {
		return [(a.px + b.px) / 2 - (b.py - a.py) * k, (a.py + b.py) / 2 + (b.px - a.px) * k];
	}

	private rotv(v: number[]): [number, number] {
		const x1 = v[0] * this.camCy + v[2] * this.camSy, z1 = -v[0] * this.camSy + v[2] * this.camCy;
		return [x1, v[1] * this.camCp - z1 * this.camSp];
	}

	private project(): void {
		const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
		this.S0 = (Math.min(this.W, this.H * 1.05) / 470) * this.zoom;
		this.camCy = cy; this.camSy = sy; this.camCp = cp; this.camSp = sp;
		const cx = this.W / 2 + this.panX, cyy = this.H / 2 + this.panY, rk = this.S0 * Math.pow(this.zoom, -0.35) * 0.62;
		for (const n of this.nodes) {
			const x1 = n.x * cy + n.z * sy, z1 = -n.x * sy + n.z * cy, y1 = n.y * cp - z1 * sp, z2 = n.y * sp + z1 * cp, p = DIST / (DIST + z2);
			n.px = cx + x1 * p * this.S0;
			n.py = cyy + y1 * p * this.S0;
			n.pz = z2;
			n.pd = clamp((z2 + 260) / 520, 0, 1);
			n.pr = (2.1 + Math.sqrt(n.deg) * 1.2 + n.pulse * 6) * p * rk * (n.isIndex ? 1.5 : 1);
		}
	}

	private edgePath(list: number[]): void {
		const ctx = this.ctx;
		if (this.simpleEdges) { // thousands of links: straight lines between the somas, no dendrite geometry
			for (const i of list) {
				const e = this.edges[i], a = this.nodes[e[0]], b = this.nodes[e[1]];
				if ((a.px < 0 && b.px < 0) || (a.px > this.W && b.px > this.W) || (a.py < 0 && b.py < 0) || (a.py > this.H && b.py > this.H)) continue;
				ctx.moveTo(a.px, a.py);
				ctx.lineTo(b.px, b.py);
			}
			return;
		}
		for (const i of list) {
			const c = this.ePts(i, true);
			ctx.moveTo(c[0], c[1]);
			ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
		}
	}

	private draw(): void {
		const ctx = this.ctx, dpr = this.dpr, nodes = this.nodes;
		ctx.clearRect(0, 0, this.W, this.H);
		this.project();
		this.lowDetail = nodes.length > 600 || this.quality === 0;
		this.simpleEdges = this.edges.length > 3500;
		if (!this.simpleEdges) this.computeAnchors();
		if (this.ghost) {
			ctx.globalAlpha = this.ghostAlpha;
			for (const L of LOBES) {
				const x = L.c[0] * this.camCy + L.c[2] * this.camSy, z1 = -L.c[0] * this.camSy + L.c[2] * this.camCy;
				const y = L.c[1] * this.camCp - z1 * this.camSp, z2 = L.c[1] * this.camSp + z1 * this.camCp, p = DIST / (DIST + z2);
				const rx = Math.max(L.r[0], L.r[2]) * 1.08 * p * this.S0, ry = L.r[1] * 1.12 * p * this.S0;
				ctx.drawImage(this.ghost, this.W / 2 + this.panX + x * p * this.S0 - rx, this.H / 2 + this.panY + y * p * this.S0 - ry, rx * 2, ry * 2);
			}
			ctx.globalAlpha = 1;
		}
		const f = this.hovered !== -1 ? this.hovered : this.selected, fn = f >= 0 ? nodes[f] : null;
		const nb = new Uint8Array(nodes.length);
		if (fn) {
			nb[f] = 1;
			for (const j of fn.adj) nb[j] = 1;
		}
		const bk: number[][] = [[], [], []], tracts: number[] = [];
		for (let i = 0; i < this.edges.length; i++) {
			const e = this.edges[i], a = nodes[e[0]], b = nodes[e[1]];
			if (a.off || b.off) continue;
			if (e[3]) tracts.push(i);
			bk[this.quality ? Math.min(2, Math.floor(((a.pd + b.pd) / 2) * 3)) : 1].push(i);
		}
		ctx.lineWidth = Math.max(1, dpr * 0.9);
		const dimAll = fn || this.matchActive;
		for (let q = 2; q >= 0; q--) {
			if (!bk[q].length) continue;
			const base = 0.34 - q * 0.1;
			ctx.strokeStyle = "rgba(" + this.edgeRGB + "," + (dimAll ? base * 0.3 : base) + ")";
			ctx.beginPath();
			this.edgePath(bk[q]);
			ctx.stroke();
		}
		if (tracts.length) {
			ctx.lineWidth = dpr * 1.7;
			ctx.strokeStyle = "rgba(" + this.palRGB.entity + "," + (dimAll ? 0.12 : 0.34) + ")";
			ctx.beginPath();
			this.edgePath(tracts);
			ctx.stroke();
		}
		if (fn) {
			ctx.strokeStyle = "rgba(" + this.edgeRGB + ",0.9)";
			ctx.lineWidth = dpr * 1.7;
			ctx.beginPath();
			for (const e of this.edges) {
				if (e[0] !== f && e[1] !== f) continue;
				const a = nodes[e[0]], b = nodes[e[1]];
				if (a.off || b.off) continue;
				const c = this.ePts(this.edgeOf(e[0], e[1]), true);
				ctx.moveTo(c[0], c[1]);
				ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
			}
			ctx.stroke();
		}
		this.drawRoutes();
		const order = this.order;
		order.sort((p, q) => q.pz - p.pz); // far to near; the sort is adaptive, so a barely changed order costs about one pass
		const m = 70 * dpr, warn = this.tNow < this.flagUntil, lowDetail = this.lowDetail;
		// Full neurons are costly (a polygon, a gradient, branches): only the biggest on screen get one, the rest are sprites.
		const budget = this.quality > 1 ? 350 : this.quality === 1 ? 140 : 0;
		if (this.fullFlags.length !== nodes.length) this.fullFlags = new Uint8Array(nodes.length);
		const full = this.fullFlags; // 1 = gets a full neuron this frame (ties in pr must not defeat the budget); reused, no per-frame allocation
		full.fill(0);
		if (order.length > budget) {
			const on = this.candBuf;
			on.length = 0;
			for (const n of order) if (!n.off && n.pr > 4.5 * dpr) on.push(n);
			if (on.length > budget) on.sort((p, q) => q.pr - p.pr);
			for (let i = 0; i < Math.min(budget, on.length); i++) full[on[i].id] = 1;
		} else for (const n of order) full[n.id] = 1;
		let rings = 400; // pulse rings are a stroke each: a vault that just loaded must not draw ten thousand
		for (const n of order) {
			if (n.off || n.px < -m || n.px > this.W + m || n.py < -m || n.py > this.H + m) continue;
			const dim = (fn && !nb[n.id]) || (this.matchActive && !n.match && n.id !== f);
			const al = clamp((1 - n.pd * 0.62) * (dim ? 0.16 : 1), 0.05, 1), size = n.pr * 4.55;
			ctx.globalAlpha = 1;
			if (!lowDetail) this.drawDendrites(n, al * 0.65);
			if (!lowDetail && this.quality > 1 && n.pr > 6 * dpr) this.drawAxon(n, al);
			ctx.globalAlpha = al;
			const special = n.id === f || n.id === this.selected || this.tNow < n.lit || (this.matchActive && n.match);
			if (this.quality > 0 && n.pr > 4.5 * dpr && (full[n.id] === 1 || special)) {
				const gl = this.glowSprites[n.type];
				if (gl) ctx.drawImage(gl, n.px - size / 2, n.py - size / 2, size, size);
				this.drawSoma(n, al);
			} else {
				const sp = this.sprites[n.type];
				if (sp) ctx.drawImage(sp, n.px - size / 2, n.py - size / 2, size, size);
			}
			const charge = this.net && this.quality > 0 ? this.net.charge(n.id) : 0;
			if (charge > 0.04 && n.pr > 3 * dpr) { // membrane potential: the arc closes as the cell nears its threshold
				ctx.globalAlpha = (0.35 + 0.5 * charge) * al;
				ctx.lineWidth = Math.max(1.2 * dpr, n.pr * 0.12);
				ctx.strokeStyle = this.boutonColor;
				ctx.lineCap = "round";
				ctx.beginPath();
				ctx.arc(n.px, n.py, n.pr * 1.28, -1.5708, -1.5708 + 6.2832 * charge);
				ctx.stroke();
			}
			if (n.pulse > 0.08 && this.quality > 0 && (rings-- > 0 || special)) {
				ctx.globalAlpha = n.pulse * 0.5 * al;
				ctx.lineWidth = dpr;
				ctx.strokeStyle = "rgb(" + this.palRGB[n.type] + ")";
				ctx.beginPath();
				ctx.arc(n.px, n.py, n.pr * (1.3 + (1 - n.pulse) * 2.4), 0, 6.2832);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			if (n.id === f || n.id === this.selected || this.tNow < n.lit || (this.matchActive && n.match)) {
				ctx.lineWidth = dpr * (n.id === this.selected ? 2.2 : 1.5);
				ctx.strokeStyle = this.labelColor;
				ctx.beginPath();
				ctx.arc(n.px, n.py, n.pr * 1.45 + dpr * 2, 0, 6.2832);
				ctx.stroke();
			}
			if (warn && n.flag) {
				ctx.lineWidth = dpr * 1.6;
				ctx.strokeStyle = this.warnColor;
				ctx.setLineDash([3 * dpr, 3 * dpr]);
				ctx.beginPath();
				ctx.arc(n.px, n.py, n.pr * 1.9 + dpr * 3, 0, 6.2832);
				ctx.stroke();
				ctx.setLineDash([]);
			}
		}
		this.drawSignals(fn, f);
		this.drawPackets();
		this.drawLabels(f, fn, nb);
	}

	private segPoint(seg: [number, number, number, number], t: number): [number, number] {
		if (seg[3] >= 0) return this.edgePoint(seg[3], this.edges[seg[3]][0] === seg[0], t);
		const a = this.nodes[seg[0]], b = this.nodes[seg[1]], u = 1 - t;
		const [cx, cy] = this.ctrl(a, b, seg[2]);
		return [u * u * a.px + 2 * u * t * cx + t * t * b.px, u * u * a.py + 2 * u * t * cy + t * t * b.py];
	}

	/** The whole route stays drawn while a packet travels, then fades. Missing links show as a dashed arc. */
	private drawRoutes(): void {
		const ctx = this.ctx, dpr = this.dpr;
		for (const p of this.packets) {
			ctx.globalAlpha = clamp(p.fade, 0, 1) * 0.55;
			ctx.strokeStyle = this.labelColor;
			ctx.lineWidth = dpr * 1.8;
			ctx.setLineDash(p.virtual ? [6 * dpr, 5 * dpr] : []);
			ctx.beginPath();
			for (const s of p.segs) {
				const a = this.nodes[s[0]], b = this.nodes[s[1]];
				if (s[3] >= 0) { // soma, dendrite, process, dendrite, soma
					const c = this.ePts(s[3], this.edges[s[3]][0] === s[0]);
					ctx.moveTo(a.px, a.py);
					ctx.lineTo(c[0], c[1]);
					ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
					ctx.lineTo(b.px, b.py);
					continue;
				}
				const [cx, cy] = this.ctrl(a, b, s[2]);
				ctx.moveTo(a.px, a.py);
				ctx.quadraticCurveTo(cx, cy, b.px, b.py);
			}
			ctx.stroke();
		}
		ctx.setLineDash([]);
		ctx.globalAlpha = 1;
	}

	private drawPackets(): void {
		const ctx = this.ctx, dpr = this.dpr;
		for (const p of this.packets) {
			if (p.done) continue;
			const type = this.nodes[p.segs[p.seg][0]].type, col = this.palRGB[type] ?? "255,255,255";
			for (let i = 10; i >= 0; i--) { // trail: earlier positions along the route, fading
				let tt = p.t - i * 0.05, sg = p.seg;
				while (tt < 0 && sg > 0) {
					sg--;
					tt += 1;
				}
				if (tt < 0) continue;
				const [x, y] = this.segPoint(p.segs[sg], tt), k = 1 - i / 11;
				ctx.globalAlpha = k * 0.8;
				ctx.fillStyle = i === 0 ? this.labelColor : "rgb(" + col + ")";
				ctx.beginPath();
				ctx.arc(x, y, (i === 0 ? 3.4 : 2.6 * k + 0.6) * dpr, 0, 6.2832);
				ctx.fill();
			}
			const [hx, hy] = this.segPoint(p.segs[p.seg], p.t);
			ctx.globalAlpha = 0.35;
			ctx.fillStyle = "rgb(" + col + ")";
			ctx.beginPath();
			ctx.arc(hx, hy, 8 * dpr, 0, 6.2832);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	/** The cell body: not a circle, but pulled out toward each main dendrite, with a lit rim and a darker nucleus. */
	private drawSoma(n: Cell, al: number): void {
		const ctx = this.ctx, dpr = this.dpr, R = n.pr, N = 22;
		const angles: number[] = [];
		for (let i = 0; i < Math.min(5, n.den.length); i++) {
			const [x, y] = this.rotv(n.den[i].t);
			angles.push(Math.atan2(y, x));
		}
		const k = somaRadii(angles, N);
		const px: number[] = [], py: number[] = [];
		for (let i = 0; i < N; i++) {
			const th = (i / N) * 2 * Math.PI;
			px.push(n.px + Math.cos(th) * R * k[i]);
			py.push(n.py + Math.sin(th) * R * k[i]);
		}
		ctx.beginPath();
		ctx.moveTo((px[0] + px[N - 1]) / 2, (py[0] + py[N - 1]) / 2);
		for (let i = 0; i < N; i++) {
			const j = (i + 1) % N;
			ctx.quadraticCurveTo(px[i], py[i], (px[i] + px[j]) / 2, (py[i] + py[j]) / 2);
		}
		ctx.closePath();
		const st = this.somaStops[n.type] ?? ["#fff", "#888", "#000"];
		const g = ctx.createRadialGradient(n.px - R * 0.25, n.py - R * 0.3, R * 0.05, n.px, n.py, R * 1.25);
		g.addColorStop(0, st[0]);
		g.addColorStop(0.45, st[1]);
		g.addColorStop(1, st[2]);
		ctx.globalAlpha = al;
		ctx.fillStyle = g;
		ctx.fill();
		ctx.lineWidth = Math.max(0.6 * dpr, R * 0.07);
		ctx.strokeStyle = this.light ? "rgba(20,30,50,0.55)" : "rgba(220,255,250,0.8)";
		ctx.stroke();
		if (R > 7 * dpr) { // nucleus
			ctx.globalAlpha = al * 0.35;
			ctx.fillStyle = this.light ? "rgb(255,255,255)" : "rgb(10,70,62)";
			ctx.beginPath();
			ctx.ellipse(n.px + R * 0.1, n.py + R * 0.05, R * 0.42, R * 0.36, 0, 0, 6.2832);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	/** Branches narrow along their length; those that carry a link are bright and end in a bouton, free ones stay faint. */
	private drawDendrites(n: Cell, al: number): void {
		const ctx = this.ctx, dpr = this.dpr;
		if (!this.denVisible(n)) return;
		const k = this.denScale(n), col = this.palRGB[n.type] ?? "255,255,255";
		const real = this.quality > 1 && n.pr > 6 * dpr; // spines and branch forks only when the cell is big enough to show them
		const w0 = n.pr * 0.4, w1 = Math.max(0.5 * dpr, n.pr * 0.1);
		for (const used of [false, true]) {
			const a = used ? Math.min(1, al * 1.5) : al * 0.5, tips: number[] = [], spines: number[] = [], forks: number[] = [];
			ctx.fillStyle = "rgba(" + col + "," + a + ")";
			ctx.beginPath();
			for (let i = 0; i < n.den.length; i++) {
				if ((n.port[i] ?? 0) > 0 !== used) continue;
				const d = n.den[i];
				const [r1x, r1y] = this.rotv(d.m), [r2x, r2y] = this.rotv(d.t);
				const mx = n.px + r1x * k, my = n.py + r1y * k, tx = n.px + r2x * k, ty = n.py + r2y * k;
				const pts = quadPoints(n.px, n.py, mx + (ty - my) * 0.3, my - (tx - mx) * 0.3, tx, ty, real ? 7 : 4);
				const poly = taperStrip(pts, w0, w1);
				ctx.moveTo(poly[0], poly[1]);
				for (let j = 2; j < poly.length; j += 2) ctx.lineTo(poly[j], poly[j + 1]);
				ctx.closePath();
				if (real) {
					const sl = Math.max(1.4 * dpr, n.pr * 0.22);
					for (let j = 3; j < pts.length / 2 - 1; j += 2) { // a spine every other point, alternating sides
						const dx = pts[j * 2 + 2] - pts[j * 2 - 2], dy = pts[j * 2 + 3] - pts[j * 2 - 1], l = Math.hypot(dx, dy) || 1;
						const side = ((i * 7 + j) & 1) * 2 - 1;
						spines.push(pts[j * 2], pts[j * 2 + 1], pts[j * 2] - (dy / l) * sl * side, pts[j * 2 + 1] + (dx / l) * sl * side);
					}
				}
				tips.push(tx, ty);
				if (d.b && real && !used) {
					const [r3x, r3y] = this.rotv(d.b);
					forks.push(mx, my, n.px + r3x * k, n.py + r3y * k);
					tips.push(n.px + r3x * k, n.py + r3y * k);
				}
			}
			ctx.fill();
			if (spines.length || forks.length) {
				ctx.strokeStyle = "rgba(" + col + "," + a + ")";
				ctx.lineCap = "round";
				ctx.lineWidth = Math.max(0.6 * dpr, n.pr * 0.06);
				ctx.beginPath();
				for (let i = 0; i < spines.length; i += 4) {
					ctx.moveTo(spines[i], spines[i + 1]);
					ctx.lineTo(spines[i + 2], spines[i + 3]);
				}
				for (let i = 0; i < forks.length; i += 4) {
					ctx.moveTo(forks[i], forks[i + 1]);
					ctx.lineTo(forks[i + 2], forks[i + 3]);
				}
				ctx.stroke();
			}
			const rr = Math.max(0.9 * dpr, n.pr * 0.14) * (used ? 1.3 : 0.8);
			if (used && real) { // the bouton: a glow, then a bright core
				ctx.fillStyle = "rgba(" + col + ",0.35)";
				ctx.beginPath();
				for (let i = 0; i < tips.length; i += 2) {
					ctx.moveTo(tips[i] + rr * 2, tips[i + 1]);
					ctx.arc(tips[i], tips[i + 1], rr * 2, 0, 6.2832);
				}
				ctx.fill();
			}
			ctx.fillStyle = used ? this.boutonColor : "rgba(" + col + "," + a + ")";
			ctx.beginPath();
			for (let i = 0; i < tips.length; i += 2) {
				ctx.moveTo(tips[i] + rr, tips[i + 1]);
				ctx.arc(tips[i], tips[i + 1], rr, 0, 6.2832);
			}
			ctx.fill();
		}
	}

	/** The axon: a cone where it leaves the soma, one thin process, and a few branches that end in boutons. */
	/** Shape of the axon on screen: hillock, trunk, and AXON_TIPS terminals as [x, y, dirX, dirY]. Null when it points at the viewer. */
	private axonGeom(n: Cell): { hx: number; hy: number; ux: number; uy: number; qx: number; qy: number; L: number; cx: number; cy: number; bx: number; by: number; tips: number[][] } | null {
		const R = n.pr, [vx, vy] = this.rotv(n.axon), l = Math.hypot(vx, vy);
		if (l < 0.3) return null;
		const ux = vx / l, uy = vy / l, qx = -uy, qy = ux;
		const hx = n.px + ux * R * 1.7, hy = n.py + uy * R * 1.7;
		const L = R * 4.3 * Math.min(1, l + 0.2), ex = hx + ux * L, ey = hy + uy * L, cx = hx + ux * L * 0.5 + qx * R * 0.9, cy = hy + uy * L * 0.5 + qy * R * 0.9;
		const t = 0.72, u = 1 - t, bx = u * u * hx + 2 * u * t * cx + t * t * ex, by = u * u * hy + 2 * u * t * cy + t * t * ey;
		const tips: number[][] = [[ex, ey, ux, uy]];
		for (const sd of [-1, 1]) {
			const tx = bx + ux * R * 1.2 + qx * R * 1.1 * sd, ty = by + uy * R * 1.2 + qy * R * 1.1 * sd, dx = tx - bx, dy = ty - by, dl = Math.hypot(dx, dy) || 1;
			tips.push([tx, ty, dx / dl, dy / dl]);
		}
		return { hx, hy, ux, uy, qx, qy, L, cx, cy, bx, by, tips };
	}

	private drawAxon(n: Cell, al: number): void {
		const ctx = this.ctx, dpr = this.dpr, R = n.pr;
		const g = this.axonGeom(n);
		if (!g) return;
		const { hx, hy, ux, uy, qx, qy, cx, cy, bx, by, tips } = g;
		const col = this.palRGB[n.type] ?? "255,255,255";
		ctx.fillStyle = "rgba(" + col + "," + al * 0.8 + ")"; // hillock
		ctx.beginPath();
		ctx.moveTo(n.px + ux * R * 0.9 + qx * R * 0.3, n.py + uy * R * 0.9 + qy * R * 0.3);
		ctx.lineTo(n.px + ux * R * 0.9 - qx * R * 0.3, n.py + uy * R * 0.9 - qy * R * 0.3);
		ctx.lineTo(hx, hy);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = "rgba(" + col + "," + al * 0.6 + ")";
		ctx.lineCap = "round";
		ctx.lineWidth = Math.max(0.7 * dpr, R * 0.1);
		ctx.beginPath();
		ctx.moveTo(hx, hy);
		ctx.quadraticCurveTo(cx, cy, tips[0][0], tips[0][1]);
		const ends: number[] = [tips[0][0], tips[0][1]];
		for (const [i, sd] of [[1, -1], [2, 1]]) {
			const [tx, ty] = tips[i];
			ctx.moveTo(bx, by);
			ctx.quadraticCurveTo(bx + ux * R * 0.5 + qx * R * 0.2 * sd, by + uy * R * 0.5 + qy * R * 0.2 * sd, tx, ty);
			ends.push(tx, ty);
		}
		ctx.stroke();
		const rr = Math.max(1.1 * dpr, R * 0.14);
		ctx.fillStyle = "rgba(" + col + ",0.35)";
		ctx.beginPath();
		for (let i = 0; i < ends.length; i += 2) {
			ctx.moveTo(ends[i] + rr * 2, ends[i + 1]);
			ctx.arc(ends[i], ends[i + 1], rr * 2, 0, 6.2832);
		}
		ctx.fill();
		ctx.fillStyle = this.boutonColor;
		ctx.beginPath();
		for (let i = 0; i < ends.length; i += 2) {
			ctx.moveTo(ends[i] + rr, ends[i + 1]);
			ctx.arc(ends[i], ends[i + 1], rr, 0, 6.2832);
		}
		ctx.fill();
	}

	private drawSignals(fn: Cell | null, f: number): void {
		const ctx = this.ctx, dpr = this.dpr;
		for (const s of this.signals) {
			const ed = this.edges[s.e], a = this.nodes[s.rev ? ed[1] : ed[0]], b = this.nodes[s.rev ? ed[0] : ed[1]];
			if (a.off || b.off) continue;
			const [x, y] = this.edgePoint(s.e, !s.rev, s.t);
			const al = (1 - ((a.pd + b.pd) / 2) * 0.6) * (fn && ed[0] !== f && ed[1] !== f ? 0.3 : 1);
			if (this.quality > 0) {
				ctx.globalAlpha = clamp(al, 0.1, 1) * 0.35;
				ctx.fillStyle = s.w < 0 ? "rgb(251,113,133)" : "rgb(" + this.palRGB[a.type] + ")";
				ctx.beginPath();
				ctx.arc(x, y, 5.5 * dpr, 0, 6.2832);
				ctx.fill();
			}
			ctx.globalAlpha = clamp(al, 0.1, 1);
			ctx.fillStyle = s.w < 0 ? "rgb(254,205,211)" : this.labelColor;
			ctx.beginPath();
			ctx.arc(x, y, 2 * dpr, 0, 6.2832);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	private drawLabels(f: number, fn: Cell | null, nb: Uint8Array): void {
		const ctx = this.ctx, dpr = this.dpr;
		const cand: [number, Cell][] = [];
		for (const n of this.nodes) {
			if (n.off) continue;
			const pri = n.id === f ? 0 : n.id === this.selected ? 0.2 : n.isIndex ? 1.1 : fn && nb[n.id] ? 1 : this.tNow < n.lit ? 1.5 : this.matchActive && n.match ? 1.6 : !fn && !this.matchActive && n.deg >= 9 ? 2 + (20 - n.deg) / 100 : -1;
			if (pri >= 0) cand.push([pri, n]);
		}
		cand.sort((p, r) => p[0] - r[0]);
		ctx.font = "600 " + Math.round(12 * dpr) + "px " + (getComputedStyle(this.canvas).fontFamily || "system-ui, sans-serif");
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.lineJoin = "round";
		const drawn: number[][] = [];
		for (let i = 0; i < cand.length && i < 40; i++) {
			const n = cand[i][1], w = ctx.measureText(n.label).width, x = n.px, y = n.py - n.pr * 1.5 - 5 * dpr;
			let hit = false;
			for (const rr of drawn) {
				if (Math.abs(rr[0] - x) < (rr[2] + w) / 2 + 4 && Math.abs(rr[1] - y) < 15 * dpr) {
					hit = true;
					break;
				}
			}
			if (hit && cand[i][0] > 0.2) continue;
			drawn.push([x, y, w]);
			ctx.globalAlpha = cand[i][0] <= 0.2 ? 1 : 0.5 + 0.5 * (1 - n.pd);
			ctx.lineWidth = 4 * dpr;
			ctx.strokeStyle = this.bgColor;
			ctx.strokeText(n.label, x, y);
			ctx.fillStyle = this.labelColor;
			ctx.fillText(n.label, x, y);
		}
		ctx.globalAlpha = 1;
	}
}
