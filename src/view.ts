import { HoverPopover, ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { BrainEngine, NodeInfo, PageType, TYPES } from "./engine";
import type BrainPlugin from "./main";
import { filterPaths, neighbourhoodOf, FilterPage } from "./filters";
import { createDeferredRefresh } from "./refresh";
import type { StringKey, Vars } from "./i18n";
import { buildVaultGraph, matchQuery, VaultGraph } from "./vaultGraph";
import { logOn, logOps, pagesByOp, parseLog, LogEntry } from "./logParser";
import { toWikiLinks } from "./query";
import { attend } from "./attention";
import { removeView, saveView } from "./views";

export const VIEW_TYPE_BRAIN = "llm-wiki-brain-view";

interface Filters {
	folder: string;
	tag: string;
	minDeg: number;
	orphansOnly: boolean;
	days: number;
	createdDays: number;
	maxDeg: number;
	invert: boolean;
	op: string;
	depth: number;
	hidden: PageType[];
}

const DEFAULT_FILTERS: Filters = { folder: "", tag: "", minDeg: 0, orphansOnly: false, days: 0, createdDays: 0, maxDeg: 0, invert: false, op: "", depth: 2, hidden: [] };

export class BrainView extends ItemView {
	engine: BrainEngine | null = null;
	hoverPopover: HoverPopover | null = null;
	private t = (key: StringKey, vars?: Vars) => this.plugin.t(key, vars);
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
	private opSel!: HTMLSelectElement;
	private replayFrom = 0;
	private rotateBtn!: HTMLButtonElement;
	private replayBtn!: HTMLButtonElement;
	private neighborhood: string | null = null;
	private filterBtn!: HTMLButtonElement;
	private hits: string[] = [];
	private hitAt = -1;
	private history: string[] = [];
	private historyList!: HTMLDataListElement;
	private replayBar!: HTMLElement;
	private replayCaption!: HTMLElement;
	private pauseBtn!: HTMLButtonElement;
	private replayKey: "ctime" | "mtime" = "ctime";
	private replaySpeed = 1;
	private replayLoop = false;
	private logEntries: LogEntry[] = [];
	private afterRefresh: (() => void)[] = [];
	private deferred = createDeferredRefresh({
		isBusy: () => this.engine?.isBusy() ?? false,
		run: () => {
			const after = this.afterRefresh.splice(0);
			void this.refresh().then(() => after.forEach((f) => f()));
		},
		now: () => Date.now(),
		schedule: (fn, ms) => window.setTimeout(fn, ms),
		cancel: (h) => window.clearTimeout(h as number),
	});

	constructor(leaf: WorkspaceLeaf, private plugin: BrainPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_BRAIN;
	}

	getDisplayText(): string {
		return this.t("view.title");
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
		if (this.engine) void this.refresh();
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("llm-wiki-brain");
		const s = this.plugin.settings;

		const bar = root.createDiv({ cls: "llm-wiki-brain-bar" });
		for (const t of TYPES) {
			const chip = bar.createEl("button", { cls: "llm-wiki-brain-chip", attr: { "aria-pressed": "true", "data-type": t, "aria-label": this.t("chip.aria", { type: this.t(("type." + t) as StringKey) }) } });
			chip.createSpan({ cls: "llm-wiki-brain-dot" });
			chip.createSpan({ text: this.t(("type." + t) as StringKey) });
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
		btn(this.t("btn.flow"), this.t("btn.flow.title"), () => this.playFlow());
		this.replayBtn = btn(this.t("btn.replay"), this.t("btn.replay.title"), () => this.toggleReplay());
		const modeSel = tools.createEl("select", { attr: { "aria-label": this.t("replay.mode.aria") } });
		modeSel.createEl("option", { value: "ctime", text: this.t("replay.mode.created") });
		modeSel.createEl("option", { value: "mtime", text: this.t("replay.mode.edited") });
		modeSel.addEventListener("change", () => (this.replayKey = modeSel.value as "ctime" | "mtime"));
		const speedSel = tools.createEl("select", { attr: { "aria-label": this.t("replay.speed.aria") } });
		for (const v of ["0.5", "1", "2", "4"]) speedSel.createEl("option", { value: v, text: v + "×" });
		speedSel.value = "1";
		speedSel.addEventListener("change", () => {
			this.replaySpeed = Number(speedSel.value);
			this.engine?.setReplaySpeed(this.replaySpeed);
		});
		const fromIn = tools.createEl("input", { type: "date", attr: { "aria-label": this.t("replay.from"), title: this.t("replay.from") } });
		fromIn.addEventListener("change", () => (this.replayFrom = fromIn.value ? Date.parse(fromIn.value + "T00:00:00Z") : 0));
		const loopIn = tools.createEl("input", { type: "checkbox", attr: { id: "llm-wiki-brain-loop", "aria-label": this.t("replay.loop"), title: this.t("replay.loop") } });
		loopIn.addEventListener("change", () => (this.replayLoop = loopIn.checked));
		btn(this.t("btn.lint"), this.t("btn.lint.title"), () => this.runLint());
		this.rotateBtn = btn(this.t("btn.rotate"), this.t("btn.rotate.title"), () => {
			const on = !this.engine?.isAuto();
			this.engine?.setAuto(on);
			this.rotateBtn.setAttribute("aria-pressed", String(on));
		});
		btn(this.t("btn.reset"), this.t("btn.reset.title"), () => this.engine?.resetView());
		btn(this.t("btn.full"), this.t("btn.full.title"), () => this.toggleFullscreen());

		this.replayBar = root.createDiv({ cls: "llm-wiki-brain-replaybar" });
		this.pauseBtn = this.replayBar.createEl("button", { text: this.t("replay.pause") });
		this.pauseBtn.addEventListener("click", () => this.pauseReplay());
		this.replayCaption = this.replayBar.createSpan({ cls: "llm-wiki-brain-replaycap", attr: { "aria-live": "polite" } });
		this.replayBar.hide();

		const searchRow = root.createDiv({ cls: "llm-wiki-brain-search" });
		this.search = searchRow.createEl("input", { type: "search", attr: { placeholder: this.t("search.placeholder"), "aria-label": this.t("search.aria"), list: "llm-wiki-brain-history" } });
		this.historyList = searchRow.createEl("datalist", { attr: { id: "llm-wiki-brain-history" } });
		let timer = 0;
		this.search.addEventListener("input", () => {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => this.applySearch(false), 160);
		});
		this.search.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && e.shiftKey) this.stepHit(-1);
			else if (e.key === "Enter" && this.hits.length && this.hitAt >= 0) this.stepHit(1);
			else if (e.key === "Enter") this.applySearch(true);
			if (e.key === "Escape") {
				this.search.value = "";
				this.applySearch(false);
			}
		});
		const small = (label: string, aria: string, fn: () => void) => {
			const b = searchRow.createEl("button", { text: label, attr: { "aria-label": aria, title: aria } });
			b.addEventListener("click", fn);
			return b;
		};
		small("‹", this.t("search.prev.aria"), () => this.stepHit(-1));
		small("›", this.t("search.next.aria"), () => this.stepHit(1));
		small(this.t("search.copy"), this.t("search.copy.title"), () => this.copyHits());
		const filterBtn = (this.filterBtn = searchRow.createEl("button", { text: this.t("filters.button"), attr: { "aria-expanded": "false" } }));
		filterBtn.addEventListener("click", () => {
			const open = this.panel.hasClass("is-open");
			this.panel.toggleClass("is-open", !open);
			filterBtn.setAttribute("aria-expanded", String(!open));
		});

		this.panel = root.createDiv({ cls: "llm-wiki-brain-panel" });
		this.folderSel = this.field(this.t("filters.folder"));
		this.tagSel = this.field(this.t("filters.tag"));
		this.opSel = this.field(this.t("filters.op"));
		this.opSel.addEventListener("change", () => {
			this.filters.op = this.opSel.value;
			this.applyFilters();
		});
		const deg = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		deg.createEl("label", { text: this.t("filters.minLinks") });
		const degIn = deg.createEl("input", { type: "range", attr: { min: "0", max: "10", step: "1", value: "0", "aria-label": this.t("filters.minLinks.aria") } });
		const degOut = deg.createSpan({ text: "0" });
		degIn.addEventListener("input", () => {
			degOut.setText(degIn.value);
			this.filters.minDeg = Number(degIn.value);
			this.applyFilters();
		});
		const days = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		days.createEl("label", { text: this.t("filters.edited") });
		const daysSel = days.createEl("select");
		for (const [v, l] of [["0", this.t("filters.anyTime")], ["7", this.t("filters.days7")], ["30", this.t("filters.days30")], ["365", this.t("filters.year")]]) daysSel.createEl("option", { value: v, text: l });
		daysSel.addEventListener("change", () => {
			this.filters.days = Number(daysSel.value);
			this.applyFilters();
		});
		const created = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		created.createEl("label", { text: this.t("filters.created") });
		const createdSel = created.createEl("select");
		for (const [v, l] of [["0", this.t("filters.anyTime")], ["7", this.t("filters.days7")], ["30", this.t("filters.days30")], ["365", this.t("filters.year")]]) createdSel.createEl("option", { value: v, text: l });
		createdSel.addEventListener("change", () => {
			this.filters.createdDays = Number(createdSel.value);
			this.applyFilters();
		});
		const max = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		max.createEl("label", { text: this.t("filters.maxLinks") });
		const maxIn = max.createEl("input", { type: "range", attr: { min: "0", max: "20", step: "1", value: "0", "aria-label": this.t("filters.maxLinks.aria") } });
		const maxOut = max.createSpan({ text: "∞" });
		maxIn.addEventListener("input", () => {
			maxOut.setText(maxIn.value === "0" ? "∞" : maxIn.value);
			this.filters.maxDeg = Number(maxIn.value);
			this.applyFilters();
		});
		const depth = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		depth.createEl("label", { text: this.t("filters.depth") });
		const depthSel = depth.createEl("select");
		for (const v of ["1", "2", "3"]) depthSel.createEl("option", { value: v, text: v });
		depthSel.value = String(this.filters.depth);
		depthSel.addEventListener("change", () => {
			this.filters.depth = Number(depthSel.value);
			this.applyFilters();
		});
		const inv = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		const invIn = inv.createEl("input", { type: "checkbox", attr: { id: "llm-wiki-brain-invert" } });
		inv.createEl("label", { text: this.t("filters.invert"), attr: { for: "llm-wiki-brain-invert" } });
		invIn.addEventListener("change", () => {
			this.filters.invert = invIn.checked;
			this.applyFilters();
		});
		const orph = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		const orphIn = orph.createEl("input", { type: "checkbox", attr: { id: "llm-wiki-brain-orphans" } });
		orph.createEl("label", { text: this.t("filters.orphansOnly"), attr: { for: "llm-wiki-brain-orphans" } });
		orphIn.addEventListener("change", () => {
			this.filters.orphansOnly = orphIn.checked;
			this.applyFilters();
		});
		/** Show `this.filters` in the controls and apply them with the current search. */
		const showFilters = () => {
			const f = this.filters;
			degIn.value = String(f.minDeg);
			degOut.setText(String(f.minDeg));
			daysSel.value = String(f.days);
			createdSel.value = String(f.createdDays);
			maxIn.value = String(f.maxDeg);
			maxOut.setText(f.maxDeg ? String(f.maxDeg) : "∞");
			depthSel.value = String(f.depth);
			invIn.checked = f.invert;
			orphIn.checked = f.orphansOnly;
			this.folderSel.value = f.folder;
			this.tagSel.value = f.tag;
			this.opSel.value = f.op;
			for (const t of TYPES) this.engine?.setHidden(t, f.hidden.includes(t));
			this.syncChips();
			this.applyFilters();
			this.applySearch(false);
		};
		const clear = this.panel.createEl("button", { text: this.t("filters.clear") });
		clear.addEventListener("click", () => {
			this.filters = { ...DEFAULT_FILTERS, hidden: [] };
			this.neighborhood = null;
			this.search.value = "";
			showFilters();
		});

		// Saved views: the filters and the search, under a name.
		const views = this.panel.createDiv({ cls: "llm-wiki-brain-field llm-wiki-brain-views" });
		const viewSel = views.createEl("select", { attr: { "aria-label": this.t("views.pick") } });
		const fillViews = (pick = "") => {
			viewSel.empty();
			viewSel.createEl("option", { value: "", text: this.t("views.pick") });
			for (const v of this.plugin.settings.savedViews) viewSel.createEl("option", { value: v.name, text: v.name });
			viewSel.value = pick;
		};
		fillViews();
		viewSel.addEventListener("change", () => {
			const v = this.plugin.settings.savedViews.find((x) => x.name === viewSel.value);
			if (!v) return;
			this.filters = { ...DEFAULT_FILTERS, ...(v.filters as Partial<Filters>), hidden: Array.isArray(v.filters.hidden) ? (v.filters.hidden as PageType[]) : [] };
			this.neighborhood = null;
			this.search.value = v.query;
			nameIn.value = v.name;
			showFilters();
		});
		const nameIn = views.createEl("input", { type: "text", attr: { placeholder: this.t("views.name"), "aria-label": this.t("views.name") } });
		const saveBtn = views.createEl("button", { text: this.t("views.save") });
		saveBtn.addEventListener("click", () => {
			const name = nameIn.value.trim();
			if (!name) return;
			void this.plugin.saveViews(saveView(this.plugin.settings.savedViews, { name, query: this.search.value.trim(), filters: { ...this.filters } }));
			fillViews(name);
			new Notice(this.t("views.saved", { name }));
		});
		const delBtn = views.createEl("button", { text: this.t("views.delete") });
		delBtn.addEventListener("click", () => {
			if (!viewSel.value) return;
			void this.plugin.saveViews(removeView(this.plugin.settings.savedViews, viewSel.value));
			nameIn.value = "";
			fillViews();
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
			attr: { tabindex: "0", role: "img", "aria-label": this.t("canvas.aria") },
		});
		this.info = root.createDiv({ cls: "llm-wiki-brain-info", attr: { "aria-live": "polite" } });
		this.info.hide();
		this.lintBox = root.createDiv({ cls: "llm-wiki-brain-lint" });
		this.lintBox.hide();
		const foot = root.createDiv({ cls: "llm-wiki-brain-foot" });
		this.status = foot.createSpan({ cls: "llm-wiki-brain-status" });
		this.tip = foot.createSpan({ cls: "llm-wiki-brain-tip", text: this.t("tip.idle") });

		const reduced = s.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		this.engine = new BrainEngine(canvas, {
			reducedMotion: reduced,
			ambient: () => ({ off: 0, calm: 1, lively: 2 })[this.plugin.settings.ambient],
			flowSpeed: () => ({ slow: 0.6, normal: 1, fast: 1.6 })[this.plugin.settings.flowSpeed],
			detail: () => this.plugin.settings.neuronDetail,
			onOpen: (path) => this.openNote(path),
			onHover: (path, ev) => {
				this.tip.setText(path ?? this.t("tip.idle"));
				// The core Page Preview shows the note, with its usual modifier key.
				if (path && ev && this.plugin.settings.hoverPreview) {
					this.app.workspace.trigger("hover-link", { event: ev, source: VIEW_TYPE_BRAIN, hoverParent: this, targetEl: this.contentEl, linktext: path });
				}
			},
			onSelect: (info) => this.showInfo(info),
			onStatus: (msg) => this.status.setText(msg),
			onFullscreen: () => this.toggleFullscreen(),
			onSettled: () => this.plugin.saveLayout(this.engine?.layout() ?? {}),
			onReplay: (step) => this.showReplay(step),
			onPin: (paths) => void this.plugin.persist({ pinned: paths }),
			text: (key, vars) => this.t(key, vars),
		});
		this.rotateBtn.setAttribute("aria-pressed", String(this.engine.isAuto()));
		this.registerEvent(this.app.workspace.on("css-change", () => this.engine?.readTheme()));
		this.engine.setPinned(s.pinned);
		await this.refresh();
		if (!s.onboarded) this.showWizard(stage);
	}

	/** The first time: three lines on what the picture means, once. */
	private showWizard(host: HTMLElement): void {
		const card = host.createDiv({ cls: "llm-wiki-brain-wizard", attr: { role: "dialog", "aria-label": this.t("wizard.title") } });
		card.createEl("strong", { text: this.t("wizard.title") });
		for (const k of ["wizard.1", "wizard.2", "wizard.3"] as const) card.createEl("p", { text: this.t(k) });
		const ok = card.createEl("button", { text: this.t("wizard.ok") });
		ok.addEventListener("click", () => {
			card.remove();
			void this.plugin.persist({ onboarded: true });
		});
	}

	async onClose(): Promise<void> {
		this.deferred.cancel();
		this.engine?.destroy();
		this.engine = null;
	}

	private field(label: string): HTMLSelectElement {
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
		else void el.requestFullscreen?.().catch(() => new Notice(this.t("fullscreen.unavailable")));
	}

	/**
	 * Vault events: rebuild once the animation in flight is idle (at most 5 s), so a Flow or a Replay is not erased.
	 * `after` runs once the rebuild is done.
	 */
	requestRefresh(after?: () => void): void {
		if (after) this.afterRefresh.push(after);
		this.deferred.request();
	}

	/** Rebuild the graph from the vault; existing cells keep their place and the selection survives. */
	async refresh(): Promise<void> {
		if (!this.engine) return;
		const log = await this.plugin.readLog();
		if (!this.engine) return;
		this.logEntries = parseLog(log ?? "");
		this.graph = buildVaultGraph(this.app, this.plugin.settings, log);
		this.engine.setGraph(this.graph.pages, this.graph.links, this.plugin.layout, this.graph.counts, this.graph.inhibit);
		for (const t of this.filters.hidden) this.engine.setHidden(t, true);
		this.fillSelects();
		this.syncChips();
		this.applyFilters();
		this.updateStatus();
		if (!this.graph.pages.length) this.tip.setText(this.t("tip.noPages"));
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
		fill(this.folderSel, this.t("filters.allFolders"), Array.from(folders).sort(), this.filters.folder);
		const tags = Array.from(tagCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([t]) => t);
		fill(this.tagSel, this.t("filters.allTags"), tags, this.filters.tag);
		fill(this.opSel, this.t("filters.anyOp"), logOps(this.logEntries), this.filters.op);
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
		this.applyFilters();
	}

	private applyFilters(): void {
		if (!this.engine || !this.graph) return;
		const g = this.graph, engine = this.engine;
		const pages: FilterPage[] = g.pages.map((p) => ({ path: p.path, mtime: p.mtime, ctime: p.ctime, folder: g.meta.get(p.path)?.folder ?? "", tags: g.meta.get(p.path)?.tags ?? [] }));
		engine.setFilter(
			filterPaths(pages, this.filters, {
				degree: (path) => engine.degree(path),
				orphans: new Set(g.orphans),
				opPaths: this.filters.op ? pagesByOp(this.logEntries, g.pages, this.filters.op) : null,
				neighbourhood: this.neighborhood ? neighbourhoodOf(g.links, this.neighborhood, this.filters.depth) : null,
				now: Date.now(),
			}),
		);
		this.updateStatus();
		const f = this.filters;
		const active = [f.folder, f.tag, f.minDeg, f.maxDeg, f.orphansOnly, f.days, f.createdDays, f.invert, f.op, this.neighborhood, f.hidden.length].filter(Boolean).length;
		this.filterBtn?.setText(active ? this.t("filters.buttonActive", { n: active }) : this.t("filters.button"));
	}

	private applySearch(ask: boolean): void {
		if (!this.engine || !this.graph) return;
		const q = this.search.value.trim();
		if (!q) {
			this.engine.setMatch(null);
			this.hits = [];
			this.hitAt = -1;
			return;
		}
		const hits = matchQuery(this.graph, q);
		this.engine.setMatch(hits);
		this.hits = Array.from(hits).sort();
		this.hitAt = -1;
		if (ask) this.remember(q);
		if (ask) {
			const n = this.engine.ask(Array.from(hits));
			this.status.setText(n ? this.t("status.ask", { n }) : this.t("status.noMatch"));
		} else this.status.setText(this.t("status.matches", { n: hits.size }));
	}

	/** Recent searches, newest first, offered by the search box. */
	private remember(q: string): void {
		this.history = [q, ...this.history.filter((x) => x !== q)].slice(0, 12);
		this.historyList.empty();
		for (const h of this.history) this.historyList.createEl("option", { value: h });
	}

	/** Walk through the matches one by one: the camera goes to each. */
	private stepHit(dir: number): void {
		if (!this.engine || !this.hits.length) return;
		this.hitAt = (this.hitAt + dir + this.hits.length) % this.hits.length;
		const path = this.hits[this.hitAt];
		this.engine.selectPath(path, true);
		this.status.setText(this.t("status.matchAt", { i: this.hitAt + 1, n: this.hits.length, name: path.split("/").pop()?.replace(/\.md$/, "") ?? path }));
	}

	private copyHits(): void {
		if (!this.hits.length) return;
		void navigator.clipboard.writeText(toWikiLinks(this.hits)).then(() => new Notice(this.t("status.copied", { n: this.hits.length })));
	}

	private pauseReplay(): void {
		const paused = this.engine?.pauseReplay() ?? false;
		this.pauseBtn.setText(this.t(paused ? "replay.resume" : "replay.pause"));
	}

	/** The growth caption: which day the wiki is at, how many pages are back, and what the log says happened that day. */
	private showReplay(step: { i: number; n: number; time: number; path: string } | null): void {
		if (!step) {
			this.replayBar?.hide();
			// Replay ended by itself (not stopped with the button): start over when looping.
			if (this.replayLoop && this.engine?.replayFinished()) window.setTimeout(() => this.replayLoop && this.toggleReplay(), 1200);
			return;
		}
		this.replayBar.show();
		const date = new Date(step.time).toISOString().slice(0, 10);
		const ops = Array.from(new Set(logOn(this.logEntries, step.time).map((e) => e.op))).join(", ");
		this.replayCaption.setText(ops ? this.t("replay.captionLog", { date, i: step.i, n: step.n, ops }) : this.t("replay.caption", { date, i: step.i, n: step.n }));
	}

	private updateStatus(): void {
		if (!this.engine || !this.graph) return;
		const s = this.engine.stats();
		this.status.setText(this.t("status.summary", { visible: s.visible, nodes: s.nodes, links: s.links, orphans: this.graph.orphans.length, broken: this.graph.broken.length }));
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
		const close = head.createEl("button", { text: "×", attr: { "aria-label": this.t("info.clear.aria") } });
		close.addEventListener("click", () => this.engine?.selectPath(null));
		const fmt = (t: number) => new Date(t).toLocaleDateString(this.plugin.lang);
		this.info.createDiv({ cls: "llm-wiki-brain-meta", text: this.t("info.meta", { type: this.t(("type." + info.type) as StringKey), deg: info.deg, created: fmt(info.ctime), edited: fmt(info.mtime) }) });
		this.info.createDiv({ cls: "llm-wiki-brain-meta", text: info.path });
		const actions = this.info.createDiv({ cls: "llm-wiki-brain-actions" });
		const act = (label: string, fn: () => void) => actions.createEl("button", { text: label }).addEventListener("click", fn);
		act(this.t("info.open"), () => this.openNote(info.path));
		act(this.t("info.flowFrom"), () => this.playFlow({ to: info.path }));
		act(this.neighborhood === info.path ? this.t("info.showAll") : this.t("info.onlyNeighborhood"), () => {
			this.neighborhood = this.neighborhood === info.path ? null : info.path;
			this.applyFilters();
			this.showInfo(info);
		});
		const side = (title: string, items: { path: string; label: string }[]) => {
			if (!items.length) return;
			this.info.createDiv({ cls: "llm-wiki-brain-side", text: title });
			const list = this.info.createDiv({ cls: "llm-wiki-brain-neighbors" });
			for (const n of items) {
				const b = list.createEl("button", { text: n.label, attr: { title: n.path } });
				b.addEventListener("click", () => this.engine?.selectPath(n.path, true));
			}
		};
		this.info.createDiv({ cls: "llm-wiki-brain-meta", text: this.t("info.neuron", { inn: info.inputs.length, out: info.outputs.length, theta: info.threshold }) });
		act(info.pinned ? this.t("info.unpin") : this.t("info.pin"), () => this.engine?.togglePin(info.path));
		act(this.t("info.attend"), () => this.attend(info.path));
		side(this.t("info.inputs"), info.inputs);
		side(this.t("info.outputs"), info.outputs);
	}

	/** Show where the page would attend beyond its links: the most similar unlinked pages, weighted. */
	private attend(path: string): void {
		const g = this.graph, engine = this.engine;
		if (!g || !engine) return;
		const linked = new Set<string>([path]);
		for (const [a, b] of g.links) {
			if (a === path) linked.add(b);
			if (b === path) linked.add(a);
		}
		const docs = g.pages.map((p, id) => ({ id, text: (g.meta.get(p.path)?.text ?? "") + " " + p.label }));
		const focus = g.pages.findIndex((p) => p.path === path);
		const exclude = new Set(g.pages.flatMap((p, i) => (linked.has(p.path) ? [i] : [])));
		const hits = attend(focus, docs, exclude).map((h) => ({ path: g.pages[h.id].path, w: h.w }));
		const n = engine.attend(path, hits);
		this.status.setText(n ? this.t("status.attend", { n }) : this.t("status.attendNone"));
	}

	playFlow(opts: { to?: string } = {}): void {
		if (!this.engine) return;
		const s = this.plugin.settings;
		const r = this.engine.playFlow({ to: opts.to, mode: s.flowTarget, viewOnly: s.flowViewOnly });
		if (!r) {
			this.status.setText(this.t("status.flowNone"));
			return;
		}
		const name = (p: string) => p.split("/").pop()?.replace(/\.md$/, "") ?? p;
		this.status.setText(r.virtual ? this.t("status.flowVirtual", { from: name(r.from), to: name(r.to) }) : this.t("status.flowRoute", { from: name(r.from), to: name(r.to), hops: r.hops }));
	}

	private toggleReplay(): void {
		if (!this.engine) return;
		const running = this.engine.replay({ key: this.replayKey, speed: this.replaySpeed, startAt: this.replayFrom || undefined });
		this.pauseBtn.setText(this.t("replay.pause"));
		this.replayBtn.setText(running ? this.t("btn.stop") : this.t("btn.replay"));
		if (running) {
			const poll = window.setInterval(() => {
				if (!this.engine?.isReplaying()) {
					window.clearInterval(poll);
					this.replayBtn.setText(this.t("btn.replay"));
				}
			}, 500);
			this.registerInterval(poll);
		}
	}

	pulse(path: string): void {
		this.engine?.pulse(path);
	}

	/** The note that just opened becomes the selection and the camera goes to it. */
	followFile(path: string): void {
		if (this.plugin.settings.followActiveNote) this.engine?.selectPath(path, true);
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
		head.createEl("strong", { text: this.t("lint.title") });
		head.createEl("button", { text: "×", attr: { "aria-label": this.t("lint.close.aria") } }).addEventListener("click", () => this.lintBox.hide());
		const section = (title: string, paths: string[]) => {
			this.lintBox.createDiv({ cls: "llm-wiki-brain-meta", text: `${title}: ${paths.length}` });
			const list = this.lintBox.createDiv({ cls: "llm-wiki-brain-neighbors" });
			for (const p of paths.slice(0, 12)) {
				const label = p.split("/").pop()?.replace(/\.md$/, "") ?? p;
				list.createEl("button", { text: label, attr: { title: p } }).addEventListener("click", () => this.engine?.selectPath(p, true));
			}
		};
		section(this.t("lint.orphans"), g.orphans);
		section(this.t("lint.broken"), g.broken);
		section(this.t("lint.untyped"), g.untyped);
		new Notice(this.t("lint.notice", { orphans: g.orphans.length, broken: g.broken.length, untyped: g.untyped.length }));
	}
}
