---
Summary: Deep design and UX audit of the LLM Wiki Brain Obsidian plugin, with prioritized improvement opportunities.
Tags: [#design #ux #accessibility #obsidian #audit]
---

# Design & UX improvements — LLM Wiki Brain

Audit of the plugin's UI surface (`src/view.ts`, `src/main.ts`, `styles.css`, i18n). Obsidian-native plugin (Canvas 2D brain view). Goal: up to ~100 actionable improvements, prioritized.

Severity: **P1** blocker/high impact, **P2** medium, **P3** polish.

## A. Information architecture & layout

1. **P1** Rail is permanently collapsed but code/comments still describe an expandable rail. Either implement expand/collapse or remove dead affordance and document icon-only rail. `src/view.ts:199-201`, styles.
2. **P1** Type chips in the collapsed rail show only colored dots: labels and counts hidden. Color-only identification fails for colorblind users and new users. Show compact labels or tooltip; keep count visible. `styles.css` `.is-collapsed .llm-wiki-brain-chip-label/.n`.
3. **P1** Tools (Flow, Replay, etc.) are icon-only in a 44px rail with no text; rely on `title`. Add persistent labels when space allows or a labeled overflow menu. `src/view.ts:299-350`.
4. **P2** Overlay (search + active filters + results + filter panel) stacks four regions in one floating card; high cognitive load. Split into distinct layers or collapsible sections with clear headings.
5. **P2** Active filter chips (`.llm-wiki-brain-active`) have no per-chip remove affordance; clearing one filter requires reopening panel. Add removable chips.
6. **P2** Legend (bottom-left) and status foot (bottom) overlap; legend at `bottom:34px`, foot at bottom. Reposition legend above status or make foot pointer-events aware. `styles.css`.
7. **P2** Info panel (bottom-right) and lint box (top-right) can overlap canvas controls on small widths. Constrain with container queries and z-index scale.
8. **P2** Replay bar (bottom center) overlaps foot status and legend. Offset vertically or hide foot during replay.
9. **P2** Cards (help/keys) positioned top-right `right:10px;top:10px`, can overlap lint box. Stack or offset.
10. **P2** Wizard card uses `box-shadow: var(--shadow-s)` inconsistent with other panels (no shadow). Standardize elevation tokens.
11. **P3** Duplicate `.llm-wiki-brain-stage` CSS rule (declared twice). Remove duplicate. `styles.css`.
12. **P3** `transition: width 120ms ease` uses default easing; use custom cubic-bezier for snappier feel.
13. **P3** Overlay has no visible close button; relies on clicking outside. Add explicit close affordance for discoverability.
14. **P3** Filter panel sections use `<fieldset>` with legend styled as section header; semantics okay but visual hierarchy flat. Add spacing/dividers.
15. **P3** Saved views `details` summary acts as accordion; nested controls not discoverable. Add icon/chevron and open state styling.

## B. Visual design & styling

16. **P1** Touch targets are `min-height: 24px` for buttons, below 44px mobile guideline. Increase to at least 32px desktop, 44px on touch. `styles.css` `.llm-wiki-brain button`.
17. **P1** No `:focus-visible` styles for buttons/inputs except canvas. Keyboard focus invisible. Add focus ring using Obsidian accent. `styles.css`.
18. **P1** No `:active` press feedback on buttons (scale). Add `transform: scale(0.97)` for tactile response. Emil principle.
19. **P2** Hover states rely on Obsidian defaults; no custom hover for chips/cards. Add subtle background/border change.
20. **P2** Type chips use color dots but no text in collapsed rail; also no border separation. Add ring.
21. **P2** Preset buttons 2-column grid may truncate long labels. Allow wrap or single column on narrow.
22. **P2** Range sliders lack value tooltip; `degOut` shows value but far from thumb. Add inline value.
23. **P2** Date inputs and range inputs inconsistent widths; align field rows.
24. **P2** Field labels `min-width: 56px` may clip longer translated labels (i18n). Use flex with wrap or larger min-width.
25. **P2** Uppercase section headers with letter-spacing; okay but contrast of muted text on secondary bg may be low. Check WCAG AA.
26. **P2** Results list `max-height: 7.6em` with small font; long result sets hard to scan. Increase or virtualize.
27. **P2** Tooltip `max-width: 220px` may clip long paths; allow wrap and pointer-events for copy.
28. **P2** Legend dots use `var(--c, var(--text-muted))`; if color missing, invisible. Ensure fallback.
29. **P2** Card close button uses plain "×" text; replace with Obsidian `setIcon` "x" for consistency.
30. **P2** Clear button uses icon "x" plus label "✕" duplicate. Use one.
31. **P2** Search prev/next buttons use "‹"/"›" text mixed with icons. Standardize to chevron icons only.
32. **P3** No empty state illustration/message when vault has no pages. Add friendly empty state.
33. **P3** No loading skeleton while graph builds. Add spinner/progress.
34. **P3** Status line truncates long messages; add tooltip or expand.
35. **P3** Perf element (`showPerf`) faint; could be hidden by default (already setting). Fine.

## C. Interaction & UX flows

36. **P1** Enter key behavior is overloaded (ask vs step hits) and not discoverable. Add inline hint and simplify.
37. **P1** Filter panel open/close: clicking outside closes, but focus not returned consistently. Ensure focus returns to filterBtn.
38. **P2** No keyboard shortcut to toggle filter panel. Add `F` or documented shortcut.
39. **P2** Saved views apply on `change` only; no Enter to apply. Add.
40. **P2** Preset buttons don't update `aria-pressed` for invert? Partially. Fix invert toggle state.
41. **P2** Clearing search with Escape doesn't clear filters; separate affordance exists but inconsistent. Clarify.
42. **P2** Hover preview relies on core plugin; no fallback if disabled. Show notice.
43. **P2** Explorer hover global mouseover may cause performance issues; debounce/throttle.
44. **P2** Onboarding wizard has no "Don't show again" or skip; persists only on OK. Add skip.
45. **P2** No confirmation before destructive actions (clear filters, delete view). Add undo/confirm.
46. **P2** Group selection actions (isolate/canvas/copy) only via context menu; add visible buttons in info panel.
47. **P2** Neighborhood depth control is segmented 1-3; allow custom? Keep but show current.
48. **P2** Color/size mode changes don't animate transition; abrupt. Could fade.
49. **P2** Replay scrubber lacks time labels and keyboard step. Add arrow key support and aria-valuetext.
50. **P2** Pause button text toggles "pause"/"resume" but icon doesn't change. Add icon swap.
51. **P3** Copy hits button label "copy" not icon; standardize.
52. **P3** Search suggestions use datalist; not styled. Fine.
53. **P3** Context menu may exceed viewport; Obsidian Menu handles? Ensure.
54. **P3** Double-click to open note may conflict with selection. Document.
55. **P3** Fullscreen toggle not obvious. Add icon and tooltip.

## D. Accessibility & keyboard

56. **P1** Canvas is `role="img"` but interactive; screen readers can't operate. Consider `role="application"` with keyboard instructions or provide text alternative summary.
57. **P1** No skip link to canvas/controls. Add.
58. **P1** Filter panel not a dialog; no focus trap or `aria-modal`. Implement focus management.
59. **P1** Tooltip not connected via `aria-describedby` to hovered node. Add.
60. **P2** Type chips aria-label uses translated type; good, but aria-pressed state must update on toggle (verify). 
61. **P2** Results list not a `list`/`listitem` semantics. Use ul/li or role list.
62. **P2** Active filter chips should be removable buttons with aria-label "Remove filter".
63. **P2** Cards' close button focus order; ensure.
64. **P2** Settings tab: many settings lack grouping/headings; add headings and descriptions.
65. **P2** Slider inputs need `aria-valuetext` for screen readers.
66. **P2** Color-only status (type chips) fails colorblind. Add patterns/labels.
67. **P2** Reduced motion CSS uses universal selector `*` which can break Obsidian transitions elsewhere? Scope to `.llm-wiki-brain *`. Already scoped? It is `.llm-wiki-brain *` yes.
68. **P2** High contrast theme support: borders may disappear. Use `forced-colors` media query.
69. **P3** Language auto-detection; ensure RTL support? Obsidian may be RTL; canvas labels may need. Investigate.
70. **P3** `title` attributes duplicate aria-label; okay but verbose. 
71. **P3** Focus not visible on canvas? It has outline focus-visible. Good.
72. **P3** No live region for search results count. Add `aria-live` to results.
73. **P3** Error messages (broken links) color warning; ensure icon + text not color-only.
74. **P3** Disabled states not styled. Add.
75. **P3** Touch device hover false positives; gate hover animations with media query.

## E. Motion & feedback

76. **P1** No `:active` feedback on buttons (see 18). 
77. **P2** Panel show/hide uses display toggle with no transition. Add fade/slide with reduced-motion fallback.
78. **P2** Card show/hide uses `.show()`/`.hide()` (display) no transition. Add.
79. **P2** Transitions use `ease` default; use custom cubic-bezier tokens. Emil.
80. **P2** No staggered entrance for results list. Add subtle stagger.
81. **P2** Tooltip appears instantly; add small fade. 
82. **P2** Replay caption updates; add fade transition.
83. **P3** Flow/replay animations should respect reduced motion (engine does). Verify all.
84. **P3** Hover highlight duration 2000ms maybe too long; make configurable.
85. **P3** No success feedback (toast) after export/canvas; Obsidian Notice maybe used? Add.

## F. Responsive & mobile

86. **P1** On narrow screens (container <=640px), tools row hidden but no toggle to open; primary actions inaccessible except icons in rail. Provide a menu.
87. **P1** Overlay search row may cover canvas on mobile; make collapsible or bottom sheet.
88. **P2** Touch targets too small (see 16).
89. **P2** Pinch zoom/touch gestures need testing; ensure `touch-action` and handlers.
90. **P2** Container query at 640px; add intermediate breakpoints for tablet.
91. **P2** Card max-width 30em may exceed small screens; adjust.
92. **P2** Info/lint panels fixed width min(300px,...) may overflow on 390px. Reduce min.
93. **P3** Landscape phone layout not considered. Test.
94. **P3** Font sizes use Obsidian vars; ensure scaling on mobile.
95. **P3** Overlay position `left:52px` assumes rail width; if rail changes, update.

## G. Onboarding, empty/error states

96. **P1** No empty state for zero notes / no links. Add guidance.
97. **P1** No error state when wiki root missing or unreadable. Add message + link to settings.
98. **P2** Onboarding wizard only 3 lines; add interactive tour or highlight controls.
99. **P2** Lint results list clickable but no empty state when no issues. Add "All good" message.
100. **P2** Export failure not surfaced. Add Notice on error.
101. **P3** Help card examples should be copyable with one click (already click fills search). Add copy-to-clipboard.
102. **P3** Keys card could be a modal with better layout.
103. **P3** First-run card doesn't explain performance settings. Add link.

## H. Settings & configuration

104. **P2** Settings tab lacks sections/headings and search. Group with headings.
105. **P2** Sliders lack live value display? `setDynamicTooltip` yes. Fine.
106. **P2** Language dropdown doesn't preview. Fine.
107. **P2** No reset to defaults button. Add.
108. **P3** Settings changes trigger full refresh; could be debounced. 
109. **P3** `maxNodes` slider 100-10000; add preset buttons (500/1000/2000).
110. **P3** Reduce motion setting duplicated with OS preference; auto-detect and explain.

## I. Consistency & polish

111. **P2** Mixed icon/text buttons; standardize icon-only with aria-label + tooltip.
112. **P2** Inconsistent close affordances ("×", "✕", "x"). Standardize.
113. **P2** Inconsistent rounding (radius-m, 6px, 8px, 999px). Define tokens.
114. **P2** Inconsistent spacing (size-4-* vars vs 8px/10px). Use tokens.
115. **P2** Z-index magic numbers (1,2,4,5,6). Define scale.
116. **P3** Color literals (`#c27c0e`) should use Obsidian vars. 
117. **P3** Font-family monospace only in code; okay.
118. **P3** `word-break: break-word` deprecated; use `overflow-wrap`.
119. **P3** `flex-wrap: wrap` repeated; fine.
120. **P3** Remove unused CSS (audit).

## Suggested next steps

- Run an accessibility audit with axe on the view's DOM.
- Add visual regression screenshots for 1440/768/390.
- Implement P1 items first (touch targets, focus, empty states, mobile tools access).
- Consider a design pass using impeccable/design-taste skills for a cohesive visual refresh.

---

*Generated from static analysis of `src/view.ts`, `src/main.ts`, `styles.css` and README. Not all items verified against runtime; treat as backlog.*
