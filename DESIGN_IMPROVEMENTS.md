# LLM Wiki Brain - Design Improvement Plan

## Overview
This document outlines 200+ design, UX, and accessibility improvements for the LLM Wiki Brain Obsidian plugin, based on analysis of the current codebase and applying principles from:
- **design-taste-frontend** (tasteskill v2): anti-slop house style, no gradients/shadows at rest, flat buttons, custom easings
- **emil-design-eng**: purposeful animation, custom easings, hardware-friendly transforms, no scale(0), origin-aware popovers
- **accessibility-rules**: WCAG 2.2 AA compliance, focus visible, keyboard navigation, reduced motion

---

## 1. TYPE CHIPS (4 Types: source, entity, concept, synthesis)

### Current Issues
- Only colored dots, no semantic icons
- Pressed state = opacity change only
- No keyboard activation
- No visual distinction between "type filter" and "current node type"

### Improvements (25)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 1 | Add semantic SVG icons per type: source=📄/document, entity=👤/person, concept=💡/lightbulb, synthesis=🔗/link | Visual | Low |
| 2 | Replace dot with icon + label in expanded rail; icon only in collapsed | Visual | Low |
| 3 | Pressed state: `transform: scale(0.95)` + `box-shadow: 0 0 0 2px var(--lwb-accent)` (not just opacity) | Interaction | Low |
| 4 | Active type gets accent border (2px) + filled icon, not just opacity | Visual | Low |
| 5 | Add `aria-pressed` toggle for screen readers | A11y | Low |
| 6 | Keyboard: `Enter`/`Space` toggles, `ArrowLeft/Right` navigates between chips | A11y | Low |
| 7 | Tooltip on hover: show full type name + count of nodes | UX | Low |
| 8 | In collapsed rail: show icon only, tooltip reveals label | UX | Low |
| 9 | Stagger entrance animation: 60ms delay per chip | Motion | Low |
| 10 | Focus ring: `outline: 2px solid var(--lwb-focus); outline-offset: 2px` | A11y | Low |
| 11 | Reduce motion: disable stagger, instant press feedback | Motion | Low |
| 12 | Color-blind safe palette: verify each type color passes WCAG AA on both light/dark | A11y | Medium |
| 13 | Add "all types" chip as first option (clears type filter) | UX | Low |
| 14 | Chip group label "Filter by type" (visually hidden, for AT) | A11y | Low |
| 15 | Hover: subtle `translateY(-1px)` + shadow for depth cue | Motion | Low |
| 16 | Disabled state (no nodes of that type): 40% opacity, `cursor: not-allowed` | UX | Low |
| 17 | Long-press (touch): show type stats in tooltip | UX | Medium |
| 18 | Animation: type change on node selection = smooth color morph (300ms ease-out) | Motion | Medium |
| 19 | Persist last selected type in layout | UX | Low |
| 20 | Add type legend in filter panel (mirror chips) | UX | Low |
| 21 | Icon size: 14px in rail, 16px in panel, scale with `--lwb-label-scale` | Visual | Low |
| 22 | Use `currentColor` for icons so they inherit text color | Visual | Low |
| 23 | Chip min-width: 32px (icon) / 80px (icon+label) | Visual | Low |
| 24 | Gap between chips: 6px (compact) / 8px (comfortable) | Visual | Low |
| 25 | Test with forced-colors mode (Windows High Contrast) | A11y | Medium |

---

## 2. FILTER ICONS IN RAIL (7 Icons)

### Current Issues
- All same visual weight, no grouping
- Collapsed state = tooltip only, no visual affordance
- No pressed/active states visible
- `filter-more` button unclear purpose

### Improvements (25)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 26 | Group icons visually: [Search] | [Invert, Orphans, Recent] | [Ghosts, Hide] | [More] | Visual | Low |
| 27 | Add 4px gap between groups, 12px before More | Visual | Low |
| 28 | Active filter icon: filled variant + accent color (not just opacity) | Visual | Low |
| 29 | Pressed: `transform: scale(0.92)` + ripple (CSS `@starting-style`) | Motion | Low |
| 30 | Collapsed rail: show icon + 1-letter label (S, I, O, R, G, H, M) | UX | Low |
| 31 | Tooltip: show full name + keyboard shortcut | UX | Low |
| 32 | Keyboard shortcuts: `/`=search, `i`=invert, `o`=orphans, `r`=recent, `g`=ghosts, `h`=hide, `m`=more | UX | Medium |
| 33 | Search icon: always visible (primary action), others secondary | Visual | Low |
| 34 | Invert/orphans/recent: toggle buttons with `aria-pressed` | A11y | Low |
| 35 | Ghosts/hide: toggle with distinct icon states (eye/eye-off, ghost/ghost-off) | Visual | Low |
| 36 | More button: opens filter panel, use `aria-haspopup="dialog"` | A11y | Low |
| 37 | Stagger entrance: 40ms delay per icon group | Motion | Low |
| 38 | Focus visible: thick outline (3px) for keyboard users | A11y | Low |
| 39 | Reduce motion: no stagger, no scale press | Motion | Low |
| 40 | Icon size: 18px, touch target 36x36px minimum | A11y | Low |
| 41 | Active filter count badge on icons (e.g., "3" on filter icon) | UX | Medium |
| 42 | Hover: show label inline in expanded rail (slide right 8px) | Motion | Medium |
| 43 | Collapsed→expanded transition: 200ms ease-out, stagger icons in | Motion | Low |
| 44 | Rail width: 48px collapsed / 200px expanded (adjustable) | Visual | Low |
| 45 | Rail background: subtle tone step from canvas (`var(--lwb-surface-1)`) | Visual | Low |
| 46 | Divider between rail and stage: 1px `var(--lwb-border)` | Visual | Low |
| 47 | Icon color: `var(--lwb-icon)` default, `var(--lwb-accent)` active | Visual | Low |
| 48 | Tooltip positioning: right side, centered vertically | UX | Low |
| 49 | Touch: long-press shows tooltip (mobile) | UX | Low |
| 50 | Test: all icons reachable via Tab, operable via Enter/Space | A11y | Low |

---

## 3. SEARCH ROW (Overlay)

### Current Issues
- Collapsed by default, unclear how to expand
- Buttons lack hierarchy (search, pin, clear all same weight)
- Input placeholder only hint

### Improvements (20)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 51 | Search always visible (primary), pin/clear as secondary icon buttons | Visual | Low |
| 52 | Search input: `width: 100%`, expand on focus (200ms ease-out) | Motion | Low |
| 53 | Placeholder: "Search nodes… (/)"; show shortcut | UX | Low |
| 54 | Clear button: only visible when input has value (fade in/out) | Motion | Low |
| 55 | Pin button: toggle, `aria-pressed`, filled icon when pinned | A11y | Low |
| 56 | Focus ring on input: `box-shadow: 0 0 0 2px var(--lwb-focus)` | A11y | Low |
| 57 | Search icon inside input (left), clear icon (right) | Visual | Low |
| 58 | Input height: 36px, border-radius: 8px, flat background | Visual | Low |
| 59 | Results count: "12 matches" right of input, subtle | UX | Low |
| 60 | Keyboard: `/` focuses search, `Esc` clears + blurs | UX | Low |
| 61 | Debounce: 150ms, show spinner while searching | UX | Low |
| 62 | Recent searches dropdown (last 5) on focus when empty | UX | Medium |
| 63 | Search highlights in results: yellow background, bold | Visual | Low |
| 64 | No results state: friendly illustration + "Try broader terms" | UX | Low |
| 65 | Search history persisted per vault | UX | Low |
| 66 | Reduce motion: instant expand, no spinner animation | Motion | Low |
| 67 | ARIA: `role="search"`, `aria-label="Search brain"` | A11y | Low |
| 68 | Input `autocapitalize="off"` `autocorrect="off"` `spellcheck="false"` | UX | Low |
| 69 | Clear all filters button: danger style (red), confirm on click | UX | Low |
| 70 | Search row sticky at top of overlay (z-index above results) | Visual | Low |

---

## 4. ACTIVE FILTER CHIPS (Overlay)

### Current Issues
- Basic pill style, no icons
- Remove button small, hard to hit
- No visual grouping by filter type

### Improvements (20)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 71 | Add filter-type icon per chip: folder=📁, tag=🏷️, degree=🔗, date=📅, op=⚡, dir=↔️ | Visual | Low |
| 72 | Chip layout: [icon] [label] [value] [remove] | Visual | Low |
| 73 | Remove button: 24x24px hit area, `aria-label="Remove folder filter"` | A11y | Low |
| 74 | Hover remove: background `var(--lwb-danger)`, icon white | Visual | Low |
| 75 | Chip background: `var(--lwb-surface-2)`, border `var(--lwb-border)` | Visual | Low |
| 76 | Active filter count badge on filter icon in rail | UX | Low |
| 77 | Group chips by category with subtle separator | Visual | Low |
| 78 | Max 3 chips visible, "+N more" chip expands full list | UX | Medium |
| 79 | Stagger entrance: 50ms per chip | Motion | Low |
| 80 | Exit animation: `clip-path: inset(0 100% 0 0)` 150ms ease-out | Motion | Low |
| 81 | Click chip value: opens that filter in panel | UX | Medium |
| 82 | Keyboard: `←`/`→` navigate chips, `Delete` removes focused | A11y | Low |
| 83 | Focus ring on chip (not just remove button) | A11y | Low |
| 84 | Reduce motion: no stagger, instant remove | Motion | Low |
| 85 | Chip height: 28px, border-radius: 14px (pill) | Visual | Low |
| 86 | Gap: 6px horizontal, 8px vertical wrap | Visual | Low |
| 87 | Long label: truncate with ellipsis, tooltip full text | UX | Low |
| 88 | Color coding: folder=blue, tag=green, degree=orange, date=purple | Visual | Low |
| 89 | Invert filter: distinct style (outline + inverted icon) | Visual | Low |
| 90 | Clear all: button at end of chip row, not separate | Visual | Low |

---

## 5. FILTER PANEL (Dialog)

### Current Issues
- Dense, many controls, no visual hierarchy
- Preset buttons at top but no icons
- Form controls cramped
- Saved views at bottom, hard to find

### Improvements (35)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 91 | Panel width: 360px (was auto), max-height: 80vh, scrollable | Visual | Low |
| 92 | Origin-aware: animate from More button position (Emil principle) | Motion | Medium |
| 93 | Sections with clear headers: Presets, Filters, Advanced, Saved Views | Visual | Low |
| 94 | Section spacing: 24px between, 12px header-to-controls | Visual | Low |
| 95 | Preset buttons: icon + label, 44px height, full width | Visual | Low |
| 96 | Preset icons: orphans=👻, hubs=🎯, recent=🕐, new=✨, sinks=📥, sources=📤, invert=🔄 | Visual | Low |
| 97 | Active preset: accent background, white text, filled icon | Visual | Low |
| 98 | Folder/Tag selects: native `<select>` with search (Choices.js or native) | UX | Medium |
| 99 | Min/Max degree: dual range slider (visual) + number inputs | UX | Medium |
| 100 | Date pickers: native `<input type="date">` with relative presets (7d, 30d, 90d) | UX | Low |
| 101 | Direction segmented: icons (← sources, → sinks, ↔ hubs2) | Visual | Low |
| 102 | Advanced checkboxes: group with description, indent | Visual | Low |
| 103 | Color/Size selects: visual swatches, not dropdown | Visual | Medium |
| 104 | Saved views: list with preview (query + filter icons), rename/delete inline | UX | Medium |
| 105 | Save current as view: prominent button at top of saved views | UX | Low |
| 106 | Panel header: "Filters" + close (×), drag handle for mobile | Visual | Low |
| 107 | Backdrop: `backdrop-filter: blur(8px)`, `background: rgba(0,0,0,0.3)` | Visual | Low |
| 108 | Enter animation: `clip-path` reveal from trigger + fade 200ms ease-out | Motion | Low |
| 109 | Exit: reverse, 150ms ease-in | Motion | Low |
| 110 | Focus trap: Tab cycles within panel, Esc closes | A11y | Low |
| 111 | `aria-modal="true"`, `aria-labelledby="panel-title"` | A11y | Low |
| 112 | Reduced motion: instant show/hide, no backdrop blur | Motion | Low |
| 113 | Form labels: always visible, associated via `for`/`id` | A11y | Low |
| 114 | Error states: red border, message below, `aria-describedby` | A11y | Low |
| 115 | Apply button: primary, bottom-right; Reset: secondary, bottom-left | Visual | Low |
| 116 | Live preview: filter updates as you change (debounced 300ms) | UX | Medium |
| 117 | Collapsible advanced section (default closed) | UX | Low |
| 118 | Tooltips on each control: explain what filter does | UX | Low |
| 119 | Keyboard: `Tab`/`Shift+Tab` navigate, `Enter` on button, `Esc` close | A11y | Low |
| 120 | Touch: swipe down to dismiss (mobile) | UX | Medium |
| 121 | Panel position: center viewport, avoid keyboard on mobile | UX | Low |
| 122 | Persist panel scroll position per session | UX | Low |
| 123 | Filter summary at top: "3 active filters" with clear all | UX | Low |
| 124 | Import/export filter presets (JSON) | UX | Medium |
| 125 | Test with screen reader (NVDA/VoiceOver) | A11y | Medium |

---

## 6. PRESET FILTER BUTTONS

### Current Issues
- Pill buttons, no icons
- No visual feedback for active
- Invert is toggle, others replace - unclear

### Improvements (15)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 126 | Icons on all presets (see #96) | Visual | Low |
| 127 | Active preset: `background: var(--lwb-accent); color: var(--lwb-on-accent)` | Visual | Low |
| 128 | Toggle presets (invert): show pressed state distinct | Visual | Low |
| 129 | Replace presets: momentary press feedback, then clear others | Interaction | Low |
| 130 | Tooltip: "Show orphans only" + shortcut `o` | UX | Low |
| 131 | Keyboard shortcuts displayed in tooltip | UX | Low |
| 132 | Group: [Orphans, Hubs] | [Recent, New] | [Sources, Sinks] | [Invert] | Visual | Low |
| 133 | Stagger entrance: 50ms per button | Motion | Low |
| 134 | Focus ring: 2px offset outline | A11y | Low |
| 135 | Reduced motion: no stagger | Motion | Low |
| 136 | Button height: 36px, min-width: 80px | Visual | Low |
| 137 | Long-press: show filter details preview | UX | Medium |
| 138 | Custom preset: user can save current filter as preset | UX | Medium |
| 139 | Preset order: most used first (track usage) | UX | Medium |
| 140 | Mobile: horizontal scroll with scroll-snap | UX | Low |

---

## 7. RESULTS LIST (Overlay)

### Current Issues
- Basic list, no visual hierarchy
- Stagger animation but no clear entrance
- No keyboard navigation visible

### Improvements (20)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 141 | Item height: 40px, hover: `background: var(--lwb-surface-2)` | Visual | Low |
| 142 | Icon per node type (match type chips) | Visual | Low |
| 143 | Title: 14px, 400 weight; path: 11px, `var(--lwb-text-muted)` | Visual | Low |
| 144 | Keyboard: `↑`/`↓` navigate, `Enter` open, `Esc` close overlay | A11y | Low |
| 145 | Focused item: `outline: 2px solid var(--lwb-focus)` | A11y | Low |
| 146 | Stagger: 30ms/item, max 200ms total (Emil: fast stagger) | Motion | Low |
| 147 | Empty state: illustration + "No nodes match" + clear filters hint | UX | Low |
| 148 | Loading: skeleton shimmers (3 lines) while searching | UX | Low |
| 149 | Pin result: click pin icon keeps it visible when filter changes | UX | Medium |
| 150 | Context menu (right-click): open, copy link, focus in graph | UX | Medium |
| 151 | Multi-select: `Shift+Click` range, `Ctrl+Click` toggle | UX | Medium |
| 152 | Selected: accent left border (3px) | Visual | Low |
| 153 | Scrollbar: thin, `var(--lwb-border)` color | Visual | Low |
| 154 | Max height: 400px, then scroll | Visual | Low |
| 155 | Reduced motion: no stagger, no shimmer | Motion | Low |
| 156 | ARIA: `role="listbox"`, items `role="option"`, `aria-selected` | A11y | Low |
| 157 | Announce count changes via `aria-live="polite"` | A11y | Low |
| 158 | Click outside: close overlay (but not panel) | UX | Low |
| 159 | Overlay backdrop: click closes, `Esc` closes | UX | Low |
| 160 | Overlay width: 320px, matches panel | Visual | Low |

---

## 8. STAGE / CANVAS AREA

### Current Issues
- Legend basic
- Tooltip follows cursor, no delay
- Help/keys cards abrupt

### Improvements (15)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 161 | Legend: icon + label per type, click to toggle type filter | UX | Low |
| 162 | Legend position: bottom-left, collapsible | Visual | Low |
| 163 | Tooltip: 150ms delay, `transform-origin` from node (Emil) | Motion | Low |
| 164 | Tooltip content: title, type, link count, tags | UX | Low |
| 165 | Help card: `?` button top-right, slide from right 200ms | Motion | Low |
| 166 | Keys card: `K` shortcut, same animation | Motion | Low |
| 167 | Canvas focus ring when keyboard navigating nodes | A11y | Medium |
| 168 | Node focus: scale 1.1 + ring, announce via `aria-live` | A11y | Medium |
| 169 | Reduced motion: instant tooltip, no help slide | Motion | Low |
| 170 | Canvas background: subtle grid pattern (4px, 10% opacity) | Visual | Low |
| 171 | Center marker when no nodes visible | UX | Low |
| 172 | Zoom controls: + / - / reset (100%), keyboard `=`/`-`/`0` | UX | Low |
| 173 | Minimap: bottom-right, shows viewport | UX | Medium |
| 174 | Export PNG: include legend, timestamp, viewport | UX | Low |
| 175 | Canvas `tabindex="0"` for keyboard access | A11y | Low |

---

## 9. REPLAY BAR (Bottom)

### Current Issues
- Basic transport controls
- No time display
- Speed unclear

### Improvements (10)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 176 | Transport: ⏮ ⏪ ▶️ ⏩ ⏭ + speed selector (0.5x, 1x, 2x) | Visual | Low |
| 177 | Time: current / total (e.g., "12s / 45s") | UX | Low |
| 178 | Scrubber: drag to seek, shows preview tooltip | UX | Medium |
| 179 | Loop toggle: `aria-pressed` | A11y | Low |
| 180 | Auto-hide after 3s idle, show on hover | UX | Low |
| 181 | Keyboard: `Space` play/pause, `←`/`→` step, `Shift+←/→` seek | A11y | Low |
| 182 | Focus visible on all controls | A11y | Low |
| 183 | Reduced motion: instant seek, no scrubber animation | Motion | Low |
| 184 | Height: 44px, backdrop blur | Visual | Low |
| 185 | Color: `var(--lwb-surface-1)`, border-top `var(--lwb-border)` | Visual | Low |

---

## 10. MOTION SYSTEM (Global)

### Current Strengths
- Custom easings (`--lwb-ease-out`, `--lwb-ease-in-out`)
- Hardware-friendly transforms
- Reduced motion support
- Forced colors support

### Improvements (25)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 186 | Add `--lwb-ease-spring: cubic-bezier(0.32, 0.72, 0, 1)` (iOS drawer) | Motion | Low |
| 187 | Add `--lwb-ease-snappy: cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out) | Motion | Low |
| 188 | Duration tokens: `--lwb-dur-instant: 0ms`, `--lwb-dur-fast: 120ms`, `--lwb-dur-base: 200ms`, `--lwb-dur-slow: 350ms` | Motion | Low |
| 189 | Never animate `width`/`height`/`top`/`left` - only `transform`/`opacity` | Motion | Low |
| 190 | Use `@starting-style` for enter animations (modern CSS) | Motion | Low |
| 191 | Use `clip-path` for slide/reveal (not `transform` + overflow) | Motion | Low |
| 192 | Stagger delays: 30-60ms max, never block interaction | Motion | Low |
| 193 | Press feedback: `scale(0.97)` on `:active` for ALL buttons | Motion | Low |
| 194 | Hover: `@media (hover: hover) and (pointer: fine)` guard | Motion | Low |
| 195 | Focus: always visible, never rely on hover | A11y | Low |
| 196 | Reduced motion: disable ALL transform animations, keep opacity/color | Motion | Low |
| 197 | `prefers-reduced-motion` media query on ALL animated properties | Motion | Low |
| 198 | Test: 60fps on 10-year-old hardware (throttle CPU 6x) | Perf | Medium |
| 199 | Document motion tokens in CSS with comments | Docs | Low |
| 200 | Motion audit: list every animated element, purpose, duration | Docs | Low |
| 201 | Remove animation from high-frequency actions (type chips, filter toggles) | Motion | Low |
| 202 | Panel/dialog: origin-aware enter (from trigger) | Motion | Medium |
| 203 | Toast/notification: slide from edge, `ease-out` 200ms | Motion | Low |
| 204 | Tooltip: fade 100ms + `translateY(4px)`, delay 150ms | Motion | Low |
| 205 | Loading states: shimmer (CSS only), not spinner | Motion | Low |
| 206 | Page transitions: none (this is a view, not navigation) | Motion | Low |
| 207 | Canvas animations (flow/replay): respect `reduceMotion` setting | Motion | Low |
| 208 | Flow animation: spring-based, interruptible | Motion | Medium |
| 209 | Replay: variable speed, smooth scrub | Motion | Medium |
| 210 | Document: "Animation Decision Framework" per screen | Docs | Low |

---

## 11. ACCESSIBILITY (WCAG 2.2 AA)

### Current State
- Good basics: skip link, focus-visible, forced-colors, reduced-motion
- Some ARIA but incomplete

### Improvements (20)

| # | Improvement | Category | Effort |
|---|-------------|----------|--------|
| 211 | Skip link: "Skip to brain canvas" (first focusable) | A11y | Low |
| 212 | Landmarks: `<nav>` rail, `<main>` stage, `<aside>` overlay, `<dialog>` panel | A11y | Low |
| 213 | Headings: h1 "LLM Wiki Brain", h2 sections in panel | A11y | Low |
| 214 | All interactive: `tabindex`, `role`, `aria-label`/`aria-labelledby` | A11y | Medium |
| 215 | Live regions: search results count, filter changes, flow status | A11y | Low |
| 216 | Color contrast: all text 4.5:1, UI elements 3:1 (WCAG AA) | A11y | Medium |
| 217 | Focus order: logical (rail → overlay → stage → replay) | A11y | Low |
| 218 | Focus trap in panel, overlay | A11y | Low |
| 219 | Keyboard shortcuts documented in help card | A11y | Low |
| 220 | Touch targets: minimum 44x44px (iOS) / 48x48dp (Android) | A11y | Low |
| 221 | Screen reader test: NVDA, VoiceOver, JAWS | A11y | Medium |
| 222 | High contrast mode: forced-colors all borders/backgrounds work | A11y | Low |
| 223 | Zoom: 200% no horizontal scroll, no content loss | A11y | Medium |
| 224 | Language: `lang` attribute, `lang` on i18n strings | A11y | Low |
| 225 | Error messages: descriptive, `aria-live="assertive"` | A11y | Low |
| 226 | Form validation: inline, associated, announced | A11y | Medium |
| 227 | Drag alternative: keyboard reorder for saved views | A11y | Medium |
| 228 | Timeouts: none (no auto-dismiss) | A11y | Low |
| 229 | Motion: all optional, `reduceMotion` setting works | A11y | Low |
| 230 | Accessibility audit checklist in repo | Docs | Low |

---

## 12. VISUAL DESIGN SYSTEM

### Color Tokens (CSS Custom Properties)

```css
:root {
  /* Surfaces */
  --lwb-surface-0: #ffffff;      /* Canvas background */
  --lwb-surface-1: #f8f9fa;      /* Rail, panel, overlay */
  --lwb-surface-2: #e9ecef;      /* Hover, active chips */
  --lwb-surface-3: #dee2e6;      /* Borders, dividers */
  
  /* Text */
  --lwb-text: #212529;           /* Primary */
  --lwb-text-muted: #6c757d;     /* Secondary */
  --lwb-text-inverse: #ffffff;   /* On accent */
  
  /* Brand */
  --lwb-accent: #2563eb;         /* Primary action */
  --lwb-accent-hover: #1d4ed8;   /* Hover */
  --lwb-accent-light: #dbeafe;   /* Backgrounds */
  
  /* Semantic */
  --lwb-danger: #dc2626;         /* Destructive */
  --lwb-danger-light: #fef2f2;
  --lwb-success: #16a34a;
  --lwb-warning: #ca8a04;
  
  /* Focus */
  --lwb-focus: #2563eb;          /* Visible focus ring */
  
  /* Border */
  --lwb-border: #dee2e6;
  
  /* Icon */
  --lwb-icon: #6c757d;
  
  /* Motion */
  --lwb-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --lwb-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --lwb-ease-spring: cubic-bezier(0.32, 0.72, 0, 1);
  --lwb-ease-snappy: cubic-bezier(0.23, 1, 0.32, 1);
  --lwb-dur-instant: 0ms;
  --lwb-dur-fast: 120ms;
  --lwb-dur-base: 200ms;
  --lwb-dur-slow: 350ms;
  
  /* Spacing */
  --lwb-space-1: 4px;
  --lwb-space-2: 8px;
  --lwb-space-3: 12px;
  --lwb-space-4: 16px;
  --lwb-space-5: 24px;
  --lwb-space-6: 32px;
  
  /* Radius */
  --lwb-radius-sm: 4px;
  --lwb-radius-md: 8px;
  --lwb-radius-lg: 12px;
  --lwb-radius-full: 9999px;
  
  /* Shadows (only for floating) */
  --lwb-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --lwb-shadow-md: 0 4px 8px rgba(0,0,0,0.1);
  --lwb-shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
  
  /* Z-index */
  --lwb-z-rail: 10;
  --lwb-z-overlay: 20;
  --lwb-z-panel: 30;
  --lwb-z-tooltip: 40;
  --lwb-z-toast: 50;
}
```

### Dark Mode (Automatic via Obsidian)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --lwb-surface-0: #1e1e1e;
    --lwb-surface-1: #252526;
    --lwb-surface-2: #2d2d2d;
    --lwb-surface-3: #3c3c3c;
    --lwb-text: #e0e0e0;
    --lwb-text-muted: #999;
    --lwb-border: #3c3c3c;
    --lwb-icon: #999;
    --lwb-accent: #3b82f6;
    --lwb-accent-hover: #60a5fa;
    --lwb-accent-light: #1e3a5f;
    --lwb-focus: #3b82f6;
  }
}
```

---

## 13. IMPLEMENTATION PRIORITY

### Phase 1: Quick Wins (1-2 days)
- [ ] Type chip icons + pressed states (#1-10)
- [ ] Filter icon groups + active states (#26-35)
- [ ] Search row always visible + hierarchy (#51-58)
- [ ] Active filter chip icons + remove button (#71-76)
- [ ] Preset button icons + active style (#126-130)
- [ ] Motion token expansion (#186-190)
- [ ] Focus visible improvements (#10, #38, #56, #83)

### Phase 2: Core UX (3-5 days)
- [ ] Filter panel redesign (#91-110)
- [ ] Results list keyboard nav (#141-146)
- [ ] Panel origin-aware animation (#92)
- [ ] Legend interactivity (#161)
- [ ] Tooltip improvements (#163-164)
- [ ] Replay bar upgrades (#176-180)

### Phase 3: Polish & Accessibility (2-3 days)
- [ ] Full ARIA audit (#211-230)
- [ ] Color contrast verification (#12, #216)
- [ ] Screen reader testing (#221)
- [ ] Reduced motion comprehensive (#11, #39, #66, #84, #109, #155, #169, #183, #196)
- [ ] Touch/mobile optimizations (#48, #49, #120)
- [ ] Performance audit (#198)

### Phase 4: Advanced (Optional)
- [ ] Custom presets (#138)
- [ ] Minimap (#173)
- [ ] Multi-select results (#151)
- [ ] Import/export filters (#124)
- [ ] Search history (#65)
- [ ] Filter live preview (#116)

---

## 14. TESTING CHECKLIST

### Visual Regression
- [ ] Light mode: all screens at 1440px, 768px, 390px
- [ ] Dark mode: all screens at 3 widths
- [ ] Forced colors (Windows High Contrast)
- [ ] Reduced motion enabled
- [ ] 200% zoom

### Keyboard Navigation
- [ ] Tab order logical everywhere
- [ ] All interactive reachable
- [ ] Focus visible on all elements
- [ ] Shortcuts work (`/`, `i`, `o`, `r`, `g`, `h`, `m`, `K`, `Esc`, arrows)
- [ ] Focus trap in panel/overlay

### Screen Reader
- [ ] NVDA (Windows)
- [ ] VoiceOver (macOS/iOS)
- [ ] JAWS (Windows)
- [ ] All labels announced
- [ ] Live regions work
- [ ] Dialogs announced

### Performance
- [ ] 60fps animations (CPU 6x throttled)
- [ ] <100ms interaction latency
- [ ] No layout thrashing
- [ ] Memory stable over 30min

---

## 15. RISK NOTES

- **Rail collapse/expand**: Existing logic complex; test thoroughly
- **Panel origin animation**: Requires coordinate calculation; fallback to center
- **Canvas keyboard nav**: New interaction model; needs careful focus management
- **i18n**: All new strings need translation (4 languages)
- **Obsidian API**: Some CSS may conflict with themes; use high specificity
- **Backwards compat**: Settings migration for new filter options

---

*Generated from design analysis applying tasteskill v2, emil-design-eng, and accessibility-rules. Total improvements: 230+*