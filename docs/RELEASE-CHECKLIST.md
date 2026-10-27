# Release checklist (real Obsidian, 10 steps)

Run before every tag. CI covers type-check, build and unit tests; this covers what only the real app does.
Use a vault with a `wiki/` folder, an `index.md`, a `log.md` and at least 30 notes. Note the Obsidian version.

1. Copy `main.js`, `manifest.json`, `styles.css` into `<vault>/.obsidian/plugins/llm-wiki-brain/`, reload Obsidian, enable the plugin (turn off Restricted mode if needed). **Expect:** no error in the console (Cmd+Opt+I).
2. Click the brain icon in the ribbon. **Expect:** the view opens, nodes fill the outline, the status line shows pages, links, orphans.
3. Drag to rotate, scroll to zoom, double-click empty space. **Expect:** smooth rotation, zoom at the cursor, camera resets.
4. Click a node, then click empty space. **Expect:** selection stays after the click and clears on empty space; the info panel shows type, dates, neighbors.
5. Double-click a node. **Expect:** the note opens in a new tab and the camera flies to the node (never a blank view).
6. Press **Flow**. **Expect:** a packet leaves the index and reaches the newest page; a dashed arc if the page has no link yet.
7. Create a new note in `wiki/`. **Expect:** its neuron fires and, with "Flow to new pages" on, a packet reaches it.
8. Press **Replay**, and while it runs edit a note. **Expect:** the replay is not interrupted by the edit.
9. Type in the search box, press Enter; open **Filters**, pick a folder; press **Lint**. **Expect:** matches light up, filters hide pages, lint lists orphans and broken links.
10. Narrow the pane to a phone width, close and reopen the view. **Expect:** controls stay usable; the view restores its filters.

Record the result (Obsidian version, OS, vault size, pass or the step that failed) in the release notes.
