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


## The real view (`ui.html`)

`ui.html` runs the real `BrainView`, engine and `styles.css` on a synthetic demo vault, with `obsidian-shim.ts` standing in for the `obsidian` module (DOM helpers and a few classes). It is how the README image is made, and it catches layout problems in the view that the engine-only harness cannot.

```bash
npx esbuild scripts/harness/ui.ts --bundle --outfile=scripts/harness/bundle-ui.js --alias:obsidian=./scripts/harness/obsidian-shim.ts
python3 -m http.server 8783          # from the repository root
# open http://localhost:8783/scripts/harness/ui.html
```

In the console: `view`, `engine`. Settle the layout with `for (let s=0,a=0.8;s<300;s++,a*=0.985) engine.simStep(a); engine.alpha=0`.
It is not Obsidian: no Obsidian theme beyond the default dark variables, no workspace, no real vault events.
