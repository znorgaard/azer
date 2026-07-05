# Improvements — Azer backlog

<!-- FOR AGENTS: remove an item only after implementing it *and* getting user
acceptance. New ideas go to the bottom. -->

## Make note types user-definable

The six built-in types (`npc`, `session`, `adventure-log`, `location`, `pc`,
`table`) don't cover everything a campaign needs — e.g. deities, factions,
organizations, items, and free-form lore/reference notes. Users currently have
to invent an out-of-schema `azer-type` (e.g. `reference`), which azer's
commands and any per-type tooling then ignore.

Let users define their own types in settings: an `azerType` id, a human label,
a default folder, a set of frontmatter fields (with scalar/list defaults), and a
starter body template — the same shape as the built-in `TypeSchema`. "New X"
commands, folder defaults, and type-scoped features should all pick these up
alongside the built-ins.

- Persist custom types in settings; merge with the built-in `SCHEMAS`.
- Validate ids (unique, kebab-case, no clash with built-ins).
- Keep pure/testable: schema resolution stays in `src/schema`, UI in the
  settings tab.

## Prepare for community-plugin submission

Ready Azer for the Obsidian community-plugin directory. See the submission
guidelines in `CLAUDE.md`. Concrete next steps:

- **Audit `isDesktopOnly`** — grep `src/ai/` (and the Anthropic SDK usage) for
  Node/Electron APIs (`fs`, `crypto`, `os`, `https`). If any are reachable, set
  `isDesktopOnly: true` in `manifest.json`; otherwise confirm the SDK runs in
  the Electron renderer and leave it `false`.
- **Guideline sweep** — grep for `innerHTML`/`outerHTML`/`insertAdjacentHTML`,
  global `app` usage, Title-Case UI strings, `Vault.modify` on the active note,
  un-normalized user paths, and command IDs that repeat `azer`. Fix any hits.
- **Repo hygiene** — add root `README.md` (purpose + usage) and `LICENSE`;
  remove leftover sample-plugin code/placeholder class names.
- **Cut a release** — bump `manifest.json` `version`, tag it (no `v` prefix),
  attach `main.js`/`manifest.json`/`styles.css` as individual assets. A release
  workflow already exists (`.github/workflows`).
- **Optional beta** — set up BRAT distribution for testers before the public
  submission (`manifest-beta.json` if a separate channel is wanted).
- **Submit** — community.obsidian.md → Plugins → New plugin → repo URL; fix
  bot-review findings and re-release.
