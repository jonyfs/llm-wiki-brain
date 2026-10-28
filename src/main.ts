import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, debounce, getLanguage } from "obsidian";
import { Lang, LangPref, LANG_NAMES, LANGS, resolveLang, StringKey, translate, Vars } from "./i18n";
import { BrainView, VIEW_TYPE_BRAIN } from "./view";
import { BrainSettings, DEFAULT_SETTINGS, matchQuery, buildVaultGraph } from "./vaultGraph";
import { Layout, pruneLayout } from "./layout";
import { cleanViews, SavedView } from "./views";

class AskModal extends Modal {
	constructor(app: App, private t: (key: StringKey, vars?: Vars) => string, private onSubmit: (q: string) => void) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(this.t("ask.title"));
		let q = "";
		new Setting(this.contentEl).setName(this.t("ask.desc")).addText((t) => {
			t.setPlaceholder(this.t("ask.placeholder")).onChange((v) => (q = v));
			t.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					this.close();
					this.onSubmit(q);
				}
			});
			window.setTimeout(() => t.inputEl.focus(), 0);
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export default class BrainPlugin extends Plugin {
	settings: BrainSettings = DEFAULT_SETTINGS;
	layout: Layout = {};
	lang: Lang = "en";
	private saveLayoutLater = debounce((l: Layout) => {
		this.layout = pruneLayout(l, null);
		void this.saveData({ ...this.settings, layout: this.layout });
	}, 2500, true);

	async onload(): Promise<void> {
		await this.loadSettings();
		this.registerView(VIEW_TYPE_BRAIN, (leaf) => new BrainView(leaf, this));
		this.registerHoverLinkSource(VIEW_TYPE_BRAIN, { display: "LLM Wiki Brain", defaultMod: true });
		const t = (k: StringKey, v?: Vars) => this.t(k, v);
		this.addRibbonIcon("brain", t("cmd.ribbon"), () => void this.activate());
		this.addCommand({ id: "open", name: t("cmd.open"), callback: () => void this.activate() });
		this.addCommand({
			id: "ask",
			name: t("cmd.ask"),
			callback: () => {
				void this.activate().then(() =>
					new AskModal(this.app, t, (q) => {
						const hits = Array.from(matchQuery(buildVaultGraph(this.app, this.settings), q));
						this.views().forEach((v) => v.engine?.ask(hits));
						new Notice(hits.length ? t("ask.lit", { n: hits.length }) : t("status.noMatch"));
					}).open(),
				);
			},
		});
		this.addCommand({ id: "lint", name: t("cmd.lint"), callback: () => void this.activate().then(() => this.views().forEach((v) => v.runLint())) });
		this.addCommand({ id: "clear", name: t("cmd.clear"), callback: () => this.views().forEach((v) => v.engine?.clearMarks()) });
		this.addCommand({ id: "flow", name: t("cmd.flow"), callback: () => void this.activate().then(() => this.views().forEach((v) => v.playFlow())) });
		this.addCommand({ id: "replay", name: t("cmd.replay"), callback: () => void this.activate().then(() => this.views().forEach((v) => v.engine?.replay())) });
		this.addSettingTab(new BrainSettingTab(this.app, this));

		let pending: string | null = null; // a page created a moment ago: once it is indexed, information flows to it
		const resync = debounce(() => {
			const target = this.settings.autoFlowOnCreate ? pending : null;
			pending = null;
			// An animation in flight is not erased: the rebuild waits for it (at most 5 s).
			this.views().forEach((v) => v.requestRefresh(target ? () => v.playFlow({ to: target }) : undefined));
		}, 800, true);
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.metadataCache.on("resolved", resync));
			// Ingest: a page that is created or edited fires, then the graph catches up.
			this.registerEvent(this.app.metadataCache.on("changed", (file) => this.views().forEach((v) => v.pulse(file.path))));
			this.registerEvent(this.app.vault.on("create", (f) => {
				if (f.path.endsWith(".md")) pending = f.path;
			}));
			this.registerEvent(this.app.workspace.on("file-open", (f) => {
				if (f) this.views().forEach((v) => v.followFile(f.path));
			}));
			// Hovering a file in the explorer lights its neuron in the brain.
			let lastHover = "";
			this.registerDomEvent(document, "mouseover", (ev) => {
				if (!this.settings.explorerHover) return;
				const el = (ev.target as HTMLElement | null)?.closest?.(".nav-file-title[data-path]");
				const path = el?.getAttribute("data-path") ?? "";
				if (!path || path === lastHover) return;
				lastHover = path;
				this.views().forEach((v) => v.engine?.highlight([path], 2000));
			});
			this.registerEvent(this.app.vault.on("delete", resync));
			this.registerEvent(this.app.vault.on("rename", resync));
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_BRAIN);
	}

	views(): BrainView[] {
		return this.app.workspace.getLeavesOfType(VIEW_TYPE_BRAIN).map((l) => l.view).filter((v): v is BrainView => v instanceof BrainView);
	}

	async activate(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_BRAIN)[0];
		const leaf = existing ?? this.app.workspace.getLeaf("tab");
		if (!existing) await leaf.setViewState({ type: VIEW_TYPE_BRAIN, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	async loadSettings(): Promise<void> {
		const { layout, ...rest } = ((await this.loadData()) ?? {}) as Partial<BrainSettings> & { layout?: Layout };
		this.settings = Object.assign({}, DEFAULT_SETTINGS, rest);
		this.settings.savedViews = cleanViews(this.settings.savedViews);
		this.settings.pinned = Array.isArray(this.settings.pinned) ? this.settings.pinned.filter((p) => typeof p === "string") : [];
		this.layout = pruneLayout(layout ?? {}, null);
		this.refreshLang();
	}

	/** Small state (pins, the first-use card) saved without rebuilding the graph. */
	async persist(patch: Partial<BrainSettings>): Promise<void> {
		Object.assign(this.settings, patch);
		await this.saveData({ ...this.settings, layout: this.layout });
	}

	/** Saved views change often and need no rebuild of the graph. */
	async saveViews(list: SavedView[]): Promise<void> {
		this.settings.savedViews = list;
		await this.saveData({ ...this.settings, layout: this.layout });
	}

	async saveSettings(): Promise<void> {
		await this.saveData({ ...this.settings, layout: this.layout });
		this.refreshLang();
		this.views().forEach((v) => void v.refresh());
	}

	/** Auto follows Obsidian (getLanguage on 1.8+, the stored language before that); English when it is not one of ours. */
	refreshLang(): void {
		let obs: string | null = null;
		try {
			obs = typeof getLanguage === "function" ? getLanguage() : window.localStorage.getItem("language");
		} catch {
			obs = null;
		}
		this.lang = resolveLang(this.settings.language, obs);
	}

	t(key: StringKey, vars?: Vars): string {
		return translate(this.lang, key, vars);
	}

	saveLayout(l: Layout): void {
		this.saveLayoutLater(l);
	}

	/** wiki/log.md, or null when it does not exist or cannot be read. */
	async readLog(): Promise<string | null> {
		const root = this.settings.wikiRoot.trim().replace(/^\/+|\/+$/g, "");
		const path = (root ? root + "/" : "") + "log.md";
		try {
			return (await this.app.vault.adapter.exists(path)) ? await this.app.vault.adapter.read(path) : null;
		} catch {
			return null;
		}
	}
}

class BrainSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: BrainPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const t = (k: StringKey, v?: Vars) => this.plugin.t(k, v);
		new Setting(containerEl)
			.setName(t("set.lang.name"))
			.setDesc(t("set.lang.desc"))
			.addDropdown((d) =>
				d.addOption("auto", t("set.lang.auto")).addOptions(Object.fromEntries(LANGS.map((l) => [l, LANG_NAMES[l]]))).setValue(this.plugin.settings.language).onChange(async (v) => {
					this.plugin.settings.language = v as LangPref;
					await this.plugin.saveSettings();
					this.display();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.folder.name"))
			.setDesc(t("set.folder.desc"))
			.addText((t) =>
				t.setPlaceholder("wiki").setValue(this.plugin.settings.wikiRoot).onChange(async (v) => {
					this.plugin.settings.wikiRoot = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.max.name"))
			.setDesc(t("set.max.desc"))
			.addSlider((s) =>
				s.setLimits(100, 2000, 50).setValue(this.plugin.settings.maxNodes).setDynamicTooltip().onChange(async (v) => {
					this.plugin.settings.maxNodes = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.ambient.name"))
			.setDesc(t("set.ambient.desc"))
			.addDropdown((d) =>
				d.addOptions({ off: t("set.ambient.off"), calm: t("set.ambient.calm"), lively: t("set.ambient.lively") }).setValue(this.plugin.settings.ambient).onChange(async (v) => {
					this.plugin.settings.ambient = v as BrainSettings["ambient"];
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.speed.name"))
			.addDropdown((d) =>
				d.addOptions({ slow: t("set.speed.slow"), normal: t("set.speed.normal"), fast: t("set.speed.fast") }).setValue(this.plugin.settings.flowSpeed).onChange(async (v) => {
					this.plugin.settings.flowSpeed = v as BrainSettings["flowSpeed"];
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.target.name"))
			.setDesc(t("set.target.desc"))
			.addDropdown((d) =>
				d.addOptions({ created: t("set.target.created"), edited: t("set.target.edited") }).setValue(this.plugin.settings.flowTarget).onChange(async (v) => {
					this.plugin.settings.flowTarget = v as BrainSettings["flowTarget"];
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.view.name"))
			.setDesc(t("set.view.desc"))
			.addToggle((t) =>
				t.setValue(this.plugin.settings.flowViewOnly).onChange(async (v) => {
					this.plugin.settings.flowViewOnly = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.new.name"))
			.setDesc(t("set.new.desc"))
			.addToggle((t) =>
				t.setValue(this.plugin.settings.autoFlowOnCreate).onChange(async (v) => {
					this.plugin.settings.autoFlowOnCreate = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.detail.name"))
			.setDesc(t("set.detail.desc"))
			.addDropdown((d) =>
				d.addOptions({ auto: t("set.detail.auto"), high: t("set.detail.high"), simple: t("set.detail.simple") }).setValue(this.plugin.settings.neuronDetail).onChange(async (v) => {
					this.plugin.settings.neuronDetail = v as BrainSettings["neuronDetail"];
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.follow.name"))
			.setDesc(t("set.follow.desc"))
			.addToggle((t) =>
				t.setValue(this.plugin.settings.followActiveNote).onChange(async (v) => {
					this.plugin.settings.followActiveNote = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.hover.name"))
			.setDesc(t("set.hover.desc"))
			.addToggle((t) =>
				t.setValue(this.plugin.settings.hoverPreview).onChange(async (v) => {
					this.plugin.settings.hoverPreview = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName(t("set.explorer.name"))
			.setDesc(t("set.explorer.desc"))
			.addToggle((t) =>
				t.setValue(this.plugin.settings.explorerHover).onChange(async (v) => {
					this.plugin.settings.explorerHover = v;
					await this.plugin.persist({ explorerHover: v });
				}),
			);
		new Setting(containerEl)
			.setName(t("set.reduce.name"))
			.setDesc(t("set.reduce.desc"))
			.addToggle((t) =>
				t.setValue(this.plugin.settings.reduceMotion).onChange(async (v) => {
					this.plugin.settings.reduceMotion = v;
					await this.plugin.saveSettings();
				}),
			);
	}
}
