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

## Dice-pool tables (`2d6`, `3d10`)

`azer-table` only accepts single uniform dice (`die: d20`). TTRPG tables often
roll a pool — `2d6`, `3d10` — where the middle results are far more likely than
the extremes (reaction rolls, encounter tables). Support pools *correctly*: not
DTC's even-spread, but weighted by each sum's probability.

- Accept `die: 2d6` / `NdM` in `parse.ts` (`DIE_VALUE` currently rejects it).
- In `apportion.ts`, weight faces by the number of dice combinations that yield
  each sum (a natural extension of the largest-remainder logic — each sum's
  base weight is its combination-count).
- Render ranges over the pool's min–max (`2–12` for `2d6`), header shows the
  pool notation.
- Keep it pure/testable in `src/tables/`; add fixtures for `2d6`/`3d10`.
