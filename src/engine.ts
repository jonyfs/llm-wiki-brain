/* Brain engine: Canvas 2D with real perspective, depth sorting and neuron-shaped nodes.
   Ported from the llm-wiki-template demo graph (MIT). World space is centred on the origin. */

export type PageType = "source" | "entity" | "concept" | "synthesis";
export const TYPES: PageType[] = ["source", "entity", "concept", "synthesis"];

export interface GraphNode {
	path: string;
	label: string;
	type: PageType;
}

interface Dendrite {
	m: number[];
	t: number[];
	b: number[] | null;
}

interface Cell {
	id: number;
	path: string;
	label: string;
	type: PageType;
	lobe: number;
	side: number;
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	deg: number;
	adj: number[];
	pulse: number;
	lit: number;
	flag: boolean;
	px: number;
	py: number;
	pz: number;
	pr: number;
	pd: number;
	den: Dendrite[];
}

type Edge = [number, number, number, boolean];

interface Lobe {
	c: number[];
	r: number[];
	w: number;
	side: number;
}

const LOBES: Lobe[] = [
	{ c: [-92, -18, 0], r: [150, 120, 130], w: 1.7, side: -1 },
	{ c: [92, -18, 0], r: [150, 120, 130], w: 1.7, side: 1 },
	{ c: [-125, 78, 14], r: [68, 52, 78], w: 0.7, side: -1 },
	{ c: [125, 78, 14], r: [68, 52, 78], w: 0.7, side: 1 },
	{ c: [0, -92, -6], r: [118, 66, 104], w: 0.9, side: 0 },
	{ c: [0, 100, -92], r: [84, 54, 66], w: 0.8, side: 0 },
	{ c: [0, 158, -40], r: [26, 62, 26], w: 0.35, side: 0 },
];
const LOBE_SUM = LOBES.reduce((s, l) => s + l.w, 0);
const GAP = 7;
const DIST = 820;
// One neuron shape per page type: [count, near, far, branch chance, apical length]
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

function makeSprite(color: string, glow: number): HTMLCanvasElement {
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
	gr.addColorStop(0, "rgba(" + rgb + ",0.2)");
	gr.addColorStop(0.75, "rgba(" + rgb + ",0.1)");
	gr.addColorStop(1, "rgba(" + rgb + ",0)");
	g.fillStyle = gr;
	g.fillRect(0, 0, S, S);
	return c;
}

// Gyri and sulci: the outline of each lobe wobbles a little, so the shell reads as folded cortex.
function fold(x: number, y: number, z: number): number {
	return 1 + 0.05 * (Math.sin(x * 0.09) + Math.sin(y * 0.11 + 1.3) + Math.sin(z * 0.1 + 2.1));
}

export interface EngineOptions {
	reducedMotion: boolean;
	onOpen: (path: string) => void;
	onHover: (label: string | null) => void;
}

export class BrainEngine {
	private ctx: CanvasRenderingContext2D;
	private nodes: Cell[] = [];
	private byPath = new Map<string, Cell>();
	private edges: Edge[] = [];
	private edgeIdx = new Map<string, number>();
	private order: Cell[] = [];
	private hidden: Partial<Record<PageType, boolean>> = {};
	private signals: { e: number; t: number; v: number; rev: boolean }[] = [];
	private alpha = 1;
	private yaw = 0.6;
	private pitch = -0.22;
	private zoom = 1;
	private panX = 0;
	private panY = 0;
	private vyaw = 0;
	private vpitch = 0;
	private W = 1;
	private H = 1;
	private dpr = 1;
	private S0 = 1;
	private tNow = 0;
	private last = 0;
	private raf = 0;
	private dragging = false;
	private moved = false;
	private lastX = 0;
	private lastY = 0;
	private hovered = -1;
	private selected = -1;
	private flagUntil = 0;
	private auto: boolean;
	private ro: ResizeObserver;
	private sprites: Partial<Record<PageType, HTMLCanvasElement>> = {};
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

	constructor(private canvas: HTMLCanvasElement, private opts: EngineOptions) {
		this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		this.auto = !opts.reducedMotion;
		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(canvas.parentElement ?? canvas);
		this.bind();
		this.readTheme();
		this.resize();
	}

	/* ---------- Data ---------- */

	/** Replace the graph, keeping the position of pages that already exist so the brain does not jump. */
	setGraph(pages: GraphNode[], links: [string, string][]): void {
		const old = this.byPath;
		const next: Cell[] = [];
		const byPath = new Map<string, Cell>();
		const adjHint = new Map<string, string[]>();
		for (const [a, b] of links) {
			(adjHint.get(a) ?? adjHint.set(a, []).get(a)!).push(b);
			(adjHint.get(b) ?? adjHint.set(b, []).get(b)!).push(a);
		}
		for (const p of pages) {
			const prev = old.get(p.path);
			if (prev) {
				prev.type = p.type;
				prev.label = p.label;
				prev.deg = 0;
				prev.adj = [];
				next.push(prev);
				byPath.set(p.path, prev);
				continue;
			}
			const r = rng(hashStr(p.path));
			let nearCell: Cell | undefined;
			for (const q of adjHint.get(p.path) ?? []) {
				nearCell = byPath.get(q) ?? old.get(q);
				if (nearCell) break;
			}
			const lobe = nearCell ? nearCell.lobe : this.lobeFor(p.path, r);
			let pos = this.pointIn(lobe, r);
			if (nearCell) pos = [nearCell.x + (r() - 0.5) * 30, nearCell.y + (r() - 0.5) * 30, nearCell.z + (r() - 0.5) * 30];
			const cell: Cell = {
				id: 0, path: p.path, label: p.label, type: p.type, lobe, side: LOBES[lobe].side,
				x: pos[0], y: pos[1], z: pos[2], vx: 0, vy: 0, vz: 0, deg: 0, adj: [], pulse: 1, lit: 0, flag: false,
				px: 0, py: 0, pz: 0, pr: 0, pd: 0, den: this.makeDendrites(p.type, r),
			};
			next.push(cell);
			byPath.set(p.path, cell);
		}
		next.forEach((c, i) => (c.id = i));
		this.nodes = next;
		this.byPath = byPath;
		this.order = next.slice();
		this.edges = [];
		this.edgeIdx.clear();
		this.signals = [];
		this.selected = -1;
		this.hovered = -1;
		const er = rng(0x9e3779b1);
		for (const [a, b] of links) {
			const na = byPath.get(a);
			const nb = byPath.get(b);
			if (!na || !nb || na === nb) continue;
			const k = na.id < nb.id ? na.id + "," + nb.id : nb.id + "," + na.id;
			if (this.edgeIdx.has(k)) continue;
			this.edgeIdx.set(k, this.edges.length);
			this.edges.push([na.id, nb.id, (er() < 0.5 ? -1 : 1) * (0.04 + er() * 0.08), na.side !== 0 && nb.side === -na.side]);
			na.deg++;
			nb.deg++;
			na.adj.push(nb.id);
			nb.adj.push(na.id);
		}
		this.alpha = this.opts.reducedMotion ? 0 : 0.6;
		if (this.opts.reducedMotion) for (let s = 0, a = 1; s < 220; s++, a *= 0.985) this.simStep(a);
		this.start();
	}

	private lobeFor(path: string, r: () => number): number {
		// Weighted pick per page; links then pull neighbours together, so communities form on their own.
		let x = r() * LOBE_SUM;
		void path;
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
		if (m[4]) out.push({ m: [0.2, -m[4] * 0.55, 0], t: [0, -m[4], 0.2], b: [0.9, -m[4] * 0.8, 0.3] }); // pyramidal apical dendrite
		return out;
	}

	/* ---------- Live operations ---------- */

	/** Ingest: the page fires and sends signals to its neighbours. */
	pulse(path: string): void {
		const n = this.byPath.get(path);
		if (!n) return;
		n.pulse = 1;
		n.lit = this.tNow + 2500;
		for (const j of n.adj) this.sendSignal(n.id, j);
		this.alpha = Math.max(this.alpha, 0.2);
		this.start();
	}

	/** Query: light up the answer pages and the links between them. */
	highlight(paths: string[], ms = 6000): void {
		for (const p of paths) {
			const n = this.byPath.get(p);
			if (!n) continue;
			n.lit = this.tNow + ms;
			n.pulse = 1;
			for (const j of n.adj) if (paths.includes(this.nodes[j].path)) this.sendSignal(n.id, j);
		}
		this.start();
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

	clearMarks(): void {
		for (const n of this.nodes) {
			n.flag = false;
			n.lit = 0;
		}
		this.flagUntil = 0;
		this.start();
	}

	setHidden(type: PageType, hide: boolean): void {
		this.hidden[type] = hide;
		this.start();
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

	private sendSignal(from: number, to: number): void {
		const k = from < to ? from + "," + to : to + "," + from;
		const e = this.edgeIdx.get(k);
		if (e == null || this.signals.length > 14) return;
		this.signals.push({ e, t: 0, v: 0.008 + Math.random() * 0.01, rev: this.edges[e][1] === from });
	}

	/* ---------- Physics ---------- */

	private simStep(k: number): void {
		const REPEL = 1100, CUT2 = 150 * 150, REST = 34;
		const nodes = this.nodes, n = nodes.length;
		for (let i = 0; i < n; i++) {
			const a = nodes[i];
			for (let j = i + 1; j < n; j++) {
				const b = nodes[j];
				const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d2 = dx * dx + dy * dy + dz * dz + 1;
				if (d2 > CUT2) continue;
				const f = (REPEL * k) / d2 / Math.sqrt(d2);
				a.vx -= f * dx; a.vy -= f * dy; a.vz -= f * dz;
				b.vx += f * dx; b.vy += f * dy; b.vz += f * dz;
			}
		}
		for (const e of this.edges) {
			const a = nodes[e[0]], b = nodes[e[1]];
			const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
			const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, f = ((d - REST) * 0.018 * k) / d;
			a.vx += f * dx; a.vy += f * dy; a.vz += f * dz;
			b.vx -= f * dx; b.vy -= f * dy; b.vz -= f * dz;
		}
		for (const a of nodes) {
			const L = LOBES[a.lobe];
			const ex = (a.x - L.c[0]) / L.r[0], ey = (a.y - L.c[1]) / L.r[1], ez = (a.z - L.c[2]) / L.r[2];
			const q = Math.sqrt(ex * ex + ey * ey + ez * ez), lim = 0.97 * fold(a.x, a.y, a.z);
			if (q > lim) {
				const pull = (q - lim) * 0.12;
				a.vx += (L.c[0] - a.x) * pull; a.vy += (L.c[1] - a.y) * pull; a.vz += (L.c[2] - a.z) * pull;
			}
			a.vx *= 0.84; a.vy *= 0.84; a.vz *= 0.84;
			a.x += a.vx; a.y += a.vy; a.z += a.vz;
			if (a.side && a.x * a.side < GAP) a.x = a.side * GAP; // keep the hemispheres apart
		}
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
		for (const t of TYPES) {
			this.sprites[t] = makeSprite(this.pal[t], light ? 0.22 : 0.4);
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
		on("pointerdown", (e) => {
			this.dragging = true;
			this.moved = false;
			this.lastX = e.clientX;
			this.lastY = e.clientY;
			c.setPointerCapture(e.pointerId);
			this.auto = false;
		});
		on("pointermove", (e) => {
			if (this.dragging) {
				const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
				if (Math.abs(dx) + Math.abs(dy) > 2) this.moved = true;
				this.vyaw = dx * 0.006;
				this.vpitch = dy * 0.006;
				this.yaw += this.vyaw;
				this.pitch = clamp(this.pitch + this.vpitch, -1.3, 1.3);
				this.lastX = e.clientX;
				this.lastY = e.clientY;
			} else {
				const h = this.pick(e);
				if (h !== this.hovered) {
					this.hovered = h;
					this.opts.onHover(h >= 0 ? this.nodes[h].path : null);
				}
			}
			this.start();
		});
		on("pointerup", (e) => {
			this.dragging = false;
			c.releasePointerCapture(e.pointerId);
			if (!this.moved) {
				const h = this.pick(e);
				this.selected = h;
				if (h >= 0) this.opts.onOpen(this.nodes[h].path);
			}
			this.start();
		});
		on("pointerleave", () => {
			if (this.hovered !== -1) {
				this.hovered = -1;
				this.opts.onHover(null);
				this.start();
			}
		});
		on("wheel", (e) => {
			e.preventDefault();
			this.zoom = clamp(this.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.4, 4);
			this.start();
		}, { passive: false });
		on("keydown", (e) => {
			const k = e.key;
			if (k === "ArrowLeft") this.yaw -= 0.1;
			else if (k === "ArrowRight") this.yaw += 0.1;
			else if (k === "ArrowUp") this.pitch = clamp(this.pitch - 0.1, -1.3, 1.3);
			else if (k === "ArrowDown") this.pitch = clamp(this.pitch + 0.1, -1.3, 1.3);
			else if (k === "+" || k === "=") this.zoom = clamp(this.zoom * 1.1, 0.4, 4);
			else if (k === "-") this.zoom = clamp(this.zoom * 0.9, 0.4, 4);
			else return;
			e.preventDefault();
			this.auto = false;
			this.start();
		});
	}

	private pick(e: PointerEvent): number {
		const r = this.canvas.getBoundingClientRect();
		const x = (e.clientX - r.left) * this.dpr, y = (e.clientY - r.top) * this.dpr;
		let best = -1, bd = 1e9;
		for (const n of this.nodes) {
			if (this.hidden[n.type]) continue;
			const d = Math.hypot(n.px - x, n.py - y), rad = Math.max(n.pr * 1.6, 8 * this.dpr);
			if (d < rad && d < bd + (n.pz < 0 ? 0 : 0)) {
				bd = d;
				best = n.id;
			}
		}
		return best;
	}

	private resize(): void {
		const box = this.canvas.parentElement ?? this.canvas;
		const cssW = Math.max(1, box.clientWidth), cssH = Math.max(1, box.clientHeight);
		this.dpr = Math.min(2, window.devicePixelRatio || 1);
		this.canvas.style.width = cssW + "px";
		this.canvas.style.height = cssH + "px";
		this.W = this.canvas.width = Math.round(cssW * this.dpr);
		this.H = this.canvas.height = Math.round(cssH * this.dpr);
		this.start();
	}

	/* ---------- Loop ---------- */

	start(): void {
		if (this.running) return;
		this.running = true;
		this.last = performance.now();
		this.raf = requestAnimationFrame((t) => this.frame(t));
	}

	destroy(): void {
		cancelAnimationFrame(this.raf);
		this.running = false;
		this.ro.disconnect();
		this.cleanups.forEach((f) => f());
		this.cleanups = [];
	}

	private frame(now: number): void {
		const dt = Math.min(50, now - this.last);
		this.last = now;
		this.tNow = now;
		let busy = false;
		if (this.alpha > 0.004) {
			this.simStep(this.alpha);
			this.alpha *= 0.965;
			busy = true;
		}
		if (this.auto) {
			this.yaw += 0.0016 * (dt / 16);
			busy = true;
		}
		if (!this.dragging && (Math.abs(this.vyaw) > 0.0004 || Math.abs(this.vpitch) > 0.0004)) {
			this.yaw += this.vyaw;
			this.pitch = clamp(this.pitch + this.vpitch, -1.3, 1.3);
			this.vyaw *= 0.94;
			this.vpitch *= 0.94;
			busy = true;
		}
		for (const n of this.nodes) {
			if (n.pulse > 0) {
				n.pulse = Math.max(0, n.pulse - dt / 900);
				busy = true;
			}
			if (n.lit > this.tNow) busy = true;
		}
		for (let i = this.signals.length - 1; i >= 0; i--) {
			const s = this.signals[i];
			s.t += s.v * (dt / 16);
			if (s.t >= 1) {
				this.signals.splice(i, 1);
				continue;
			}
			busy = true;
		}
		if (this.tNow < this.flagUntil) busy = true;
		this.draw();
		if (busy && this.canvas.isConnected) this.raf = requestAnimationFrame((t) => this.frame(t));
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

	private project(): number {
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
			n.pr = (2.1 + Math.sqrt(n.deg) * 1.2 + n.pulse * 6) * p * rk;
		}
		return rk;
	}

	private edgePath(list: number[]): void {
		const ctx = this.ctx;
		for (const i of list) {
			const ed = this.edges[i], na = this.nodes[ed[0]], nb = this.nodes[ed[1]];
			const [cx, cy] = this.ctrl(na, nb, ed[2]);
			ctx.moveTo(na.px, na.py);
			ctx.quadraticCurveTo(cx, cy, nb.px, nb.py);
		}
	}

	private draw(): void {
		const ctx = this.ctx, dpr = this.dpr, nodes = this.nodes;
		ctx.clearRect(0, 0, this.W, this.H);
		this.project();
		// brain outline
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
		// edges in three depth buckets (far = faint), tracts on top
		const bk: number[][] = [[], [], []], tracts: number[] = [];
		for (let i = 0; i < this.edges.length; i++) {
			const e = this.edges[i], a = nodes[e[0]], b = nodes[e[1]];
			if (this.hidden[a.type] || this.hidden[b.type]) continue;
			if (e[3]) tracts.push(i);
			bk[Math.min(2, Math.floor(((a.pd + b.pd) / 2) * 3))].push(i);
		}
		ctx.lineWidth = Math.max(1, dpr * 0.9);
		for (let q = 2; q >= 0; q--) {
			if (!bk[q].length) continue;
			const base = 0.34 - q * 0.1;
			ctx.strokeStyle = "rgba(" + this.edgeRGB + "," + (fn ? base * 0.3 : base) + ")";
			ctx.beginPath();
			this.edgePath(bk[q]);
			ctx.stroke();
		}
		if (tracts.length) {
			ctx.lineWidth = dpr * 1.7;
			ctx.strokeStyle = "rgba(" + this.palRGB.entity + "," + (fn ? 0.12 : 0.34) + ")";
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
				if (this.hidden[a.type] || this.hidden[b.type]) continue;
				const [cx, cy] = this.ctrl(a, b, e[2]);
				ctx.moveTo(a.px, a.py);
				ctx.quadraticCurveTo(cx, cy, b.px, b.py);
			}
			ctx.stroke();
		}
		// cells, far to near (the array is almost sorted between frames)
		const order = this.order;
		for (let i = 1; i < order.length; i++) {
			const cur = order[i];
			let j = i - 1;
			while (j >= 0 && order[j].pz < cur.pz) {
				order[j + 1] = order[j];
				j--;
			}
			order[j + 1] = cur;
		}
		const m = 70 * dpr, warn = this.tNow < this.flagUntil, lowDetail = nodes.length > 600;
		for (const n of order) {
			if (this.hidden[n.type] || n.px < -m || n.px > this.W + m || n.py < -m || n.py > this.H + m) continue;
			const dim = fn && !nb[n.id], al = clamp((1 - n.pd * 0.62) * (dim ? 0.16 : 1), 0.05, 1), size = n.pr * 4.55;
			ctx.globalAlpha = 1;
			if (!lowDetail) this.drawDendrites(n, al * 0.65);
			ctx.globalAlpha = al;
			const sp = this.sprites[n.type];
			if (sp) ctx.drawImage(sp, n.px - size / 2, n.py - size / 2, size, size);
			if (n.pulse > 0) {
				ctx.globalAlpha = n.pulse * 0.5 * al;
				ctx.lineWidth = dpr;
				ctx.strokeStyle = "rgb(" + this.palRGB[n.type] + ")";
				ctx.beginPath();
				ctx.arc(n.px, n.py, n.pr * (1.3 + (1 - n.pulse) * 2.4), 0, 6.2832);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			if (n.id === f || n.id === this.selected || this.tNow < n.lit) {
				ctx.lineWidth = dpr * 1.5;
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
		this.drawLabels(f, fn, nb);
	}

	private drawDendrites(n: Cell, al: number): void {
		const ctx = this.ctx, dpr = this.dpr;
		if (n.pr <= 2.2 * dpr) return;
		const k = n.pr * Math.min(1, (40 * dpr) / (5 * n.pr)), col = this.palRGB[n.type], bw = Math.max(0.9 * dpr, n.pr * 0.16);
		const tips: number[] = [];
		ctx.strokeStyle = "rgba(" + col + "," + al + ")";
		ctx.lineWidth = Math.max(0.7 * dpr, n.pr * 0.1);
		ctx.lineCap = "round";
		ctx.beginPath();
		for (const d of n.den) {
			const [r1x, r1y] = this.rotv(d.m), [r2x, r2y] = this.rotv(d.t);
			const mx = n.px + r1x * k, my = n.py + r1y * k, tx = n.px + r2x * k, ty = n.py + r2y * k;
			ctx.moveTo(n.px, n.py);
			ctx.quadraticCurveTo(mx + (ty - my) * 0.3, my - (tx - mx) * 0.3, tx, ty);
			tips.push(tx, ty);
			if (d.b) {
				const [r3x, r3y] = this.rotv(d.b);
				ctx.moveTo(mx, my);
				ctx.lineTo(n.px + r3x * k, n.py + r3y * k);
				tips.push(n.px + r3x * k, n.py + r3y * k);
			}
		}
		ctx.stroke();
		ctx.fillStyle = "rgba(" + col + "," + al + ")";
		ctx.beginPath();
		for (let i = 0; i < tips.length; i += 2) {
			ctx.moveTo(tips[i] + bw, tips[i + 1]);
			ctx.arc(tips[i], tips[i + 1], bw, 0, 6.2832);
		}
		ctx.fill();
	}

	private drawSignals(fn: Cell | null, f: number): void {
		const ctx = this.ctx, dpr = this.dpr;
		for (const s of this.signals) {
			const ed = this.edges[s.e], a = this.nodes[s.rev ? ed[1] : ed[0]], b = this.nodes[s.rev ? ed[0] : ed[1]], t = s.t, u = 1 - t;
			const [cx, cy] = this.ctrl(a, b, s.rev ? -ed[2] : ed[2]);
			const x = u * u * a.px + 2 * u * t * cx + t * t * b.px, y = u * u * a.py + 2 * u * t * cy + t * t * b.py;
			const al = (1 - ((a.pd + b.pd) / 2) * 0.6) * (fn && ed[0] !== f && ed[1] !== f ? 0.3 : 1);
			ctx.globalAlpha = clamp(al, 0.1, 1) * 0.35;
			ctx.fillStyle = "rgb(" + this.palRGB[a.type] + ")";
			ctx.beginPath();
			ctx.arc(x, y, 5.5 * dpr, 0, 6.2832);
			ctx.fill();
			ctx.globalAlpha = clamp(al, 0.1, 1);
			ctx.fillStyle = this.labelColor;
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
			if (this.hidden[n.type]) continue;
			const pri = n.id === f ? 0 : fn && nb[n.id] ? 1 : this.tNow < n.lit ? 1.5 : !fn && n.deg >= 9 ? 2 + (20 - n.deg) / 100 : -1;
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
			if (hit && cand[i][0] > 0) continue;
			drawn.push([x, y, w]);
			ctx.globalAlpha = cand[i][0] === 0 ? 1 : 0.5 + 0.5 * (1 - n.pd);
			ctx.lineWidth = 4 * dpr;
			ctx.strokeStyle = this.bgColor;
			ctx.strokeText(n.label, x, y);
			ctx.fillStyle = this.labelColor;
			ctx.fillText(n.label, x, y);
		}
		ctx.globalAlpha = 1;
	}
}
