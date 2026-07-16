# Azer (Obsidian plugin)

D&D session toolkit for Obsidian: typed campaign notes, random tables, and AI
table generation + recaps — over plain Markdown in your own vault.

## What it does

- **Typed notes.** Commands to create **NPC, Session, Adventure Log, Location,
  PC, and Table** notes, each with a starter body and frontmatter (`azer-type` +
  fields). Cross-reference them with normal `[[wikilinks]]` — backlinks and
  graph come from Obsidian. NPC, Location, and PC notes also carry a
  **Backlinks** table: a grouped [Bases](https://help.obsidian.md/bases) view of
  every note linking to them, grouped by `azer-type`. The **Insert backlinks
  table** command drops the same block into any note. All note types live in
  `azer.yaml` at your vault root, so you can add your own (see *Note types*).
- **Multiple campaigns per vault** via a top-level Campaign folder; commands are
  campaign-scoped.
- **Random tables** as a physical-die lookup: author a table in an `azer-table`
  code block and Azer scales the entries into die-face ranges and renders a
  `Roll → Result` table. Nested tables are plain `[[wikilinks]]`.
- **AI features** (using an Anthropic API key stored **only on this device**):
  generate a table from a prompt, and recap the last N Adventure Log notes into
  a grounded summary.
- **Settings:** recaps folder, model, and the device-local API key (never
  synced).

Running a session at the table uses Obsidian's own split panes and reading view
(e.g. a saved workspace with the Session plan and Adventure Log side by side) —
there's no separate "run mode."

## Note templates

Each "New X" command writes a note with an `azer-type` discriminator, a few
starter frontmatter fields, and a body scaffold of empty sections to fill in.
Files land in the type's default folder (under the campaign folder when scoped).

| Type | Default folder | Frontmatter fields | Body scaffold |
| --- | --- | --- | --- |
| **NPC** | `NPCs` | `role`, `species`, `location`, `dndb_stats` | Appearance · Character Details · Motivations · Secrets · Items · Connections · Backlinks |
| **Session** | `Sessions` | `date`, `npcs` (list), `locations` (list) | Overview · Beats · Encounters (with a Name/Intro/Experience/DnD Beyond table) · For the DM · Follow Up · Log |
| **Adventure Log** | `Adventure Log` | `date` | *(free-form prose — no sections)* |
| **Location** | `Locations` | `summary`, `parent` | Description · Points of Interest · Key NPCs · Loot · Backlinks |
| **PC** | `PCs` | `player`, `dndb_stats` | Background · Notes · Backlinks |
| **Table** | `Tables` | *(none)* | A starter `azer-table` code block (see below) |

The fields are just a starting point — add your own frontmatter freely; `[[wikilinks]]`
in fields like `location` or `parent` are cross-references Obsidian tracks as backlinks.

### Note types

Every note type — the built-ins and any you add — is defined in a single
**`azer.yaml`** file at the root of your vault. It's created for you the first
time the plugin loads, pre-filled with the built-in types (NPC, Session,
Adventure Log, Location, PC, Table). Edit it in any text editor to add, change,
or remove types:

```yaml
- id: faction            # required, kebab-case, unique
  label: Faction         # optional; defaults to a Title-Cased id
  folder: Factions       # optional; defaults to the id
  fields:                # optional
    - key: leader        # scalar field (default "")
    - key: goals
      list: true         # list field (default [])
  body: |                # optional starter body
    ## Overview

    ## Members
```

A field with `list: true` starts that frontmatter key as an empty list;
otherwise it's a scalar and starts as an empty string. Use the literal `true` —
YAML's other truthy spellings (`yes`, `on`) can be read as booleans or as plain
strings depending on the parser, so don't rely on them. Invalid entries are
skipped and reported in the developer console, so one typo doesn't drop the rest.

Changes take effect after you **reload Obsidian** (or toggle the plugin off and
on) — a type's "New X" command is registered when the plugin loads. Deleting the
whole `azer.yaml` re-seeds the built-in defaults on the next reload; an empty
list (`[]`) means "no note types".

> **Note:** `azer.yaml` isn't a Markdown note. If you have a YAML-editor
> community plugin it opens in-app; otherwise Obsidian hands it to your system's
> default editor.

## Random tables

Author a table inside a fenced code block whose **info string is `azer-table`** —
that identifier is what Azer registers against. A plain ` ``` ` block (without
`azer-table`) is left as an ordinary code block and is **not** turned into a
table.

Inside the block:

- `die: dN` — optional; sets the die to one of `d4, d6, d8, d10, d12, d20, d100`.
  Omit it to default to **d20**. Declare it at most once. You can also roll a
  **pool** — `die: 2d6`, `die: 3d10` — where the middle sums are more likely
  than the extremes.
- Every other non-blank line is one result. Prefix a line with `Nx ` (e.g.
  `3x Goblin ambush`) to weight it.
- A result can be a `[[wikilink]]` — e.g. to nest another table.

Azer gives every entry at least one die face, then shares the remaining faces out
in proportion to the weights, and renders a `Roll → Result` lookup. For a **pool**
it splits the sum range (`2–12` for 2d6) by each sum's probability, so an entry's
share of the bell curve tracks its weight. The one error it rejects is declaring
**more entries than there are possible results** — use a bigger die or wider pool.

### Example

Write this:

````markdown
```azer-table
die: d20
4x Shipments going missing
No fish near lighthouse
```
````

…and Azer renders:

| Roll (d20) | Result |
| --- | --- |
| 1–15 | Shipments going missing |
| 16–20 | No fish near lighthouse |

Weights bias the split rather than setting exact face counts: each entry keeps at
least one face, so `4x` here takes 15 of the 20 faces, not all of them.

A pool splits by probability, not by an even spread — the boundary lands where
the bell curve's mass is closest to each entry's share. With `die: 2d6` and two
equal entries the low band is `2–6` (just under half the mass), so the likelier
middle rolls aren't lumped entirely into one entry:

````markdown
```azer-table
die: 2d6
A quiet watch
An ambush
```
````

| Roll (2d6) | Result |
| --- | --- |
| 2–6 | A quiet watch |
| 7–12 | An ambush |

## AI features & your API key

The two AI commands — **Generate Table (AI)** and **Recap Recent Sessions
(AI)** — call the Anthropic API with your own key. You supply the key; usage is
billed to your Anthropic account.

When you run one of these commands, Azer sends text over the network to
Anthropic's API: for **Generate Table**, the prompt you type; for **Recap Recent
Sessions**, the contents of the Adventure Log notes being recapped. Nothing is
sent unless you run one of these commands, and no other data is transmitted.

### Getting a key

Create one in the [Anthropic Console](https://console.anthropic.com/settings/keys).
See Anthropic's [Get started guide](https://docs.anthropic.com/en/api/getting-started)
for account setup and billing. Keys look like `sk-ant-...`.

### Adding it to Azer

**Settings → Community plugins → Azer → Anthropic API key**, then paste the key.

- The key is stored **only on this device** (Obsidian's app-local storage,
  outside the vault), so no sync mechanism — Obsidian Sync, git, Dropbox,
  iCloud — ever copies it. Set it on **each** machine you use.
- **Model** and **Max tokens** in the same settings tab control the requests
  (defaults: `claude-opus-4-8`, 4096 output tokens).

Run an AI command without a key set and Azer just tells you to add one — nothing
is sent.

## Development

```bash
npm install
npm test        # unit tests (Vitest)
npm run build   # type-check + bundle to main.js
```

To try it in a vault, symlink or copy `manifest.json`, `main.js` into
`<vault>/.obsidian/plugins/azer/` and enable it in Community plugins.
