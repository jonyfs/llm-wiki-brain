// Builds the generated parts of the GitHub Pages site: the demo bundle (the real view and engine), the plugin stylesheet,
// and the screenshot. Everything else in site/ is hand-written. Run: npm run site
import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("site/assets", { recursive: true });
await build({
	entryPoints: ["scripts/site/demo.ts"],
	outfile: "site/assets/demo.js",
	bundle: true,
	minify: true,
	format: "iife",
	target: "es2020",
	alias: { obsidian: "./scripts/harness/obsidian-shim.ts" },
	logLevel: "warning",
});
copyFileSync("styles.css", "site/assets/plugin.css");
copyFileSync("docs/images/brain.jpg", "site/assets/brain.jpg");
console.log("site built");
