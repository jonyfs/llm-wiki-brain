import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, debounce } from "obsidian";
import { BrainView, VIEW_TYPE_BRAIN } from "./view";
import { askBrain, BrainSettings, DEFAULT_SETTINGS } from "./vaultGraph";

class AskModal extends Modal {
	constructor(app: App, private onSubmit: (q: string) => void) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText("Ask the brain");
		let q = "";
		new Setting(this.contentEl).setName("Words to look for in page names, headings and tags").addText((t) => {
			t.setPlaceholder("compounding ingest").onChange((v) => (q = v));
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

	async onload(): Promise<void> {
		await this.loadSettings();
		this.registerView(VIEW_TYPE_BRAIN, (leaf) => new BrainView(leaf, this));
		this.addRibbonIcon("brain", "Open LLM wiki brain", () => void this.activate());
		this.addCommand({ id: "open", name: "Open brain view", callback: () => void this.activate() });
		this.addCommand({
			id: "ask",
			name: "Ask the brain",
			callback: () => {
				void this.activate().then(() =>
					new AskModal(this.app, (q) => {
						const hits = askBrain(this.app, q, this.settings);
						this.views().forEach((v) => v.engine?.highlight(hits));
						new Notice(hits.length ? `${hits.length} page(s) lit up.` : "No matching pages.");
					}).open(),
				);
			},
		});
		this.addCommand({ id: "lint", name: "Run wiki lint overlay", callback: () => void this.activate().then(() => this.views().forEach((v) => v.runLint())) });
		this.addCommand({ id: "clear", name: "Clear highlights", callback: () => this.views().forEach((v) => v.engine?.clearMarks()) });
		this.addSettingTab(new BrainSettingTab(this.app, this));

		const resync = debounce(() => this.views().forEach((v) => v.refresh()), 800, true);
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.metadataCache.on("resolved", resync));
			// Ingest: a page that is created or edited fires, then the graph catches up.
			this.registerEvent(this.app.metadataCache.on("changed", (file) => this.views().forEach((v) => v.pulse(file.path))));
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.views().forEach((v) => v.refresh());
	}
}

class BrainSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: BrainPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName("Wiki folder")
			.setDesc("Only pages inside this folder become neurons. Leave empty to use the whole vault.")
			.addText((t) =>
				t.setPlaceholder("wiki").setValue(this.plugin.settings.wikiRoot).onChange(async (v) => {
					this.plugin.settings.wikiRoot = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName("Maximum pages")
			.setDesc("Larger vaults keep only the most connected pages, so the brain stays smooth.")
			.addSlider((s) =>
				s.setLimits(100, 2000, 50).setValue(this.plugin.settings.maxNodes).setDynamicTooltip().onChange(async (v) => {
					this.plugin.settings.maxNodes = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName("Reduce motion")
			.setDesc("Settle the layout instantly and stop the slow rotation. Reopen the view to apply.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.reduceMotion).onChange(async (v) => {
					this.plugin.settings.reduceMotion = v;
					await this.plugin.saveSettings();
				}),
			);
	}
}
