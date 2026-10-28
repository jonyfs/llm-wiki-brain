# Benchmark B1: method and results

**Status: method fixed, nothing measured yet.** The plan compares against README claims; this file is where measured numbers go.
Competitors are closed to measurement, so everything is measured from outside, on one machine, with the same vault.

## What is compared (3 plugins, decided in the 0.3 engineering review)

| Plugin | Why | Renderer |
|---|---|---|
| New 3D Graph (`new-3d-graph`) | fastest-looking 3D graph, Rust/WASM worker | WebGL |
| Brain Atlas (`brain-atlas`) | claims 70% less CPU idle with WebGL2 | WebGL2 |
| Cortex Graph (`cortex-graph`) | closest feature set: time lapse, saved views | WebGL |
| LLM Wiki Brain (this) | baseline | Canvas 2D |

## Method

1. A vault of 1,000 notes, about 1,500 links (generate with `scripts/harness` data or a copy of a real wiki).
2. One plugin enabled at a time; restart Obsidian between plugins; same window size; battery plugged in.
3. **Open time:** from the command that opens the view until the first drawn frame. Use `performance.now()` around the open command in the Developer console, three runs, report the median.
4. **Frame rate while idle and while rotating:** paste in the console and read after 10 s:
   `let n=0,t=performance.now();(function f(){n++;requestAnimationFrame(f)})();setTimeout(()=>console.log(n/((performance.now()-t)/1000),'fps'),10000)`
   Rotating means dragging continuously for the 10 s.
5. **CPU idle:** Activity Monitor or `top -pid <Obsidian helper>` for 30 s with the view open and untouched.
6. **Size:** `ls -l main.js` of each plugin.
7. Label every number `[measured: <machine>, <Obsidian version>, <vault>, <date>]`. Never mix machines.

## Results

| Plugin | Open time (ms) | fps idle | fps rotating | CPU idle (%) | main.js (KB) |
|---|---:|---:|---:|---:|---:|
| New 3D Graph | not measured | | | | |
| Brain Atlas | not measured | | | | |
| Cortex Graph | not measured | | | | |
| LLM Wiki Brain | not measured | | | | 52 (`main.js` of 0.2.0, `[measured: ls -l]`) |

Trigger to reopen the heavy-engine decision (D3): more than 3 user reports of slowness, or fps under 30 above 2,000 nodes in this table.


## Own scaling (harness, synthetic vault)

Not the B1 comparison: this is how this plugin scales with the number of notes, measured with `scripts/harness` (`?n=N`, about 1.3 links per note) and Node for the pure modules.
`[measured: developer laptop (macOS), Chrome, synthetic vault, 2026-10-28]`. Draw times are the best of 12 runs; the median of a busy tab can be several times higher.

| Notes | Physics step before | Physics step after | Draw, full detail before | Draw after (best) |
|---:|---:|---:|---:|---:|
| 100 | 1.2 ms | 1.2 ms | not measured | not measured |
| 1,000 | 12.6 ms | 7-8 ms | 50 ms | not re-measured |
| 3,000 | 86 ms | 20-37 ms | not measured | not measured |
| 10,000 | 780 ms | 55-70 ms | 1,450 ms | 25-33 ms |

What changed, in the order it mattered:

1. **Repulsion grid was quadratic.** The cell size was fixed at 150 units and the brain is about 3 cells wide, so every node checked almost every other. The cell now follows the typical spacing (`cellSize` in `physics.ts`): about 100 neighbours per node however many nodes there are.
2. **Only the biggest neurons are drawn as full neurons.** A full neuron (polygon, gradient, branches) costs about 17 us; the 350 (high detail), 140 (medium) or no biggest ones on screen get one, the rest are sprites.
3. **Past 3,500 links, links are straight lines** between somas, and anchors are computed only for the links that need curves (selected, flow, signals).
4. **Pulse rings are capped at 400 per frame.** A vault that just loaded has every node pulsing, which was one stroke each.
5. **The depth sort is the built-in adaptive sort** instead of an insertion sort that is quadratic after a camera jump.
6. **Large vaults start at lower detail** (more than 900 notes: medium, more than 3,000: low) and the adaptive quality takes it from there; the physics step runs every second to fourth frame past 3,000 nodes.

Pure modules (`buildVaultGraph`, search, filters, routes, communities, the neuron net) are linear: at 10,000 notes the slowest, building the graph, takes about 140 ms on a fake vault, and a search keystroke about 13 ms.
Open: a draw of 25-33 ms at 10,000 notes is about 35 fps; the next step would be one batched sprite pass per type, or WebGL (see TODOS.md).
