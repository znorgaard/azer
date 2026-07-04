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
