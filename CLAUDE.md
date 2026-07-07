# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Azer — agent notes

- Azer is an **Obsidian plugin** (TypeScript). A campaign is a folder of
  Markdown notes in the user's vault; the vault is the source of truth.
- Tooling: **npm** + **TypeScript** (strict) + **esbuild** (bundle) +
  **Vitest** (tests). Node is required; there is no Python in this repo.
- AI default model: `claude-opus-4-8`, adaptive thinking, user's own key,
  stored on-device only and never synced.
- The feature backlog lives in `docs/superpowers/Improvements.md` — workflow
  scratch, git-ignored, not part of project history. Per its
  `<!-- FOR AGENTS -->` header, remove an item only after implementing it *and*
  getting user acceptance.
- This project is pre-alpha. Any and all breaking changes are permitted.

## Commands

```bash
npm install        # install deps
npx tsc --noEmit   # GATE: type-check (strict)
npm test           # GATE: Vitest unit tests
npm run build      # type-check + bundle to main.js
npm run test:watch # watch mode
```

`npx tsc --noEmit` and `npm test` are the quality gate; both must pass before
work is done. Do not silence a type error to pass checks — fix the code.

## Architecture

Azer reads and writes plain Markdown notes in an Obsidian vault. Logic is kept
out of the Obsidian runtime so it can be unit-tested with fakes:

- **`src/ports.ts` / `src/obsidianPorts.ts`** — the seam between pure logic and
  the Obsidian API. Domain code depends on the port interfaces; the real
  Obsidian implementation is injected at runtime, and `tests/fakes.ts` supplies
  test doubles.
- **`src/schema/`** — note types and YAML-frontmatter parse/render
  (`types.ts`, `frontmatter.ts`).
- **`src/notes/`, `src/commands/`** — note creation and the plugin commands
  (e.g. campaign-scoped "New NPC/Session/…" and the AI commands).
- **`src/campaign.ts` / `src/campaignScan.ts`** — pure campaign-folder logic
  (detect campaigns, scope a note to a campaign, build picker state).
- **`src/tables/`** — dice-table parsing, markdown rendering, code-block roll
  engine, weighted apportionment.
- **`src/ai/`** — the Anthropic SDK wrapper for the two networked features
  (table generation, recaps): `client.ts`, `request.ts`, `generateTable.ts`,
  `recap.ts`.
- **`src/ui/`, `src/nameModal.ts`, `src/settings.ts`, `src/settingsTab.ts`** —
  modals, settings model, and the settings tab.
- **`src/main.ts`** — the Obsidian `Plugin` entry point; registers commands and
  wires the Obsidian ports to the domain code.

### Conventions

- Every module declares its exports explicitly.
- Obsidian access goes through ports; pure logic never imports `obsidian`
  directly, so it stays testable.
- `tests/` mirrors `src/`; follow TDD — write the failing test first.
- The API key lives on-device only and is never synced.

## Obsidian submission guidelines

Azer targets the community-plugin directory. Hold new code to Obsidian's
[review guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
so submission stays a formality:

- **No raw HTML injection** — never `innerHTML`/`outerHTML`/`insertAdjacentHTML`
  with dynamic content; build UI with `createEl`/`createDiv`, clear with
  `el.empty()`.
- **Auto-cleanup** — register everything via `registerEvent`/`addCommand` so it
  unloads cleanly. Don't detach leaves in `onunload()`.
- **`this.app`**, never the global `app` (debug-only).
- **Vault API over Adapter**; `normalizePath()` on all user-supplied paths;
  `FileManager.processFrontMatter()` for YAML edits; Editor API for the active
  note.
- **UI text is sentence case.** Use `setHeading()`; no "settings" in section
  headings (prefer "Advanced").
- **Command IDs** must not repeat the plugin id — Obsidian prefixes `azer:`
  automatically.
- **`isDesktopOnly`** must be `true` if any code path uses Node/Electron APIs
  (`fs`, `crypto`, `os`, `https`). Audit `src/ai/` before flipping this.
- **Manifest description** ≤250 chars, ends with a period, no emoji, doesn't
  start with "This is a plugin". Drop `fundingUrl` unless donations are taken.
- **Release** = GitHub release whose tag equals `manifest.json` `version`
  (no `v` prefix), with `main.js`, `manifest.json`, and `styles.css` attached as
  individual assets. The directory reads `manifest.json` from the default branch.
