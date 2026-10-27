// Bundle every module that can run in Node (no obsidian runtime, no DOM) so `node --test` can import it.
import { build } from "esbuild";
import { readdirSync } from "node:fs";

const skip = new Set(["main.ts", "view.ts", "engine.ts"]); // these need Obsidian or a canvas
const entryPoints = readdirSync("src").filter((f) => f.endsWith(".ts") && !skip.has(f)).map((f) => `src/${f}`);

await build({
	entryPoints,
	outdir: ".test-build",
	outExtension: { ".js": ".mjs" },
	bundle: true,
	format: "esm",
	platform: "node",
	external: ["obsidian"],
	logLevel: "error",
});
console.log(`bundled ${entryPoints.length} modules`);
