import { HoverPopover, ItemView, Menu, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { BrainEngine, NodeInfo, PageType, TYPES } from "./engine";
import type BrainPlugin from "./main";
import { filterPaths, neighbourhoodOf, FilterPage } from "./filters";
import { createDeferredRefresh } from "./refresh";
import type { StringKey, Vars } from "./i18n";
import { buildVaultGraph, matchQuery, VaultGraph } from "./vaultGraph";
import { logOn, logOps, pagesByOp, parseLog, LogEntry } from "./logParser";
import { suggest, toWikiLinks } from "./query";
import { attend } from "./attention";
import { removeView, saveView } from "./views";
import { activeChips, withoutChip, Chip } from "./chips";
import { colorCats, sizeFactors, ColorMode, SizeMode } from "./cats";
import { ago } from "./time";
import { toCanvas } from "./canvasExport";

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
	dir: "" | "sources" | "sinks" | "hubs2";
	depth: number;
	hidden: PageType[];
}

const DEFAULT_FILTERS: Filters = { folder: "", tag: "", minDeg: 0, orphansOnly: false, days: 0, createdDays: 0, maxDeg: 0, invert: false, op: "", dir: "", depth: 2, hidden: [] };

/** What a view remembers between sessions: filters, the search, the selection and the camera. */
interface ViewState {
	filters?: Partial<Filters>;
	hood?: string | null;
	q?: string;
	extra?: string;
	hide?: boolean;
	sel?: string[];
	cam?: { yaw: number; pitch: number; zoom: number; panX: number; panY: number };
	color?: ColorMode;
	size?: SizeMode;
}

const stem = (p: string) => p.split("/").pop()?.replace(/\.md$/, "") ?? p;

export class BrainView extends ItemView {
	engine: BrainEngine | null = null;
	hoverPopover: HoverPopover | null = null;
	private t = (key: StringKey, vars?: Vars) => this.plugin.t(key, vars);
	private graph: VaultGraph | null = null;
	private filters: Filters = { ...DEFAULT_FILTERS, hidden: [] };
	private neighborhood: string | null = null;
	private isolate: Set<string> | null = null;
	private extraQuery = "";
	private hideNonMatches = false;
	private colorMode: ColorMode = "type";
	private sizeMode: SizeMode = "same";
	private pending: ViewState | null = null;
	private inDeg = new Map<string, number>();
	private outDeg = new Map<string, number>();
	// elements
	private canvas!: HTMLCanvasElement;
	private stage!: HTMLElement;
	private tip!: HTMLElement;
	private status!: HTMLElement;
	private perfEl!: HTMLElement;
	private info!: HTMLElement;
	private panel!: HTMLElement;
	private lintBox!: HTMLElement;
	private search!: HTMLInputElement;
	private toolsRow!: HTMLElement;
	private chipsRow!: HTMLElement;
	private results!: HTMLElement;
	private legend!: HTMLElement;
	private tooltip!: HTMLElement;
	private helpCard!: HTMLElement;
	private keysCard!: HTMLElement;
	private previewEl!: HTMLElement;
	private chips = new Map<PageType, HTMLButtonElement>();
	private folderSel!: HTMLSelectElement;
	private tagSel!: HTMLSelectElement;
	private opSel!: HTMLSelectElement;
	private dirSel!: HTMLSelectElement;
	private degIn!: HTMLInputElement;
	private degOut!: HTMLElement;
	private daysSel!: HTMLSelectElement;
	private createdSel!: HTMLSelectElement;
	private maxIn!: HTMLInputElement;
	private maxOut!: HTMLElement;
	private depthSel!: HTMLSelectElement;
	private invIn!: HTMLInputElement;
	private orphIn!: HTMLInputElement;
	private queryIn!: HTMLInputElement;
	private hideIn!: HTMLInputElement;
	private ghostIn!: HTMLInputElement;
	private recentIn!: HTMLInputElement;
	private colorSel!: HTMLSelectElement;
	private sizeSel!: HTMLSelectElement;
	private viewSel!: HTMLSelectElement;
	private nameIn!: HTMLInputElement;
	private scrub!: HTMLInputElement;
	private rotateBtn!: HTMLButtonElement;
	private replayBtn!: HTMLButtonElement;
	private filterBtn!: HTMLButtonElement;
	private clearBtn!: HTMLButtonElement;
	private pauseBtn!: HTMLButtonElement;
	private replayBar!: HTMLElement;
	private replayCaption!: HTMLElement;
	private suggestList!: HTMLDataListElement;
	private hits: string[] = [];
	private hitAt = -1;
	private replayFrom = 0;
	private replayKey: "ctime" | "mtime" = "ctime";
	private replaySpeed = 1;
	private replayLoop = false;
	private logEntries: LogEntry[] = [];
	private vocab = { tags: [] as string[], folders: [] as string[], types: [...TYPES] as string[] };
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
		const st: ViewState = {
			filters: this.filters,
			hood: this.neighborhood,
			q: this.search?.value ?? "",
			extra: this.extraQuery,
			hide: this.hideNonMatches,
			sel: this.engine?.selection() ?? [],
			cam: this.engine?.camera(),
			color: this.colorMode,
			size: this.sizeMode,
		};
		return { ...super.getState(), ...st };
	}

	async setState(state: ViewState, result: Parameters<ItemView["setState"]>[1]): Promise<void> {
		if (state?.filters) this.filters = { ...DEFAULT_FILTERS, ...state.filters, hidden: Array.isArray(state.filters.hidden) ? state.filters.hidden : [] };
		if (state && typeof state === "object") {
			this.neighborhood = typeof state.hood === "string" ? state.hood : null;
			this.extraQuery = typeof state.extra === "string" ? state.extra : "";
			this.hideNonMatches = !!state.hide;
			this.colorMode = (["type", "folder", "tag", "age", "degree"] as ColorMode[]).includes(state.color as ColorMode) ? (state.color as ColorMode) : "type";
			this.sizeMode = (["same", "degree", "recent"] as SizeMode[]).includes(state.size as SizeMode) ? (state.size as SizeMode) : "same";
			this.pending = state;
		}
		await super.setState(state, result);
		if (this.engine) {
			this.syncControls(false);
			await this.refresh();
		}
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
		const more = bar.createEl("button", { text: "⋯", cls: "llm-wiki-brain-more", attr: { "aria-label": this.t("btn.more"), title: this.t("btn.more") } });
		more.addEventListener("click", () => this.toolsRow.toggleClass("is-collapsed", !this.toolsRow.hasClass("is-collapsed")));

		this.toolsRow = root.createDiv({ cls: "llm-wiki-brain-tools" });
		this.buildTools();

		this.replayBar = root.createDiv({ cls: "llm-wiki-brain-replaybar" });
		this.pauseBtn = this.replayBar.createEl("button", { text: this.t("replay.pause") });
		this.pauseBtn.addEventListener("click", () => this.pauseReplay());
		this.scrub = this.replayBar.createEl("input", { type: "range", attr: { min: "0", max: "100", value: "0", "aria-label": this.t("replay.scrub") } });
		this.scrub.addEventListener("input", () => {
			this.engine?.seekReplay(Number(this.scrub.value));
			this.pauseBtn.setText(this.t("replay.resume"));
		});
		this.replayCaption = this.replayBar.createSpan({ cls: "llm-wiki-brain-replaycap", attr: { "aria-live": "polite" } });
		this.replayBar.hide();

		this.buildSearchRow(root);
		this.chipsRow = root.createDiv({ cls: "llm-wiki-brain-active" });
		this.results = root.createDiv({ cls: "llm-wiki-brain-results" });
		this.results.hide();
		this.buildPanel(root);

		this.stage = root.createDiv({ cls: "llm-wiki-brain-stage" });
		this.canvas = this.stage.createEl("canvas", { attr: { tabindex: "0", role: "img", "aria-label": this.t("canvas.aria") } });
		this.legend = this.stage.createDiv({ cls: "llm-wiki-brain-legend" });
		this.tooltip = this.stage.createDiv({ cls: "llm-wiki-brain-tooltip", attr: { role: "tooltip" } });
		this.tooltip.hide();
		this.helpCard = this.stage.createDiv({ cls: "llm-wiki-brain-card" });
		this.helpCard.hide();
		this.keysCard = this.stage.createDiv({ cls: "llm-wiki-brain-card" });
		this.keysCard.hide();
		this.buildCards();
		this.info = root.createDiv({ cls: "llm-wiki-brain-info", attr: { "aria-live": "polite" } });
		this.info.hide();
		this.lintBox = root.createDiv({ cls: "llm-wiki-brain-lint" });
		this.lintBox.hide();
		const foot = root.createDiv({ cls: "llm-wiki-brain-foot" });
		this.status = foot.createSpan({ cls: "llm-wiki-brain-status", attr: { "aria-live": "polite" } });
		this.perfEl = foot.createSpan({ cls: "llm-wiki-brain-perf" });
		this.tip = foot.createSpan({ cls: "llm-wiki-brain-tip", text: this.t("tip.idle") });

		const reduced = s.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		this.engine = new BrainEngine(this.canvas, {
			reducedMotion: reduced,
			ambient: () => ({ off: 0, calm: 1, lively: 2 })[this.plugin.settings.ambient],
			flowSpeed: () => ({ slow: 0.6, normal: 1, fast: 1.6 })[this.plugin.settings.flowSpeed],
			detail: () => this.plugin.settings.neuronDetail,
			labelScale: () => this.plugin.settings.labelScale,
			onOpen: (path, split) => this.openNote(path, split),
			onHover: (path, ev) => {
				this.tip.setText(path ?? this.t("tip.idle"));
				this.showTooltip(path, ev);
				// The core Page Preview shows the note, with its usual modifier key.
				if (path && ev && this.plugin.settings.hoverPreview) {
					this.app.workspace.trigger("hover-link", { event: ev, source: VIEW_TYPE_BRAIN, hoverParent: this, targetEl: this.contentEl, linktext: path });
				}
			},
			onSelect: (info) => this.showInfo(info),
			onMulti: (paths) => this.showMulti(paths),
			onContext: (path, ev) => this.contextMenu(path, ev),
			onHelp: () => this.flip(this.keysCard),
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
		this.engine.setGhosts(s.ghosts);
		this.engine.setRecent(s.recentRing);
		this.registerInterval(window.setInterval(() => this.updatePerf(), 1000));
		this.syncControls(false);
		await this.refresh();
		if (!s.onboarded) this.showWizard(this.stage);
	}

	/* ---------- Building the controls ---------- */

	private buildTools(): void {
		const tools = this.toolsRow;
		const btn = (label: string, title: string, fn: () => void) => {
			const b = tools.createEl("button", { text: label, attr: { "aria-label": title, title } });
			b.addEventListener("click", fn);
			return b;
		};
		btn(this.t("btn.flow"), this.t("btn.flow.title"), () => this.playFlow());
		this.replayBtn = btn(this.t("btn.replay"), this.t("btn.replay.title"), () => this.toggleReplay());
		const modeSel = tools.createEl("select", { attr: { "aria-label": this.t("replay.mode.aria"), title: this.t("replay.mode.aria") } });
		modeSel.createEl("option", { value: "ctime", text: this.t("replay.mode.created") });
		modeSel.createEl("option", { value: "mtime", text: this.t("replay.mode.edited") });
		modeSel.addEventListener("change", () => (this.replayKey = modeSel.value as "ctime" | "mtime"));
		const speedSel = tools.createEl("select", { attr: { "aria-label": this.t("replay.speed.aria"), title: this.t("replay.speed.aria") } });
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
		btn(this.t("btn.export"), this.t("btn.export.title"), () => void this.exportPng());
		btn("?", this.t("btn.help"), () => this.flip(this.keysCard));
	}

	private buildSearchRow(root: HTMLElement): void {
		const row = root.createDiv({ cls: "llm-wiki-brain-search" });
		this.search = row.createEl("input", { type: "search", attr: { placeholder: this.t("search.placeholder"), "aria-label": this.t("search.aria"), list: "llm-wiki-brain-suggest" } });
		this.suggestList = row.createEl("datalist", { attr: { id: "llm-wiki-brain-suggest" } });
		let timer = 0;
		this.search.addEventListener("input", () => {
			this.syncClear();
			this.fillSuggestions();
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
			const b = row.createEl("button", { text: label, attr: { "aria-label": aria, title: aria } });
			b.addEventListener("click", fn);
			return b;
		};
		this.clearBtn = small("✕", this.t("filters.clear"), () => this.clearAll()); // right after the search box: clears the filters and the search
		small("?", this.t("search.help"), () => this.flip(this.helpCard));
		small("‹", this.t("search.prev.aria"), () => this.stepHit(-1));
		small("›", this.t("search.next.aria"), () => this.stepHit(1));
		small(this.t("search.copy"), this.t("search.copy.title"), () => this.copyHits());
		this.filterBtn = row.createEl("button", { text: this.t("filters.button"), attr: { "aria-expanded": "false" } });
		this.filterBtn.addEventListener("click", () => {
			const open = this.panel.hasClass("is-open");
			this.panel.toggleClass("is-open", !open);
			this.filterBtn.setAttribute("aria-expanded", String(!open));
		});
	}

	private flip(el: HTMLElement): void {
		if (el.isShown()) el.hide();
		else el.show();
	}

	private field(label: string, hint?: string): HTMLElement {
		const row = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		const l = row.createEl("label", { text: label });
		if (hint) l.title = hint;
		return row;
	}

	private select(label: string, options: [string, string][], onChange: (v: string) => void): HTMLSelectElement {
		const row = this.field(label, label);
		const sel = row.createEl("select", { attr: { title: label } });
		for (const [v, l] of options) sel.createEl("option", { value: v, text: l });
		sel.addEventListener("change", () => onChange(sel.value));
		return sel;
	}

	private check(label: string, id: string, onChange: (v: boolean) => void): HTMLInputElement {
		const row = this.panel.createDiv({ cls: "llm-wiki-brain-field" });
		const input = row.createEl("input", { type: "checkbox", attr: { id } });
		row.createEl("label", { text: label, attr: { for: id } });
		input.addEventListener("change", () => onChange(input.checked));
		return input;
	}

	private buildPanel(root: HTMLElement): void {
		this.panel = root.createDiv({ cls: "llm-wiki-brain-panel" });
		this.previewEl = this.panel.createDiv({ cls: "llm-wiki-brain-preview", attr: { "aria-live": "polite" } });
		this.folderSel = this.select(this.t("filters.folder"), [], (v) => {
			this.filters.folder = v;
			this.applyFilters();
		});
		this.tagSel = this.select(this.t("filters.tag"), [], (v) => {
			this.filters.tag = v;
			this.applyFilters();
		});
		this.opSel = this.select(this.t("filters.op"), [], (v) => {
			this.filters.op = v;
			this.applyFilters();
		});
		this.dirSel = this.select(
			this.t("filters.dir"),
			[["", this.t("filters.dir.any")], ["sources", this.t("filters.dir.sources")], ["sinks", this.t("filters.dir.sinks")], ["hubs2", this.t("filters.dir.hubs2")]],
			(v) => {
				this.filters.dir = v as Filters["dir"];
				this.applyFilters();
			},
		);
		const deg = this.field(this.t("filters.minLinks"), this.t("filters.minLinks.aria"));
		this.degIn = deg.createEl("input", { type: "range", attr: { min: "0", max: "10", step: "1", value: "0", "aria-label": this.t("filters.minLinks.aria"), title: this.t("filters.minLinks.aria") } });
		this.degOut = deg.createSpan({ text: "0" });
		this.degIn.addEventListener("input", () => {
			this.degOut.setText(this.degIn.value);
			this.filters.minDeg = Number(this.degIn.value);
			this.applyFilters();
		});
		const max = this.field(this.t("filters.maxLinks"), this.t("filters.maxLinks.aria"));
		this.maxIn = max.createEl("input", { type: "range", attr: { min: "0", max: "20", step: "1", value: "0", "aria-label": this.t("filters.maxLinks.aria"), title: this.t("filters.maxLinks.aria") } });
		this.maxOut = max.createSpan({ text: "∞" });
		this.maxIn.addEventListener("input", () => {
			this.maxOut.setText(this.maxIn.value === "0" ? "∞" : this.maxIn.value);
			this.filters.maxDeg = Number(this.maxIn.value);
			this.applyFilters();
		});
		const ages: [string, string][] = [["0", this.t("filters.anyTime")], ["7", this.t("filters.days7")], ["30", this.t("filters.days30")], ["365", this.t("filters.year")]];
		this.daysSel = this.select(this.t("filters.edited"), ages, (v) => {
			this.filters.days = Number(v);
			this.applyFilters();
		});
		this.createdSel = this.select(this.t("filters.created"), ages, (v) => {
			this.filters.createdDays = Number(v);
			this.applyFilters();
		});
		this.depthSel = this.select(this.t("filters.depth"), [["1", "1"], ["2", "2"], ["3", "3"]], (v) => {
			this.filters.depth = Number(v);
			this.applyFilters();
		});
		this.invIn = this.check(this.t("filters.invert"), "llm-wiki-brain-invert", (v) => {
			this.filters.invert = v;
			this.applyFilters();
		});
		this.orphIn = this.check(this.t("filters.orphansOnly"), "llm-wiki-brain-orphans", (v) => {
			this.filters.orphansOnly = v;
			this.applyFilters();
		});
		const q = this.field(this.t("filters.query"), this.t("filters.query"));
		this.queryIn = q.createEl("input", { type: "text", attr: { placeholder: this.t("filters.query.ph"), "aria-label": this.t("filters.query") } });
		let qt = 0;
		this.queryIn.addEventListener("input", () => {
			window.clearTimeout(qt);
			qt = window.setTimeout(() => {
				this.extraQuery = this.queryIn.value;
				this.applyFilters();
			}, 200);
		});
		this.hideIn = this.check(this.t("search.hide"), "llm-wiki-brain-hide", (v) => {
			this.hideNonMatches = v;
			this.applyFilters();
		});
		this.ghostIn = this.check(this.t("filters.ghosts"), "llm-wiki-brain-ghosts", (v) => {
			this.engine?.setGhosts(v);
			void this.plugin.persist({ ghosts: v });
		});
		this.recentIn = this.check(this.t("filters.recent"), "llm-wiki-brain-recent", (v) => {
			this.engine?.setRecent(v);
			void this.plugin.persist({ recentRing: v });
		});
		this.colorSel = this.select(
			this.t("color.by"),
			[["type", this.t("color.type")], ["folder", this.t("color.folder")], ["tag", this.t("color.tag")], ["age", this.t("color.age")], ["degree", this.t("color.degree")]],
			(v) => {
				this.colorMode = v as ColorMode;
				this.applyColorSize();
			},
		);
		this.sizeSel = this.select(this.t("size.by"), [["same", this.t("size.same")], ["degree", this.t("size.degree")], ["recent", this.t("size.recent")]], (v) => {
			this.sizeMode = v as SizeMode;
			this.applyColorSize();
		});
		const clear = this.panel.createEl("button", { text: this.t("filters.clear") });
		clear.addEventListener("click", () => this.clearAll());

		// Saved views: the filters and the search, under a name.
		const views = this.panel.createDiv({ cls: "llm-wiki-brain-field llm-wiki-brain-views" });
		this.viewSel = views.createEl("select", { attr: { "aria-label": this.t("views.pick") } });
		this.fillViews();
		this.viewSel.addEventListener("change", () => {
			const v = this.plugin.settings.savedViews.find((x) => x.name === this.viewSel.value);
			if (!v) return;
			this.filters = { ...DEFAULT_FILTERS, ...(v.filters as Partial<Filters>), hidden: Array.isArray(v.filters.hidden) ? (v.filters.hidden as PageType[]) : [] };
			this.neighborhood = null;
			this.isolate = null;
			this.search.value = v.query;
			this.nameIn.value = v.name;
			this.syncControls(true);
		});
		this.nameIn = views.createEl("input", { type: "text", attr: { placeholder: this.t("views.name"), "aria-label": this.t("views.name") } });
		views.createEl("button", { text: this.t("views.save") }).addEventListener("click", () => {
			const name = this.nameIn.value.trim();
			if (!name) return;
			void this.plugin.saveViews(saveView(this.plugin.settings.savedViews, { name, query: this.search.value.trim(), filters: { ...this.filters } }));
			this.fillViews(name);
			new Notice(this.t("views.saved", { name }));
		});
		views.createEl("button", { text: this.t("views.delete") }).addEventListener("click", () => {
			if (!this.viewSel.value) return;
			void this.plugin.saveViews(removeView(this.plugin.settings.savedViews, this.viewSel.value));
			this.nameIn.value = "";
			this.fillViews();
		});
	}

	private fillViews(pick = ""): void {
		this.viewSel.empty();
		this.viewSel.createEl("option", { value: "", text: this.t("views.pick") });
		for (const v of this.plugin.settings.savedViews) this.viewSel.createEl("option", { value: v.name, text: v.name });
		this.viewSel.value = pick;
	}

	/** The syntax card (clickable examples) and the shortcuts card. */
	private buildCards(): void {
		const close = (card: HTMLElement) => card.createEl("button", { text: "×", cls: "llm-wiki-brain-card-x", attr: { "aria-label": this.t("keys.close") } }).addEventListener("click", () => card.hide());
		const h = this.helpCard;
		close(h);
		h.createEl("strong", { text: this.t("search.help.title") });
		const rows: [string, StringKey][] = [
			["path:concepts -type:source", "help.d.words"],
			["tag:ai or tag:ml", "help.d.or"],
			["links:>3", "help.d.links"],
			["edited:<7d  created:>2026-01-01  edited:today", "help.d.dates"],
			["prop:status=draft", "help.d.prop"],
			["is:orphan  is:broken  is:hub", "help.d.is"],
			["to:attention  from:index", "help.d.to"],
			["/kv-?cache/", "help.d.regex"],
		];
		for (const [ex, d] of rows) {
			const r = h.createDiv({ cls: "llm-wiki-brain-card-row" });
			const code = r.createEl("button", { text: ex, cls: "llm-wiki-brain-code" });
			code.addEventListener("click", () => {
				this.search.value = ex.split("  ")[0];
				this.search.focus();
				this.syncClear();
				this.applySearch(false);
			});
			r.createSpan({ text: this.t(d) });
		}
		const k = this.keysCard;
		close(k);
		k.createEl("strong", { text: this.t("keys.title") });
		for (const key of ["keys.rotate", "keys.nav", "keys.select", "keys.mouse", "keys.legend"] as StringKey[]) k.createEl("p", { text: this.t(key) });
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

	/* ---------- State of the controls ---------- */

	/** Show `this.filters` and friends in every control (used after restoring state, a saved view or a clear). */
	syncControls(apply: boolean): void {
		if (!this.degIn) return;
		const f = this.filters;
		this.degIn.value = String(f.minDeg);
		this.degOut.setText(String(f.minDeg));
		this.maxIn.value = String(f.maxDeg);
		this.maxOut.setText(f.maxDeg ? String(f.maxDeg) : "∞");
		this.daysSel.value = String(f.days);
		this.createdSel.value = String(f.createdDays);
		this.depthSel.value = String(f.depth);
		this.dirSel.value = f.dir;
		this.invIn.checked = f.invert;
		this.orphIn.checked = f.orphansOnly;
		this.folderSel.value = f.folder;
		this.tagSel.value = f.tag;
		this.opSel.value = f.op;
		this.queryIn.value = this.extraQuery;
		this.hideIn.checked = this.hideNonMatches;
		this.ghostIn.checked = this.plugin.settings.ghosts;
		this.recentIn.checked = this.plugin.settings.recentRing;
		this.colorSel.value = this.colorMode;
		this.sizeSel.value = this.sizeMode;
		if (this.pending?.q !== undefined && !this.search.value) this.search.value = this.pending.q;
		for (const t of TYPES) this.engine?.setHidden(t, f.hidden.includes(t));
		this.syncChips();
		if (apply) {
			this.applyFilters();
			this.applySearch(false);
			this.applyColorSize();
		}
	}

	/** Clear every filter, the isolated neighbourhood or selection, and the search. */
	clearAll(): void {
		this.filters = { ...DEFAULT_FILTERS, hidden: [] };
		this.neighborhood = null;
		this.isolate = null;
		this.extraQuery = "";
		this.hideNonMatches = false;
		this.search.value = "";
		this.syncControls(true);
	}

	focusSearch(): void {
		this.search?.focus();
		this.search?.select();
	}

	private openNote(path: string, split = false): void {
		const f = this.app.vault.getAbstractFileByPath(path);
		if (f instanceof TFile) void this.app.workspace.getLeaf(split ? "split" : "tab").openFile(f);
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
		const g = this.graph;
		this.inDeg.clear();
		this.outDeg.clear();
		for (const [a, b] of g.links) {
			this.outDeg.set(a, (this.outDeg.get(a) ?? 0) + 1);
			this.inDeg.set(b, (this.inDeg.get(b) ?? 0) + 1);
		}
		this.engine.setGraph(g.pages, g.links, this.plugin.layout, g.counts, g.inhibit);
		for (const t of this.filters.hidden) this.engine.setHidden(t, true);
		this.fillSelects();
		this.syncControls(false);
		this.applyColorSize();
		this.applyFilters();
		this.applySearch(false);
		this.updateStatus();
		this.restorePending();
		if (!g.pages.length) this.tip.setText(g.rootMissing ? this.t("tip.rootMissing", { root: this.plugin.settings.wikiRoot }) : this.t("tip.noPages"));
	}

	/** Camera and selection saved with the view, applied once the graph is there. */
	private restorePending(): void {
		const p = this.pending;
		if (!p || !this.engine) return;
		this.pending = null;
		if (p.cam) this.engine.setCamera(p.cam);
		if (p.sel?.length) this.engine.setSelection(p.sel);
	}

	private fillSelects(): void {
		if (!this.graph) return;
		const fill = (sel: HTMLSelectElement, any: string, values: [string, string][], current: string) => {
			sel.empty();
			sel.createEl("option", { value: "", text: any });
			for (const [v, l] of values) sel.createEl("option", { value: v, text: l });
			sel.value = values.some(([v]) => v === current) ? current : "";
		};
		const folderCount = new Map<string, number>();
		const tagCount = new Map<string, number>();
		for (const m of this.graph.meta.values()) {
			if (m.folder) folderCount.set(m.folder, (folderCount.get(m.folder) ?? 0) + 1);
			for (const t of m.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
		}
		const folders = Array.from(folderCount.keys()).sort();
		fill(this.folderSel, this.t("filters.allFolders"), folders.map((f) => [f, `${f} (${folderCount.get(f)})`]), this.filters.folder);
		const tags = Array.from(tagCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40);
		fill(this.tagSel, this.t("filters.allTags"), tags.map(([t, n]) => [t, `${t} (${n})`]), this.filters.tag);
		fill(this.opSel, this.t("filters.anyOp"), logOps(this.logEntries).map((o) => [o, o]), this.filters.op);
		this.vocab = { tags: tags.map(([t]) => t), folders, types: [...TYPES] };
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

	/* ---------- Filters, chips, colour and size ---------- */

	private applyFilters(): void {
		if (!this.engine || !this.graph) return;
		const g = this.graph, engine = this.engine;
		const pages: FilterPage[] = g.pages.map((p) => ({ path: p.path, mtime: p.mtime, ctime: p.ctime, folder: g.meta.get(p.path)?.folder ?? "", tags: g.meta.get(p.path)?.tags ?? [] }));
		let extra: Set<string> | null = null;
		const intersect = (s: Set<string>) => (extra = extra ? new Set([...extra].filter((x) => s.has(x))) : s);
		if (this.extraQuery.trim()) intersect(matchQuery(g, this.extraQuery.trim()));
		if (this.hideNonMatches && this.search.value.trim()) intersect(matchQuery(g, this.search.value.trim()));
		engine.setFilter(
			filterPaths(pages, this.filters, {
				degree: (path) => engine.degree(path),
				inDeg: (path) => this.inDeg.get(path) ?? 0,
				outDeg: (path) => this.outDeg.get(path) ?? 0,
				orphans: new Set(g.orphans),
				opPaths: this.filters.op ? pagesByOp(this.logEntries, g.pages, this.filters.op) : null,
				extra,
				isolate: this.isolate,
				neighbourhood: this.neighborhood ? neighbourhoodOf(g.links, this.neighborhood, this.filters.depth) : null,
				now: Date.now(),
			}),
		);
		this.updateStatus();
		this.renderChips();
		this.syncClear();
	}

	private currentChips(): Chip[] {
		return activeChips({ ...this.filters, hidden: this.filters.hidden as string[] }, this.neighborhood, this.extraQuery, this.isolate?.size ?? 0);
	}

	/** One removable chip per filter that is on, under the search box. */
	private renderChips(): void {
		const list = this.currentChips();
		this.filterBtn?.setText(list.length ? this.t("filters.buttonActive", { n: list.length }) : this.t("filters.button"));
		this.chipsRow.empty();
		this.chipsRow.toggleClass("is-empty", list.length === 0);
		for (const c of list) {
			const v = c.key === "dir" ? this.t(("filters.dir." + c.value) as StringKey) : c.value;
			const b = this.chipsRow.createEl("button", { cls: "llm-wiki-brain-achip", text: this.t(("chip." + c.key) as StringKey, { v }) + " ✕", attr: { "aria-label": this.t("chip.remove") + ": " + c.key } });
			b.addEventListener("click", () => this.removeChip(c));
		}
		if (this.previewEl && this.engine) {
			const s = this.engine.stats();
			this.previewEl.setText(this.t("filters.preview", { visible: s.visible, total: s.nodes }));
		}
	}

	private removeChip(c: Chip): void {
		if (c.key === "hood") this.neighborhood = null;
		else if (c.key === "extra") this.extraQuery = "";
		else if (c.key === "isolate") this.isolate = null;
		else this.filters = withoutChip(this.filters, c.key) as Filters;
		this.syncControls(true);
	}

	/** The clear button next to the search box is only live when there is something to clear. */
	private syncClear(): void {
		if (!this.clearBtn) return;
		this.clearBtn.disabled = this.currentChips().length === 0 && !this.search.value.trim();
	}

	private applyColorSize(): void {
		if (!this.engine || !this.graph) return;
		const g = this.graph;
		const pages = g.pages.map((p) => ({ path: p.path, folder: g.meta.get(p.path)?.folder ?? "", tags: g.meta.get(p.path)?.tags ?? [], mtime: p.mtime, deg: (this.inDeg.get(p.path) ?? 0) + (this.outDeg.get(p.path) ?? 0) }));
		const cats = colorCats(this.colorMode, pages);
		this.engine.setColorBy(cats?.cat ?? null);
		this.engine.setSizeBy(sizeFactors(this.sizeMode, pages, Date.now()));
		this.renderLegend(cats?.labels ?? null);
	}

	private renderLegend(labels: string[] | null): void {
		this.legend.empty();
		if (!this.engine) return;
		TYPES.forEach((type, i) => {
			const raw = labels ? labels[i] : "@type." + type;
			if (!raw) return;
			const row = this.legend.createDiv({ cls: "llm-wiki-brain-legend-row" });
			row.createSpan({ cls: "llm-wiki-brain-dot" }).style.setProperty("--c", this.engine?.typeColor(type) ?? "#888");
			row.createSpan({ text: raw.startsWith("@") ? this.t(raw.slice(1) as StringKey) : raw });
		});
	}

	/* ---------- Search ---------- */

	private fillSuggestions(): void {
		this.suggestList.empty();
		const q = this.search.value;
		const items = suggest(q, this.vocab);
		for (const h of this.plugin.settings.history) if (q && h.toLowerCase().startsWith(q.toLowerCase()) && h !== q) items.push(h);
		for (const it of items.slice(0, 10)) this.suggestList.createEl("option", { value: it });
	}

	private applySearch(ask: boolean): void {
		if (!this.engine || !this.graph) return;
		const q = this.search.value.trim();
		this.syncClear();
		if (!q) {
			this.engine.setMatch(null);
			this.hits = [];
			this.hitAt = -1;
			this.results.hide();
			if (this.hideNonMatches) this.applyFilters();
			return;
		}
		const hits = matchQuery(this.graph, q);
		this.engine.setMatch(hits);
		this.hits = Array.from(hits).sort();
		this.hitAt = -1;
		this.renderResults();
		if (this.hideNonMatches) this.applyFilters();
		if (ask) {
			const hist = [q, ...this.plugin.settings.history.filter((x) => x !== q)].slice(0, 12);
			void this.plugin.persist({ history: hist });
			const n = this.engine.ask(Array.from(hits));
			this.status.setText(n ? this.t("status.ask", { n }) : this.t("status.noMatch"));
		} else this.status.setText(this.t("status.matches", { n: hits.size }));
	}

	/** A clickable list of what matched, so a search is not only a dimmed picture. */
	private renderResults(): void {
		this.results.empty();
		if (!this.hits.length) {
			this.results.hide();
			return;
		}
		this.results.show();
		this.results.createSpan({ cls: "llm-wiki-brain-results-n", text: this.t("search.results", { n: this.hits.length }) });
		for (const p of this.hits.slice(0, 10)) {
			const b = this.results.createEl("button", { text: stem(p), attr: { title: p } });
			b.addEventListener("click", () => this.engine?.selectPath(p, true));
		}
		if (this.hits.length > 10) this.results.createSpan({ text: this.t("search.more", { n: this.hits.length - 10 }) });
	}

	/** Walk through the matches one by one: the camera goes to each. */
	private stepHit(dir: number): void {
		if (!this.engine || !this.hits.length) return;
		this.hitAt = (this.hitAt + dir + this.hits.length) % this.hits.length;
		const path = this.hits[this.hitAt];
		this.engine.selectPath(path, true);
		this.status.setText(this.t("status.matchAt", { i: this.hitAt + 1, n: this.hits.length, name: stem(path) }));
	}

	private copyHits(): void {
		if (!this.hits.length) return;
		void navigator.clipboard.writeText(toWikiLinks(this.hits)).then(() => new Notice(this.t("status.copied", { n: this.hits.length })));
	}

	/* ---------- Replay ---------- */

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
		this.scrub.max = String(step.n);
		this.scrub.value = String(step.i);
		const date = new Date(step.time).toISOString().slice(0, 10);
		const ops = Array.from(new Set(logOn(this.logEntries, step.time).map((e) => e.op))).join(", ");
		this.replayCaption.setText(ops ? this.t("replay.captionLog", { date, i: step.i, n: step.n, ops }) : this.t("replay.caption", { date, i: step.i, n: step.n }));
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

	/* ---------- Status, tooltip, info panel ---------- */

	private updateStatus(): void {
		if (!this.engine || !this.graph) return;
		const s = this.engine.stats();
		const g = this.graph;
		let text = this.t("status.summary", { visible: s.visible, nodes: s.nodes, links: s.links, orphans: g.orphans.length, broken: g.broken.length });
		if (g.truncated) text += " · " + this.t("status.truncated", { n: g.truncated, max: this.plugin.settings.maxNodes });
		this.status.setText(text);
	}

	private updatePerf(): void {
		if (!this.engine || !this.perfEl) return;
		if (!this.plugin.settings.showPerf) return this.perfEl.setText("");
		const s = this.engine.stats();
		this.perfEl.setText(this.t("perf.line", { fps: s.frameMs > 0 ? Math.min(60, Math.round(1000 / Math.max(s.frameMs, 1000 / 60))) : 60, q: s.quality }));
	}

	/** A card near the pointer: what the page is, how connected, when it changed. */
	private showTooltip(path: string | null, ev?: PointerEvent): void {
		if (!path || !ev || !this.graph) return this.tooltip.hide();
		const p = this.graph.pages.find((x) => x.path === path);
		if (!p) return this.tooltip.hide();
		const when = ago(p.mtime, Date.now());
		this.tooltip.empty();
		this.tooltip.createEl("strong", { text: p.label });
		this.tooltip.createDiv({ text: this.t("tip.card", { type: this.t(("type." + p.type) as StringKey), inn: this.inDeg.get(path) ?? 0, out: this.outDeg.get(path) ?? 0, when: this.t(when.key, { n: when.n }) }) });
		this.tooltip.show();
		const r = this.stage.getBoundingClientRect();
		const x = Math.min(ev.clientX - r.left + 14, Math.max(0, r.width - 230)), y = Math.min(ev.clientY - r.top + 16, Math.max(0, r.height - 60));
		this.tooltip.style.left = x + "px";
		this.tooltip.style.top = y + "px";
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
		const when = ago(info.mtime, Date.now());
		this.info.createDiv({ cls: "llm-wiki-brain-meta", text: this.t("info.meta", { type: this.t(("type." + info.type) as StringKey), deg: info.deg, created: fmt(info.ctime), edited: fmt(info.mtime) }) + " (" + this.t(when.key, { n: when.n }) + ")" });
		this.info.createDiv({ cls: "llm-wiki-brain-meta", text: info.path });
		const g = this.graph;
		if (g?.broken.includes(info.path)) this.info.createDiv({ cls: "llm-wiki-brain-warn", text: this.t("info.broken") });
		const actions = this.info.createDiv({ cls: "llm-wiki-brain-actions" });
		const act = (label: string, fn: () => void) => actions.createEl("button", { text: label }).addEventListener("click", fn);
		act(this.t("info.open"), () => this.openNote(info.path));
		act(this.t("info.split"), () => this.openNote(info.path, true));
		act(this.t("info.flowFrom"), () => this.playFlow({ to: info.path }));
		act(this.neighborhood === info.path ? this.t("info.showAll") : this.t("info.onlyNeighborhood"), () => {
			this.neighborhood = this.neighborhood === info.path ? null : info.path;
			this.applyFilters();
			this.showInfo(info);
		});
		act(info.pinned ? this.t("info.unpin") : this.t("info.pin"), () => this.engine?.togglePin(info.path));
		act(this.t("info.attend"), () => this.attend(info.path));
		act(this.t("info.copy"), () => this.copyLinks([info.path]));
		this.info.createDiv({ cls: "llm-wiki-brain-meta", text: this.t("info.neuron", { inn: info.inputs.length, out: info.outputs.length, theta: info.threshold }) });
		const side = (title: string, items: { path: string; label: string }[], open: boolean) => {
			if (!items.length) return;
			const d = this.info.createEl("details", { cls: "llm-wiki-brain-side" });
			d.open = open;
			d.createEl("summary", { text: `${title} (${items.length})` });
			const list = d.createDiv({ cls: "llm-wiki-brain-neighbors" });
			for (const n of items) {
				const b = list.createEl("button", { text: n.label, attr: { title: n.path } });
				b.addEventListener("click", () => this.engine?.selectPath(n.path, true));
			}
		};
		side(this.t("info.inputs"), info.inputs, true);
		side(this.t("info.outputs"), info.outputs, true);
		const props = g?.meta.get(info.path)?.props ?? {};
		const keys = Object.keys(props).filter((k) => k !== "tags").slice(0, 8);
		if (keys.length) {
			const d = this.info.createEl("details", { cls: "llm-wiki-brain-side" });
			d.createEl("summary", { text: `${this.t("info.props")} (${keys.length})` });
			for (const k of keys) d.createDiv({ cls: "llm-wiki-brain-meta", text: `${k}: ${props[k]}` });
		}
	}

	/** A group of pages is selected: what they are together, and what can be done with all of them. */
	private showMulti(paths: string[]): void {
		if (paths.length < 2 || !this.graph) return;
		this.info.empty();
		this.info.show();
		const set = new Set(paths);
		const links = this.graph.links.filter(([a, b]) => set.has(a) && set.has(b)).length;
		const orphans = paths.filter((p) => this.graph?.orphans.includes(p)).length;
		const head = this.info.createDiv({ cls: "llm-wiki-brain-info-head" });
		head.createEl("strong", { text: this.t("multi.title", { n: paths.length }) });
		head.createEl("button", { text: "×", attr: { "aria-label": this.t("multi.clear") } }).addEventListener("click", () => this.engine?.setSelection([]));
		this.info.createDiv({ cls: "llm-wiki-brain-meta", text: this.t("multi.meta", { links, orphans }) });
		const actions = this.info.createDiv({ cls: "llm-wiki-brain-actions" });
		const act = (label: string, fn: () => void) => actions.createEl("button", { text: label }).addEventListener("click", fn);
		act(this.t("multi.isolate"), () => {
			this.isolate = new Set(paths);
			this.applyFilters();
		});
		act(this.t("multi.copy"), () => this.copyLinks(paths));
		act(this.t("multi.canvas"), () => void this.makeCanvas(paths));
		if (paths.length === 2) act(this.t("multi.route"), () => this.routeBetween(paths[0], paths[1]));
		const list = this.info.createDiv({ cls: "llm-wiki-brain-neighbors" });
		for (const p of paths.slice(0, 24)) list.createEl("button", { text: stem(p), attr: { title: p } }).addEventListener("click", () => this.engine?.selectPath(p, true));
	}

	private routeBetween(a: string, b: string): void {
		const r = this.engine?.playFlow({ from: a, to: b, mode: "selected" });
		if (!r) return void this.status.setText(this.t("status.flowNone"));
		this.status.setText(r.virtual ? this.t("status.flowVirtual", { from: stem(r.from), to: stem(r.to) }) : this.t("status.flowRoute", { from: stem(r.from), to: stem(r.to), hops: r.hops }));
	}

	private copyLinks(paths: string[]): void {
		void navigator.clipboard.writeText(toWikiLinks(paths)).then(() => new Notice(this.t("status.copied", { n: paths.length })));
	}

	private contextMenu(path: string | null, ev: MouseEvent): void {
		const m = new Menu();
		const sel = this.engine?.selection() ?? [];
		if (path) {
			m.addItem((i) => i.setTitle(this.t("info.open")).setIcon("file-text").onClick(() => this.openNote(path)));
			m.addItem((i) => i.setTitle(this.t("info.split")).setIcon("separator-vertical").onClick(() => this.openNote(path, true)));
			m.addItem((i) => i.setTitle(this.t("info.copy")).setIcon("link").onClick(() => this.copyLinks(sel.length > 1 ? sel : [path])));
			m.addItem((i) => i.setTitle(this.t("info.pin")).setIcon("pin").onClick(() => this.engine?.togglePin(path)));
			m.addItem((i) => i.setTitle(this.t("info.onlyNeighborhood")).setIcon("focus").onClick(() => {
				this.neighborhood = path;
				this.applyFilters();
			}));
			m.addItem((i) => i.setTitle(this.t("info.attend")).setIcon("sparkles").onClick(() => this.attend(path)));
			m.addItem((i) => i.setTitle(this.t("info.flowFrom")).setIcon("workflow").onClick(() => this.playFlow({ to: path })));
		}
		if (sel.length > 1) {
			m.addSeparator();
			m.addItem((i) => i.setTitle(this.t("multi.isolate")).setIcon("focus").onClick(() => {
				this.isolate = new Set(sel);
				this.applyFilters();
			}));
			m.addItem((i) => i.setTitle(this.t("multi.canvas")).setIcon("layout-dashboard").onClick(() => void this.makeCanvas(sel)));
		}
		m.addSeparator();
		m.addItem((i) => i.setTitle(this.t("btn.reset")).setIcon("rotate-ccw").onClick(() => this.engine?.resetView()));
		m.addItem((i) => i.setTitle(this.t("filters.clear")).setIcon("x").onClick(() => this.clearAll()));
		m.addItem((i) => i.setTitle(this.t("btn.export.title")).setIcon("image").onClick(() => void this.exportPng()));
		m.showAtMouseEvent(ev);
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
		this.status.setText(r.virtual ? this.t("status.flowVirtual", { from: stem(r.from), to: stem(r.to) }) : this.t("status.flowRoute", { from: stem(r.from), to: stem(r.to), hops: r.hops }));
	}

	pulse(path: string): void {
		this.engine?.pulse(path);
	}

	/** The note that just opened becomes the selection and the camera goes to it. */
	followFile(path: string): void {
		if (this.plugin.settings.followActiveNote) this.engine?.selectPath(path, true);
	}

	/* ---------- Export ---------- */

	private stamp(): string {
		return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
	}

	/** Save what the canvas shows as a PNG in the vault root. */
	async exportPng(): Promise<void> {
		try {
			const blob = await new Promise<Blob | null>((res) => this.canvas.toBlob(res, "image/png"));
			if (!blob) throw new Error("empty");
			const path = `brain-${this.stamp()}.png`;
			await this.app.vault.createBinary(path, await blob.arrayBuffer());
			new Notice(this.t("export.saved", { path }));
		} catch {
			new Notice(this.t("export.failed"));
		}
	}

	/** Obsidian Canvas of the selected notes, laid out as the brain shows them. */
	async makeCanvas(paths?: string[]): Promise<void> {
		const list = paths ?? this.engine?.selection() ?? [];
		if (!list.length || !this.engine || !this.graph) return void new Notice(this.t("status.noMatch"));
		const lay = this.engine.layout();
		const items = list.map((p) => ({ path: p, x: lay[p]?.[0] ?? 0, y: lay[p]?.[1] ?? 0 }));
		const set = new Set(list);
		const path = `brain-selection-${this.stamp()}.canvas`;
		await this.app.vault.create(path, JSON.stringify(toCanvas(items, this.graph.links.filter(([a, b]) => set.has(a) && set.has(b))), null, 2));
		new Notice(this.t("canvas.saved", { path }));
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
				list.createEl("button", { text: stem(p), attr: { title: p } }).addEventListener("click", () => this.engine?.selectPath(p, true));
			}
		};
		section(this.t("lint.orphans"), g.orphans);
		section(this.t("lint.broken"), g.broken);
		section(this.t("lint.untyped"), g.untyped);
		new Notice(this.t("lint.notice", { orphans: g.orphans.length, broken: g.broken.length, untyped: g.untyped.length }));
	}
}
