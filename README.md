# Azer (Obsidian plugin)

Tabletop Role-Playing Game (TTRPG) note toolkit for Obsidian.

## Key Features
- Config-driven note templating with automatic organization into subfolders
- Weighted random table generation

### Minor Features
- Quick insert of backlink tables
- Claude summary of recent Adventure Logs
- Claude generation of random tables

## Note Types

Note types and templates are defined in a config file at your vault root.
By default, several note types are included: NPC, Session, Adventure Log, Location, PC, and Table.

The config specifies which sub-folder (ex. NPCs) new notes will be created in, keys for front matter fields, and the default note content.
Much like a note template.

## Creating New Notes

To create a new note of a defined type, use the command palette.
Every note type defined in your config file generates a prompt like "Azer: New NPC".
After selecting, a pop-up appears requiring a note name and a campaign (defaulting to the currently active campaign).
Fill it out and hit enter.
That's it!

## Customizing Note Types & Templates

Every note type is defined in a single `azer.yaml` file at the root of your vault.
It's created for you the first time the plugin loads.
Edit it in any text editor to add, change, or remove types:

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

Changes take effect after you **reload Obsidian** (or toggle the plugin off and
on).
Deleting the whole `azer.yaml` re-seeds the built-in defaults on the next reload.

> [!NOTE]
> `azer.yaml` isn't a Markdown note.
> If you have a YAML-editor community plugin it opens in-app; otherwise Obsidian hands it to your system's default editor.


## Creating Random tables

Balancing ranges and probabilities across a random table is annoying, especially when using a multi-dice table (ex. 4d6).
Azer enables creation of random tables with standard dice, dice pools, and weighted outcomes.

To make a random table, create a fenced code block whose info string is `azer-table`.

Inside the block:

- `die: dN` — optional; sets the die to one of `d4, d6, d8, d10, d12, d20, d100`.
  Omit it to default to d20.
  You can also roll a pool `2d6`, `3d10`.
- Every other non-blank line is one result.
  Prefix a line with `Nx` (e.g. `3x Goblin ambush`) to weight it.
  You can include [[wikilinks]] as results as well.

Azer gives every entry at least one die face, then shares the remaining faces out
in proportion to the weights.

### Example

Write this:

````markdown
```azer-table
die: d20
4x Shipments going missing
No fish near lighthouse
```
````

And Azer renders:

| Roll (d20) | Result |
| --- | --- |
| 1–15 | Shipments going missing |
| 16–20 | No fish near lighthouse |

## Inserting Backlinks Tables

As a convenience, Azer provides an `Insert backlinks table` command which adds a table of backlinks to the current note sorted by Azer note type.
By default, this same table is included in NPC, PC, and Location notes.

## AI features & your API key

The two AI commands — **Generate table (AI)** and **Recap recent sessions (AI)** — call the Anthropic API with your own key.
You supply the key; usage is billed to your Anthropic account.

When you run one of these commands, Azer sends text over the network to Anthropic's API: for **Generate table**, the prompt you type; for **Recap recent sessions**, each selected Adventure Log's title, `date` field, and body (with the frontmatter block removed).
Both commands also send Azer's fixed instructions for the task.
Nothing is sent unless you run one of these commands, and no other vault data — frontmatter, note paths, or other notes — is transmitted.

### Getting a key

Create one in the [Anthropic Console](https://console.anthropic.com/settings/keys).
See Anthropic's [Get started guide](https://docs.anthropic.com/en/api/getting-started) for account setup and billing.

### Adding it to Azer

**Settings → Community plugins → Azer → Anthropic API key**, then pick or create the keychain secret that holds your key (an existing `anthropic` secret from another plugin works too).

- The key lives in [Obsidian's keychain](https://docs.obsidian.md/plugins/guides/secret-storage) (**Settings → Keychain**) — **on this device only**, outside the vault, so no sync mechanism — Obsidian Sync, git, Dropbox, iCloud — ever copies it.
  Secrets are scoped per device and per vault, so set it on **each** machine you use.
  Azer's own settings store only the secret's *name*.
- Keys saved by Azer before 0.2.3 are moved into the keychain automatically on the first load, and the old plaintext copy is deleted.
- **Model** and **Max tokens** in the same settings tab control the requests (defaults: `claude-opus-4-8`, 4096 output tokens).

Run an AI command without a key set and Azer just tells you to add one — nothing
is sent.

## Development

See [CONTRIBUTING.md](/CONTRIBUTING.md)