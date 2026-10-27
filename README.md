# LLM Wiki Brain

See your wiki as a living 3D brain inside Obsidian. Each page is a neuron, each `[[wikilink]]` is a synapse, and pages that get more links grow bigger. Built for [LLM wikis](https://github.com/jonyfs/llm-wiki-template) (`wiki/sources`, `wiki/entities`, `wiki/concepts`, `wiki/syntheses`), and it works on any vault.

## Features

- **Brain view**: open it from the ribbon icon or the command `LLM Wiki Brain: Open brain view`. Drag to rotate, scroll or `+`/`-` to zoom, arrow keys to orbit, click a page to open it.
- **Four neuron shapes**, one per page type, so the type reads without color. Filter types with the chips at the top.
- **Ingest**: when you create or edit a page, its neuron fires and sends signals along its links.
- **Ask the brain**: search page names, headings and tags; matching pages and the links between them light up. No network, no API key.
- **Lint overlay**: orphan pages and pages with broken links get a dashed ring.
- Works on desktop and mobile. No network access, no telemetry, no dependencies.

## Page types

The type comes from, in order: the `type` frontmatter field (`source`, `entity`, `concept`, `synthesis`), a parent folder with one of those names, or a stable guess from the folder name.

## Settings

- **Wiki folder** (default `wiki`): only pages inside it become neurons. Empty means the whole vault.
- **Maximum pages** (default 800): larger vaults keep the most connected pages.
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
```

Release: bump the version with `npm version patch|minor|major`, push the tag; the GitHub Action attaches `main.js`, `manifest.json` and `styles.css`.

## Credits

The brain engine is ported from the [llm-wiki-template](https://jonyfs.github.io/llm-wiki-template/#graph) demo graph. MIT licensed.
