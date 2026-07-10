import type { TypeSchema } from "./types";

/**
 * The `table` schema, hardcoded as a fallback for the AI "Generate Table"
 * command. That command must create a `table` note even if the user has
 * deleted the `table` entry from `azer.yaml`, so it can't depend on the file.
 * Kept in sync with the `table` entry in DEFAULT_TYPES_YAML by a test.
 */
export const TABLE_SCHEMA: TypeSchema = {
  azerType: "table",
  label: "Table",
  defaultFolder: "Tables",
  fields: [],
  bodyTemplate: "```azer-table\ndie: d20\nFirst result\nSecond result\n```\n",
};

/**
 * Written verbatim to `azer.yaml` at the vault root on first run (when the file
 * is absent). The source of truth for note types thereafter — users edit,
 * add, or delete entries freely. Deleting the whole file re-seeds this on the
 * next reload; an empty list (`[]`) is respected as "no note types".
 */
export const DEFAULT_TYPES_YAML = `# Azer note types — edit this file to add, change, or remove note types.
# Each entry needs a kebab-case \`id\`. Everything else is optional:
#   label   human name for the "New X" command   (default: Title-Cased id)
#   folder  default folder for new notes          (default: the id)
#   fields  frontmatter keys stamped on new notes; add \`list: true\` for a
#           list-valued field (default value []) instead of a string ("")
#   body    starter Markdown body
# Changes take effect after you reload Obsidian (or toggle the plugin off/on).

- id: npc
  label: NPC
  folder: NPCs
  fields:
    - key: role
    - key: species
    - key: location
    - key: dndb_stats
  body: |
    ## Appearance

    ## Character Details

    ## Motivations

    ## Secrets

    ## Items

    ## Connections

    ## Backlinks

    \`\`\`base
    filters:
      and:
        - file.hasLink(this.file)
    formulas:
      info: role + summary
      Azer_Type: note["azer-type"]
    views:
      - type: table
        name: Backlinks
        groupBy:
          property: formula.Azer_Type
          direction: DESC
        order:
          - file.name
          - formula.info
          - file.mtime
        sort:
          - property: formula.info
            direction: DESC
    \`\`\`

- id: session
  label: Session
  folder: Sessions
  fields:
    - key: date
    - key: npcs
      list: true
    - key: locations
      list: true
  body: |
    ## Overview

    ## Beats

    ## Encounters

    | Name | Intro | Experience | DnD Beyond Link |
    | --- | --- | --- | --- |
    |  |  |  |  |

    ## For the DM

    ## Follow Up

    ## Log

- id: adventure-log
  label: Adventure Log
  folder: Adventure Log
  fields:
    - key: date

- id: location
  label: Location
  folder: Locations
  fields:
    - key: summary
    - key: parent
  body: |
    ## Description

    ## Points of Interest

    ## Key NPCs

    ## Loot

    ## Backlinks

    \`\`\`base
    filters:
      and:
        - file.hasLink(this.file)
    formulas:
      info: role + summary
      Azer_Type: note["azer-type"]
    views:
      - type: table
        name: Backlinks
        groupBy:
          property: formula.Azer_Type
          direction: DESC
        order:
          - file.name
          - formula.info
          - file.mtime
        sort:
          - property: formula.info
            direction: DESC
    \`\`\`

- id: pc
  label: PC
  folder: PCs
  fields:
    - key: player
    - key: dndb_stats
  body: |
    ## Background

    ## Notes

    ## Backlinks

    \`\`\`base
    filters:
      and:
        - file.hasLink(this.file)
    formulas:
      info: role + summary
      Azer_Type: note["azer-type"]
    views:
      - type: table
        name: Backlinks
        groupBy:
          property: formula.Azer_Type
          direction: DESC
        order:
          - file.name
          - formula.info
          - file.mtime
        sort:
          - property: formula.info
            direction: DESC
    \`\`\`

- id: table
  label: Table
  folder: Tables
  body: |
    \`\`\`azer-table
    die: d20
    First result
    Second result
    \`\`\`
`;
