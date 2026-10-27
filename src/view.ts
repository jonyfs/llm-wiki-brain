import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { BrainEngine, NodeInfo, PageType, TYPES } from "./engine";
import type BrainPlugin from "./main";
import { buildVaultGraph, matchQuery, VaultGraph } from "./vaultGraph";

export const VIEW_TYPE_BRAIN = "llm-wiki-brain-view";

interface Filters {
	folder: string;
	tag: string;
	minDeg: number;
	orphansOnly: boolean;
	days: number;
	hidden: PageType[];
}

const DEFAULT_FILTERS: Filters = { folder: "", tag: "", minDeg: 0, orphansOnly: false, days: 0, hidden: [] };
const IDLE_TIP = "Drag to rotate, scroll to zoom, click to select, double-click to open.";

export class BrainView extends ItemView {
	engine: BrainEngine | null = null;
	private graph: VaultGraph | null = null;
	private filters: Filters = { ...DEFAULT_FILTERS };
	private tip!: HTMLElement;
	private status!: HTMLElement;
	private info!: HTMLElement;
	private panel!: HTMLElement;
	private lintBox!: HTMLElement;
	private search!: HTMLInputElement;
	private chips = new Map<PageType, HTMLButtonElement>();
	private folderSel!: HTMLSelectElement;
	private tagSel!: HTMLSelectElement;
	private rotateBtn!: HTMLButtonElement;
	private replayBtn!: HTMLButtonElement;
	private neighborhood: string | null = null;

	constructor(leaf: WorkspaceLeaf, private plugin: BrainPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_BRAIN;
	}

	getDisplayText(): string {
		return "LLM wiki brain";
	}

	getIcon(): string {
		return "brain";
	}

	getState(): Record<string, unknown> {
		return { ...super.getState(), filters: this.filters };
	}

	async setState(state: { filters?: Partial<Filters> }, result: Parameters<ItemView["setState"]>[1]): Promise<void> {
		if (state?.filters) this.filters = { ...DEFAULT_FILTERS, ...state.filters };
		await super.setState(state, result);
		if (this.engine) this.refresh();
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("llm-wiki-brain");
		const s = this.plugin.settings;

		const bar = root.createDiv({ cls: "llm-wiki-brain-bar" });
		for (const t of TYPES) {
			const chip = bar.createEl("button", { cls: "llm-wiki-brain-chip", attr: { "aria-pressed": "true", "data-type": t, "aria-label": `Toggle ${t} pages` } });
			chip.createSpan({ cls: "llm-wiki-brain-dot" });
			chip.createSpan({ text: t });
			chip.createSpan({ cls: "llm-wiki-brain-n" });
			chip.addEventListener("click", () => this.toggleType(t));
			this.chips.set(t, chip);
		}

		const tools = root.createDiv({ cls: "llm-wiki-brain-tools" });
		const btn = (label: string, title: string, fn: () => void) => {
			const b = tools.createEl("button", { text: label, attr: { "aria-label": title, title } });
			b.addEventListener("click", fn);
			return b;
		};
		btn("Flow", "Send information from the index to the latest page", () => this.playFlow());
		this.replayBtn = btn("Replay", "Grow the brain again in creation order", () => this.toggleReplay());
		btn("Lint", "Mark orphan pages, broken links and untyped pages", () => this.runLint());
		this.rotateBtn = btn("Rotate", "Toggle the slow rotation", () => {
			const on = !this.engine?.isAuto();
			this.engine?.setAuto(on);
			this.rotateBtn.setAttribute("aria-pressed", String(on));
		});
		btn("Reset", "Reset the camera and the selection", () => this.engine?.resetView());
		btn("Full", "Toggle full screen", () => this.toggleFullscreen());

		const searchRow = root.createDiv({ cls: "llm-wiki-brain-search" });
		this.search = searchRow.createEl("input", { type: "search", attr: { placeholder: "Search pages, tags, headings. Enter to ask.", "aria-label": "Search pages" } });
		let timer = 0;
		this.search.addEventListener("input", () => {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => this.applySearch(false), 160);
		});
		this.search.addEventListener("keydown", (e) => {
			if (e.key === "Enter") this.applySearch(true);
			if (e.key === "Escape") {
				this.search.value = "";
				this.applySearch(false);
			}
		});
		const filterBtn = searchRow.createEl("button", { text: "Filters", attr: { "aria-expanded": "false" } });
		filterBtn.addEventListener("click", () => {
			const open = this.panel.hasClass("is-open");
			this.panel.toggleClass("is-open", !open);
			filterBtn.setAttribute("aria-expanded", String(!open));
		});

		this.panel = root.createDiv({ cls: "llm-wiki-brain-panel" });
		this.folderSel = this.field("Folder", () => this.folderSel);
		this.tagSel = this.field("Tag", () => this.tagSel);
		const deg = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		deg.createEl("label", { text: "Min links" });
		const degIn = deg.createEl("input", { type: "range", attr: { min: "0", max: "10", step: "1", value: "0", "aria-label": "Minimum links" } });
		const degOut = deg.createSpan({ text: "0" });
		degIn.addEventListener("input", () => {
			degOut.setText(degIn.value);
			this.filters.minDeg = Number(degIn.value);
			this.applyFilters();
		});
		const days = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		days.createEl("label", { text: "Edited" });
		const daysSel = days.createEl("select");
		for (const [v, l] of [["0", "any time"], ["7", "last 7 days"], ["30", "last 30 days"], ["365", "last year"]]) daysSel.createEl("option", { value: v, text: l });
		daysSel.addEventListener("change", () => {
			this.filters.days = Number(daysSel.value);
			this.applyFilters();
		});
		const orph = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		const orphIn = orph.createEl("input", { type: "checkbox", attr: { id: "llm-wiki-brain-orphans" } });
		orph.createEl("label", { text: "Orphans only", attr: { for: "llm-wiki-brain-orphans" } });
		orphIn.addEventListener("change", () => {
			this.filters.orphansOnly = orphIn.checked;
			this.applyFilters();
		});
		const clear = this.panel.createEl("button", { text: "Clear filters" });
		clear.addEventListener("click", () => {
			this.filters = { ...DEFAULT_FILTERS };
			this.neighborhood = null;
			degIn.value = "0";
			degOut.setText("0");
			daysSel.value = "0";
			orphIn.checked = false;
			this.folderSel.value = "";
			this.tagSel.value = "";
			this.search.value = "";
			for (const t of TYPES) this.engine?.setHidden(t, false);
			this.syncChips();
			this.applyFilters();
			this.applySearch(false);
		});
		this.folderSel.addEventListener("change", () => {
			this.filters.folder = this.folderSel.value;
			this.applyFilters();
		});
		this.tagSel.addEventListener("change", () => {
			this.filters.tag = this.tagSel.value;
			this.applyFilters();
		});

		const stage = root.createDiv({ cls: "llm-wiki-brain-stage" });
		const canvas = stage.createEl("canvas", {
			attr: { tabindex: "0", role: "img", "aria-label": "Interactive 3D brain of your wiki pages and links. Drag to rotate, arrow keys to orbit, plus and minus to zoom, Enter to open the selected page." },
		});
		this.info = root.createDiv({ cls: "llm-wiki-brain-info", attr: { "aria-live": "polite" } });
		this.info.hide();
		this.lintBox = root.createDiv({ cls: "llm-wiki-brain-lint" });
		this.lintBox.hide();
		const foot = root.createDiv({ cls: "llm-wiki-brain-foot" });
		this.status = foot.createSpan({ cls: "llm-wiki-brain-status" });
		this.tip = foot.createSpan({ cls: "llm-wiki-brain-tip", text: IDLE_TIP });

		const reduced = s.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		this.engine = new BrainEngine(canvas, {
			reducedMotion: reduced,
			ambient: () => ({ off: 0, calm: 1, lively: 2 })[this.plugin.settings.ambient],
			flowSpeed: () => ({ slow: 0.6, normal: 1, fast: 1.6 })[this.plugin.settings.flowSpeed],
			onOpen: (path) => this.openNote(path),
			onHover: (path) => this.tip.setText(path ?? IDLE_TIP),
			onSelect: (info) => this.showInfo(info),
			onStatus: (msg) => this.status.setText(msg),
			onFullscreen: () => this.toggleFullscreen(),
		});
		this.rotateBtn.setAttribute("aria-pressed", String(this.engine.isAuto()));
		this.registerEvent(this.app.workspace.on("css-change", () => this.engine?.readTheme()));
		this.refresh();
	}

	async onClose(): Promise<void> {
		this.engine?.destroy();
		this.engine = null;
	}

	private field(label: string, _self: () => HTMLSelectElement): HTMLSelectElement {
		const row = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		row.createEl("label", { text: label });
		return row.createEl("select");
	}

	private openNote(path: string): void {
		const f = this.app.vault.getAbstractFileByPath(path);
		if (f instanceof TFile) void this.app.workspace.getLeaf("tab").openFile(f);
	}

	private toggleFullscreen(): void {
		const el = this.contentEl;
		if (document.fullscreenElement) void document.exitFullscreen();
		else void el.requestFullscreen?.().catch(() => new Notice("Full screen is not available here."));
	}

	/** Rebuild the graph from the vault; existing cells keep their place and the selection survives. */
	refresh(): void {
		if (!this.engine) return;
		this.graph = buildVaultGraph(this.app, this.plugin.settings);
		this.engine.setGraph(this.graph.pages, this.graph.links);
		for (const t of this.filters.hidden) this.engine.setHidden(t, true);
		this.fillSelects();
		this.syncChips();
		this.applyFilters();
		this.updateStatus();
		if (!this.graph.pages.length) this.tip.setText("No pages found. Check the wiki folder in the plugin settings.");
	}

	private fillSelects(): void {
		if (!this.graph) return;
		const fill = (sel: HTMLSelectElement, any: string, values: string[], current: string) => {
			sel.empty();
			sel.createEl("option", { value: "", text: any });
			for (const v of values) sel.createEl("option", { value: v, text: v });
			sel.value = values.includes(current) ? current : "";
		};
		const folders = new Set<string>();
		const tagCount = new Map<string, number>();
		for (const m of this.graph.meta.values()) {
			if (m.folder) folders.add(m.folder);
			for (const t of m.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
		}
		fill(this.folderSel, "all folders", Array.from(folders).sort(), this.filters.folder);
		const tags = Array.from(tagCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([t]) => t);
		fill(this.tagSel, "all tags", tags, this.filters.tag);
	}

	private syncChips(): void {
		if (!this.engine) return;
		const counts = this.engine.counts();
		for (const t of TYPES) {
			const chip = this.chips.get(t);
			if (!chip) continue;
			chip.style.setProperty("--c", this.engine.typeColor(t));
			chip.querySelector(".llm-wiki-brain-n")?.setText(String(counts[t]));
			chip.setAttribute("aria-pressed", String(!this.filters.hidden.includes(t)));
		}
	}

	private toggleType(t: PageType): void {
		const off = !this.filters.hidden.includes(t);
		this.filters.hidden = off ? [...this.filters.hidden, t] : this.filters.hidden.filter((x) => x !== t);
		this.chips.get(t)?.setAttribute("aria-pressed", String(!off));
		this.engine?.setHidden(t, off);
		this.updateStatus();
	}

	private applyFilters(): void {
		if (!this.engine || !this.graph) return;
		const f = this.filters, g = this.graph, now = Date.now();
		const orph = new Set(g.orphans);
		const active = f.folder || f.tag || f.minDeg || f.orphansOnly || f.days || this.neighborhood;
		if (!active) {
			this.engine.setFilter(null);
			this.updateStatus();
			return;
		}
		let allowed: Set<string> | null = null;
		if (this.neighborhood) allowed = this.neighbourhoodOf(this.neighborhood, 2);
		const keep = new Set<string>();
		for (const p of g.pages) {
			const m = g.meta.get(p.path);
			if (!m) continue;
			if (allowed && !allowed.has(p.path)) continue;
			if (f.folder && m.folder !== f.folder) continue;
			if (f.tag && !m.tags.includes(f.tag)) continue;
			if (f.minDeg && this.engine.degree(p.path) < f.minDeg) continue;
			if (f.orphansOnly && !orph.has(p.path)) continue;
			if (f.days && now - p.mtime > f.days * 86400000) continue;
			keep.add(p.path);
		}
		this.engine.setFilter(keep);
		this.updateStatus();
	}

	private neighbourhoodOf(path: string, depth: number): Set<string> {
		const adj = new Map<string, string[]>();
		for (const [a, b] of this.graph?.links ?? []) {
			(adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
			(adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
		}
		const seen = new Set([path]);
		let frontier = [path];
		for (let d = 0; d < depth; d++) {
			const next: string[] = [];
			for (const p of frontier) for (const q of adj.get(p) ?? []) if (!seen.has(q)) { seen.add(q); next.push(q); }
			frontier = next;
		}
		return seen;
	}

	private applySearch(ask: boolean): void {
		if (!this.engine || !this.graph) return;
		const q = this.search.value.trim();
		if (!q) {
			this.engine.setMatch(null);
			return;
		}
		const hits = matchQuery(this.graph, q);
		this.engine.setMatch(hits);
		if (ask) {
			const n = this.engine.ask(Array.from(hits));
			this.status.setText(n ? `${n} page(s) match. The answer spreads along their links.` : "No matching pages.");
		} else this.status.setText(`${hits.size} match(es).`);
	}

	private updateStatus(): void {
		if (!this.engine || !this.graph) return;
		const s = this.engine.stats();
		this.status.setText(`${s.visible}/${s.nodes} pages, ${s.links} links, ${this.graph.orphans.length} orphans, ${this.graph.broken.length} with broken links`);
	}

	private showInfo(info: NodeInfo | null): void {
		this.info.empty();
		if (!info) {
			this.info.hide();
			return;
		}
		this.info.show();
		const head = this.info.createDiv({ cls: "llm-wiki-brain-info-head" });
		head.createEl("strong", { text: info.label });
		const close = head.createEl("button", { text: "×", attr: { "aria-label": "Clear selection" } });
		close.addEventListener("click", () => this.engine?.selectPath(null));
		const fmt = (t: number) => new Date(t).toLocaleDateString();
		this.info.createDiv({ cls: "llm-wiki-brain-meta", text: `${info.type} · ${info.deg} links · created ${fmt(info.ctime)} · edited ${fmt(info.mtime)}` });
		this.info.createDiv({ cls: "llm-wiki-brain-meta", text: info.path });
		const actions = this.info.createDiv({ cls: "llm-wiki-brain-actions" });
		const act = (label: string, fn: () => void) => actions.createEl("button", { text: label }).addEventListener("click", fn);
		act("Open", () => this.openNote(info.path));
		act("Flow from index", () => this.playFlow({ to: info.path }));
		act(this.neighborhood === info.path ? "Show all" : "Only neighborhood", () => {
			this.neighborhood = this.neighborhood === info.path ? null : info.path;
			this.applyFilters();
			this.showInfo(info);
		});
		if (info.neighbors.length) {
			const list = this.info.createDiv({ cls: "llm-wiki-brain-neighbors" });
			for (const n of info.neighbors) {
				const b = list.createEl("button", { text: n.label, attr: { title: n.path } });
				b.addEventListener("click", () => this.engine?.selectPath(n.path, true));
			}
		}
	}

	playFlow(opts: { to?: string } = {}): void {
		if (!this.engine) return;
		const s = this.plugin.settings;
		const r = this.engine.playFlow({ to: opts.to, mode: s.flowTarget, viewOnly: s.flowViewOnly });
		if (!r) {
			this.status.setText("Nothing to send: no index or no visible target page.");
			return;
		}
		const name = (p: string) => p.split("/").pop()?.replace(/\.md$/, "") ?? p;
		this.status.setText(r.virtual ? `${name(r.from)} to ${name(r.to)}: no link yet, showing a dashed arc.` : `${name(r.from)} to ${name(r.to)} in ${r.hops} hop(s).`);
	}

	private toggleReplay(): void {
		if (!this.engine) return;
		const running = this.engine.replay();
		this.replayBtn.setText(running ? "Stop" : "Replay");
		if (running) {
			const poll = window.setInterval(() => {
				if (!this.engine?.isReplaying()) {
					window.clearInterval(poll);
					this.replayBtn.setText("Replay");
				}
			}, 500);
			this.registerInterval(poll);
		}
	}

	pulse(path: string): void {
		this.engine?.pulse(path);
	}

	/** Lint overlay: orphans, broken links and pages without a type, with a clickable list. */
	runLint(): void {
		if (!this.engine) return;
		this.graph = buildVaultGraph(this.app, this.plugin.settings);
		const g = this.graph;
		this.engine.flag(Array.from(new Set([...g.orphans, ...g.broken, ...g.untyped])));
		this.lintBox.empty();
		this.lintBox.show();
		const head = this.lintBox.createDiv({ cls: "llm-wiki-brain-info-head" });
		head.createEl("strong", { text: "Wiki lint" });
		head.createEl("button", { text: "×", attr: { "aria-label": "Close lint results" } }).addEventListener("click", () => this.lintBox.hide());
		const section = (title: string, paths: string[]) => {
			this.lintBox.createDiv({ cls: "llm-wiki-brain-meta", text: `${title}: ${paths.length}` });
			const list = this.lintBox.createDiv({ cls: "llm-wiki-brain-neighbors" });
			for (const p of paths.slice(0, 12)) {
				const label = p.split("/").pop()?.replace(/\.md$/, "") ?? p;
				list.createEl("button", { text: label, attr: { title: p } }).addEventListener("click", () => this.engine?.selectPath(p, true));
			}
		};
		section("Orphan pages", g.orphans);
		section("Pages with broken links", g.broken);
		section("Pages without a type", g.untyped);
		new Notice(`Wiki lint: ${g.orphans.length} orphan(s), ${g.broken.length} with broken links, ${g.untyped.length} without a type.`);
	}
}
