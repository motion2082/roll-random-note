# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Obsidian plugin ("Smart Random Note") for opening random notes with more control than the core random-note plugin. It adds four commands: open a random note from all notes, from a selected tag, from current search results, and inserting a link to a random search-result note at the cursor.

Note: the repo directory is `roll-random-note`, but the plugin id is `smart-random-note` (see `manifest.json` and the `PLUGIN_NAME` env var in the build workflow). Keep these in sync when touching build/release config.

## Commands

- `npm run dev` — Rollup in watch mode for local development.
- `npm run build` — One-off production build.
- `npm run lint` — Runs `svelte-check` (type-checks `.svelte` files) then ESLint with `--fix`. Run this before committing; there is no separate test suite.

There are no unit tests in this repo.

## Build & release

- Rollup (`rollup.config.js`) bundles `src/main.ts` into `dist/main.js` as a CommonJS module with `obsidian` marked external. `inline` sourcemaps are emitted.
- Obsidian loads `main.js` + `manifest.json` (+ `styles.css`) from the plugin folder. The build emits to `dist/`, so for manual testing copy `dist/main.js` and `manifest.json` into your vault's `.obsidian/plugins/smart-random-note/` folder.
- Releases are automated by `.github/workflows/main.yml`: pushing a git tag triggers a build that zips `dist/main.js` + `manifest.json` and attaches them to a GitHub release. `manifest.json` `version` / `minAppVersion` and `versions.json` must be updated for a new release.

## Architecture

The entry point is `src/main.ts` (`SmartRandomNotePlugin extends Plugin`). `onload` registers the four commands and the settings tab; each command maps to a `handle*` method.

Core flow — all commands funnel into two helpers on the plugin:
- `openRandomNote(files)` — filters to markdown, picks one via `randomElement`, opens it (honoring the `openInNewLeaf` setting).
- `insertRandomLinkAtCursor(files)` — inserts `[[name]]` at the cursor in the active markdown editor.

File sources per command:
- All notes → `app.vault.getMarkdownFiles()`.
- Tagged → `getTagFilesMap()` in `src/utilities.ts` builds a `tag -> TFile[]` map from the metadata cache. It merges body tags (`cachedMetadata.tags`) and frontmatter tags (`cachedMetadata.frontmatter.tags`), normalizing both to a leading `#`. The tag picker UI is a Svelte modal.
- Search-based → reads `app.workspace.getLeavesOfType('search')[0].view.dom.getFiles()`. This reaches into Obsidian's internal search view, which is **not** part of the public API; `SearchView`/`SearchDOM` in `src/types.ts` are hand-written type shims for it and may break across Obsidian versions.

UI layers:
- `src/openRandomTaggedNoteModal.ts` is an Obsidian `Modal` that mounts the Svelte component `src/OpenRandomTaggedNoteModalView.svelte` (a tag dropdown + submit) and bridges its submit back to the plugin via `submitCallback`.
- `src/settingTab.ts` exposes the two settings (`openInNewLeaf`, `enableRibbonIcon`).
- `src/smartRandomNoteNotice.ts` wraps Obsidian's `Notice` for user-facing messages.

Settings are persisted with the plugin's `loadData`/`saveData`. The setters (`setOpenInNewLeaf`, `setEnableRibbonIcon`) save immediately on change; `enableRibbonIcon` also toggles the ribbon dice icon via `refreshRibbonIcon`.
