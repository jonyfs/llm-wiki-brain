---
name: LLM Wiki Brain
description: Visual and interaction rules of the plugin, as shipped. Use these values; change them here first.
---

# Design

An OPERATE interface: a tool you work in, not a page you read. The brain is the content; everything else stays quiet, labelled and out of its way. Colours and type come from the Obsidian theme variables, so any theme works.

## Principles

1. The graph leads. Chrome is calm: no gradients, no decorative glow, no emoji.
2. Every control has a label (the rail) or a visible state (a dot, a count). Nothing relies on hover.
3. One home per thing: a filter, a setting or a control lives in one place.
4. State is never colour alone: off is a hollow dot and a struck label, pressed carries a dot, a type has a mark.
5. What the plugin knows, it shows: strength, myelin, refractory, inhibition, depth.

## Colour

Type colours (also the legend):

| Type | Dark | Light | Mark in the soma |
|---|---|---|---|
| source | `#5eead4` | `#0f766e` | dot |
| entity | `#fbbf24` | `#b45309` | rounded square |
| concept | `#8b97ff` | `#4338ca` | diamond |
| synthesis | `#f472b6` | `#be185d` | triangle |

- Links, axons, dendrites and spikes use the type colour pulled halfway to grey (`mutedRGB`) so they never out-shine the cells. Link tint: `108,118,148` dark, `100,104,136` light.
- Link opacity by depth band: 0.14, 0.10, 0.06 (near to far), times 0.75 / 1 / 1.3 for weak / normal / strong links. Width: 0.9 px at 1x, times 0.85 / 1 / 1.45 by strength, thinner with depth.
- Glow behind a soma 0.12 dark, 0.08 light; bouton halo 0.06. The soma rim is 0.4.
- Depth fog: far cells and links melt toward the theme background, up to 0.3.
- Cloud: each lobe is a swarm of soft puffs in 3D (about 34 per unit of lobe size, 65 to 70% near the surface, seeded), plus one puff per visible page (at most ~220). They are drawn at a quarter of the resolution and scaled up, with far puffs fading by 0.45. Overall opacity 0.62 dark, 0.42 light.
- Cloud tint: each lobe's puffs are pulled 35% toward the colour of the page type that is most common in it (visible pages only), so a lobe full of sources reads teal.
- Cloud light: shell puffs facing the light (top left, in front) get a lighter rim in the dark theme; inner puffs use a darker sprite, so the valleys read deeper; a faint radial haze sits behind the brain. Spikes are drawn additively in the dark theme.
- Warning and failure use `--text-warning`; inhibition is a cold dashed ring `rgb(140,175,255)`.

## Neuron

- Soma shading: a radial shade darkens the side away from the light; a firing cell flashes toward white (up to 40%) with its pulse; the selected cell casts a soft shadow below.
- Soma: an outline pulled toward its main dendrites (22 points), filled with one gradient per type; light from the top left of the screen.
- Dendrites: tapered strips, bowed in 3D. Big cells at high quality grow a tree of side branches, up to three levels, each child 63% as thick as its parent (Rall), at most 9 per primary, seeded by the page path. Ports attach to the primary tips only. No spines, no nucleus.
- Axon: hillock, a trunk that leans to one side, three terminals, all 3D points around the soma; each terminal serves the link it points toward.
- Links: a cubic leaving each dendrite or terminal along its branch, bulging in 3D (bend about 4 to 11% of the chord, capped at 45%).
- Myelin: the busiest hub-to-hub links wear a faint sheath with gaps (7 px on, 2.5 px off), at most 90.

## Motion

| Thing | Rule |
|---|---|
| Spike | eases in and out of each link (60 to 100% speed), a three-dot tail, speed follows a smooth saltatory wave on myelinated links |
| Pulse | rises fast (a few frames), decays exponentially (`exp(-0.045 dt)`); the radius swells moderately, not in a jump |
| Breathing | each cell's radius swells 1.8% on a 6 s cycle, phase from its path; the cloud swells 5% on an 8 s cycle; both stop with reduced motion or above 2500 nodes |
| Refractory | a cell that fired dims toward the background for 600 ms |
| Inhibition | a dashed cold ring for 900 ms |
| Drift | each cell wanders 1.5 to 3 world units, 12 to 25 s per axis, from its path; render-only |
| Drag inertia | `0.94` per 16.7 ms; auto-rotation eases in at 0.0016 rad per frame |
| Frames | up to ~60 fps for ambient motion; reduced motion stops drift and ambient spikes |
| UI | `--lwb-dur-fast` 120 ms, `--lwb-dur-base` 200 ms, `--lwb-dur-panel` for sheets; ease-out `cubic-bezier(.23,1,.32,1)` |

## Detail and performance

Full neurons go to the biggest cells on screen, up to a budget by quality (350 high, 140 medium, none low), whatever the vault size. The rest are sprites with the type mark. Drift runs up to 2500 nodes. Links are straight lines above 3500, and then (settled, no drift) their base layer is cached until the view changes.

## Layout

| Part | Rule |
|---|---|
| Rail | 224 px expanded, 52 px folded; three groups under Search and Filters; the choice is remembered; a pane under 640 px folds it into a top bar (Search and Filters labelled, the rest under "more") |
| Floating search / panel | starts where the rail ends (`--lwb-rail`); a bottom sheet under 640 px |
| Drawer | right side, 340 px, tabs Note, Lint, Syntax, Shortcuts, one at a time; a bottom sheet under 640 px |
| Strip | "Showing N of M pages, K filters" and Clear; empty result says so |
| Alerts | `role="alert"` bar above the footer, with Try again |
| Targets | 32 px minimum with a mouse, 44 px on touch; active-filter chips 24 |

## Behaviour

- Quick-view buttons (Orphans, Hubs, Recent, New, Sinks, Sources) are toggles: the first click applies the view, a second click while it is active clears it; Invert flips its own flag. Pressing another one switches to it.
- Search: opens from its icon, folds after 10 s without use; Enter next, Shift+Enter previous, Ctrl/Cmd+Enter asks, Esc clears then closes.
- Shortcuts on the canvas: `f` Filters panel (never while typing, never with Ctrl/Cmd/Alt), `Shift+f` full screen, `?` shortcuts, arrows rotate, `0` `1` `2` `3` camera.
- The view reopens as it was left (filters, search, colour, size).

## Accessibility

Labelled controls, `role="status"` for loading, empty and the filter strip, `role="alert"` for failures, a skip link to the canvas, keyboard navigation between neighbours, a non-modal Filters region that returns focus to its button, contrast of at least 4.5:1 for text.
