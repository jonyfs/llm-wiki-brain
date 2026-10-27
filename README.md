# LLM Wiki Brain

See your wiki as a living 3D brain inside Obsidian. Each page is a neuron, each `[[wikilink]]` is a synapse, and pages that get more links grow bigger. Built for [LLM wikis](https://github.com/jonyfs/llm-wiki-template) (`wiki/sources`, `wiki/entities`, `wiki/concepts`, `wiki/syntheses`), and it works on any vault.

![The brain with a packet traveling from the index to a page, and search results lit up (sample data)](docs/images/brain.jpg)

## Features

- **Brain view**: open it from the ribbon icon or the command `LLM Wiki Brain: Open brain view`. Drag to rotate, scroll to zoom at the cursor, `Shift`-drag to pan, pinch on touch screens. Linked pages share a region of the brain.
- **Information flow**: the **Flow** button (or the command) sends a packet from the index along the shortest chain of links to the latest created page, with a trail and one pulse per hop. When the page has no link from the index yet, a dashed arc shows where the link is missing. Pick "latest edited" or "stay in view" in the settings, or use **Flow from index** on any selected page. New pages get a flow automatically.
- **Replay**: the brain empties and the pages return in creation order, each fed from the index.
- **Ambient signals**: small signals keep traveling along links and carry on to neighbors. Off, calm or lively.
- **Selection**: click selects and keeps the selection, with a panel for type, dates, links and neighbors. Double-click or `Enter` opens the note; `Esc` clears. `[` and `]` step through the hubs.
- **Search and Ask**: type to dim everything that does not match; press `Enter` to ask, and the answer spreads two hops along the links.
- **Filters**: page type, folder, tag, minimum links, edited in the last N days, orphans only, or only the neighborhood of the selected page. Filters are saved with the pane.
- **Lint**: orphan pages, pages with broken links and pages without a type get a dashed ring, with a clickable list.
- **Four neuron shapes**, one per page type, so the type reads without color.
- Works on desktop and mobile. No network access, no telemetry, no dependencies. Pauses when the pane is hidden and lowers detail when frames get slow.

## Page types

The type comes from, in order: the `type` frontmatter field (`source`, `entity`, `concept`, `synthesis`), a parent folder with one of those names, or a stable guess from the folder name.

## Settings

- **Wiki folder** (default `wiki`): only pages inside it become neurons. Empty means the whole vault.
- **Maximum pages** (default 800): larger vaults keep the most connected pages and the index.
- **Ambient signals**, **Flow speed**, **Flow target**, **Flow stays in view**, **Flow to new pages**.
- **Reduce motion**: settle the layout instantly and stop the slow rotation.

## Install

From the community directory: Settings → Community plugins → Browse → search "LLM Wiki Brain".

Beta with [BRAT](https://github.com/TfTHacker/obsidian42-brat): add `jonyfs/llm-wiki-brain`.

Manual: download `main.js`, `manifest.json` and `styles.css` from the latest release into `<vault>/.obsidian/plugins/llm-wiki-brain/`.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type-check and production build
npm test        # route finder and lobe assignment tests
```

Release: bump the version with `npm version patch|minor|major`, push the tag; the GitHub Action attaches `main.js`, `manifest.json` and `styles.css`.

## Credits

The brain engine is ported from the [llm-wiki-template](https://jonyfs.github.io/llm-wiki-template/#graph) demo graph. MIT licensed.
