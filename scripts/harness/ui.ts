// The real BrainView, the real engine and the real styles.css, running on a synthetic demo vault in a browser page.
// Used to make the README image. The Obsidian module is replaced by obsidian-shim.ts (DOM helpers and a few classes).
import { installDomHelpers } from "./obsidian-shim";
installDomHelpers();
import { BrainView } from "../../src/view";
import { createDemo } from "./demo-vault";

const { app, plugin, count } = createDemo("en");
const view = new BrainView({} as never, plugin as never);
(view as unknown as { app: unknown }).app = app;
const pane = document.getElementById("pane") as HTMLElement;
pane.appendChild(view.contentEl);
view.contentEl.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;padding:0";
void view.onOpen().then(() => {
	(window as unknown as Record<string, unknown>).view = view;
	(window as unknown as Record<string, unknown>).engine = view.engine;
	console.log("ui-ready", count);
});
