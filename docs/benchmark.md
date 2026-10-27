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
