// Browser harness: the real engine on a synthetic vault, for checking what only shows on screen
// (lobes, links leaving dendrites, flow, replay). Run: see README.md in this folder.
import { BrainEngine, TYPES } from "../../src/engine";

const canvas = document.getElementById("g") as HTMLCanvasElement;
const log: string[] = [];
(window as unknown as Record<string, unknown>).log = log;

const N = Number(new URLSearchParams(location.search).get("n") ?? 220);
const pages = Array.from({ length: N }, (_, i) => ({
	path: i === 0 ? "wiki/index.md" : `wiki/${TYPES[i % 4]}s/p${i}.md`,
	label: i === 0 ? "index" : `page-${i}`,
	type: TYPES[(i * 7) % 4],
	ctime: 1700000000000 + i * 86400000,
	mtime: 1700000000000 + i * 86400000,
	isIndex: i === 0,
	isLog: false,
}));
const links: [string, string][] = [];
for (let i = 1; i < pages.length - 1; i++) {
	links.push([pages[i].path, pages[Math.floor(Math.random() * i)].path]);
	if (i % 3 === 0) links.push([pages[i].path, pages[Math.floor(Math.random() * i)].path]);
}
// the newest page is an orphan: Flow must show the dashed arc for it

const e = new BrainEngine(canvas, {
	reducedMotion: false,
	ambient: () => 2,
	flowSpeed: () => 1,
	detail: () => "high" as const,
	text: (k: string) => k,
	onOpen: (p) => log.push("open " + p),
	onHover: () => {},
	onSelect: (i) => log.push("select " + (i ? i.path + " deg=" + i.deg : "none")),
	onStatus: (m) => log.push("status " + m),
	onFullscreen: () => log.push("fullscreen"),
});
e.setGraph(pages, links);
Object.assign(window, { e, pages });
console.log("harness-ready", e.size());
