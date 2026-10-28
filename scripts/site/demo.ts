// The GitHub Pages demo: the plugin's real view and engine on a synthetic vault, mounted when it scrolls into view.
import { installDomHelpers } from "../harness/obsidian-shim";
installDomHelpers();
import { BrainView } from "../../src/view";
import { createDemo } from "../harness/demo-vault";
import type { Lang } from "../../src/i18n";

const LANGS: Record<string, Lang> = { en: "en", pt: "pt-BR", es: "es", fr: "fr" };
const host = document.getElementById("demo-mount");
let view: BrainView | null = null;
let started = false;

async function mount(autoplay: boolean): Promise<void> {
	if (!host) return;
	const lang = LANGS[document.documentElement.lang.slice(0, 2)] ?? "en";
	const { app, plugin } = createDemo(lang);
	plugin.settings.neuronDetail = "auto";
	const v = new BrainView({} as never, plugin as never);
	(v as unknown as { app: unknown }).app = app;
	host.textContent = "";
	host.appendChild(v.contentEl);
	v.contentEl.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;padding:0";
	await v.onOpen();
	view = v;
	const e = v.engine;
	if (!e) return;
	// Settle the layout at once, so the visitor sees the brain, not a scatter that is still moving.
	for (let s = 0, a = 0.8; s < 300; s++, a *= 0.985) (e as unknown as { simStep(k: number): void }).simStep(a);
	(e as unknown as { alpha: number }).alpha = 0;
	e.readTheme();
	e.start();
	(window as unknown as Record<string, unknown>).demoView = v;
	if (autoplay && !matchMedia("(prefers-reduced-motion: reduce)").matches) window.setTimeout(() => v.playFlow(), 900);
}

if (host && "IntersectionObserver" in window) {
	const io = new IntersectionObserver((en) => {
		if (!en.some((x) => x.isIntersecting) || started) return;
		started = true;
		io.disconnect();
		void mount(true);
	}, { rootMargin: "200px" });
	io.observe(host);
} else if (host) {
	void mount(false);
}

// the site's theme and language drive the demo too
window.addEventListener("llmw:theme", () => view?.engine?.readTheme());
window.addEventListener("llmw:lang", () => {
	if (!started || !host) return;
	void view?.onClose();
	void mount(false);
});
