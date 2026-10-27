import { ItemView, TFile, WorkspaceLeaf, Notice } from "obsidian";
import { BrainEngine, PageType, TYPES } from "./engine";
import type BrainPlugin from "./main";
import { buildVaultGraph, VaultGraph } from "./vaultGraph";

export const VIEW_TYPE_BRAIN = "llm-wiki-brain-view";

export class BrainView extends ItemView {
	engine: BrainEngine | null = null;
	private graph: VaultGraph | null = null;
	private tip!: HTMLElement;
	private chips = new Map<PageType, HTMLButtonElement>();
	private hiddenTypes = new Set<PageType>();

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

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("llm-wiki-brain");
		const bar = root.createDiv({ cls: "llm-wiki-brain-bar" });
		for (const t of TYPES) {
			const chip = bar.createEl("button", { cls: "llm-wiki-brain-chip", attr: { "aria-pressed": "true", "data-type": t } });
			chip.createSpan({ cls: "llm-wiki-brain-dot" });
			chip.createSpan({ text: t });
			chip.createSpan({ cls: "llm-wiki-brain-n" });
			chip.addEventListener("click", () => this.toggle(t));
			this.chips.set(t, chip);
		}
		const stage = root.createDiv({ cls: "llm-wiki-brain-stage" });
		const canvas = stage.createEl("canvas", {
			attr: {
				tabindex: "0",
				role: "img",
				"aria-label": "Interactive 3D brain of your wiki pages and links. Drag to rotate, arrow keys to orbit, plus and minus to zoom.",
			},
		});
		this.tip = root.createDiv({ cls: "llm-wiki-brain-tip", text: "Drag to rotate, scroll to zoom, click a page to open it." });
		this.engine = new BrainEngine(canvas, {
			reducedMotion: this.plugin.settings.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
			onOpen: (path) => {
				const f = this.app.vault.getAbstractFileByPath(path);
				if (f instanceof TFile) void this.app.workspace.getLeaf("tab").openFile(f);
			},
			onHover: (path) => {
				this.tip.setText(path ?? "Drag to rotate, scroll to zoom, click a page to open it.");
			},
		});
		this.registerEvent(this.app.workspace.on("css-change", () => this.engine?.readTheme()));
		this.refresh();
	}

	async onClose(): Promise<void> {
		this.engine?.destroy();
		this.engine = null;
	}

	/** Rebuild the graph from the vault; existing cells keep their place. */
	refresh(): void {
		if (!this.engine) return;
		this.graph = buildVaultGraph(this.app, this.plugin.settings);
		this.engine.setGraph(this.graph.pages, this.graph.links);
		const counts = this.engine.counts();
		for (const t of TYPES) {
			const chip = this.chips.get(t);
			if (!chip) continue;
			chip.style.setProperty("--c", this.engine.typeColor(t));
			chip.querySelector(".llm-wiki-brain-n")?.setText(String(counts[t]));
		}
		if (!this.graph.pages.length) this.tip.setText("No pages found. Check the wiki folder in the plugin settings.");
	}

	private toggle(t: PageType): void {
		const off = !this.hiddenTypes.has(t);
		if (off) this.hiddenTypes.add(t);
		else this.hiddenTypes.delete(t);
		this.chips.get(t)?.setAttribute("aria-pressed", String(!off));
		this.engine?.setHidden(t, off);
	}

	pulse(path: string): void {
		this.engine?.pulse(path);
	}

	/** Lint overlay: orphans and pages with broken links. */
	runLint(): void {
		if (!this.engine) return;
		this.graph = buildVaultGraph(this.app, this.plugin.settings);
		const flagged = Array.from(new Set([...this.graph.orphans, ...this.graph.broken]));
		this.engine.flag(flagged);
		new Notice(`Wiki lint: ${this.graph.orphans.length} orphan page(s), ${this.graph.broken.length} page(s) with broken links.`);
	}
}
