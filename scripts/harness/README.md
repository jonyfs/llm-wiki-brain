# Browser harness

Runs the real `BrainEngine` on a synthetic vault in a browser. It is how the lobe bug and the `flyTo` bug were found:
both only showed on screen. It does **not** replace the manual checklist in `docs/RELEASE-CHECKLIST.md`, because it has no Obsidian in it.

```bash
npx esbuild scripts/harness/entry.ts --bundle --outfile=scripts/harness/bundle.js
cd scripts/harness && python3 -m http.server 8765
# open http://localhost:8765/index.html   (add ?n=1000 for a bigger vault)
```

In the console: `e.playFlow({mode:"created"})`, `e.ask(pages.slice(10,14).map(p=>p.path))`,
`e.replay()`, `e.selectPath(pages[30].path, true)`, `e.stats()`.

Check by eye: nodes fill both hemispheres of the outline; each link starts and ends on a dendrite tip, with no loops;
Flow to the newest page draws a dashed arc; Replay grows the brain back from the index; no blank canvas after `selectPath(..., true)`.

If the browser keeps an old `bundle.js`, change the file name in `index.html` (`bundle2.js`) or hard-reload.
