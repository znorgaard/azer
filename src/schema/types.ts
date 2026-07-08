export const ALL_TYPES = ["npc", "session", "adventure-log", "location", "pc", "table"] as const;

export type AzerType = (typeof ALL_TYPES)[number];

export interface FieldSpec {
  /** Frontmatter property key. */
  readonly key: string;
  /** Default value written on creation: scalar `""` or list `[]`. */
  readonly default: string | readonly string[];
}

export interface TypeSchema {
  readonly azerType: string;
  /** Human label for commands, e.g. "NPC". */
  readonly label: string;
  /** Default folder the "New X" command files notes into. */
  readonly defaultFolder: string;
  /** Frontmatter fields excluding the `azer-type` discriminator. */
  readonly fields: readonly FieldSpec[];
  /** Starter Markdown body copied into new notes. */
  readonly bodyTemplate: string;
}

export const SCHEMAS: Readonly<Record<AzerType, TypeSchema>> = {
  npc: {
    azerType: "npc",
    label: "NPC",
    defaultFolder: "NPCs",
    fields: [
      { key: "role", default: "" },
      { key: "species", default: "" },
      { key: "location", default: "" },
      { key: "dndb_stats", default: "" },
    ],
    bodyTemplate:
      "## Appearance\n\n## Character Details\n\n## Motivations\n\n## Secrets\n\n## Items\n\n## Connections\n",
  },
  session: {
    azerType: "session",
    label: "Session",
    defaultFolder: "Sessions",
    fields: [
      { key: "date", default: "" },
      { key: "npcs", default: [] },
      { key: "locations", default: [] },
    ],
    bodyTemplate:
      "## Overview\n\n## Beats\n\n## Encounters\n\n" +
      "| Name | Intro | Experience | DnD Beyond Link |\n" +
      "| --- | --- | --- | --- |\n" +
      "|  |  |  |  |\n\n" +
      "## For the DM\n\n## Follow Up\n\n## Log\n",
  },
  "adventure-log": {
    azerType: "adventure-log",
    label: "Adventure Log",
    defaultFolder: "Adventure Log",
    fields: [{ key: "date", default: "" }],
    // Adventure Log entries are free-form prose; no section scaffold.
    bodyTemplate: "",
  },
  location: {
    azerType: "location",
    label: "Location",
    defaultFolder: "Locations",
    fields: [
      { key: "summary", default: "" },
      { key: "parent", default: "" },
    ],
    bodyTemplate:
      "## Description\n\n## Points of Interest\n\n## Key NPCs\n\n## Loot\n",
  },
  pc: {
    azerType: "pc",
    label: "PC",
    defaultFolder: "PCs",
    fields: [
      { key: "player", default: "" },
      { key: "dndb_stats", default: "" },
    ],
    bodyTemplate: "## Background\n\n## Notes\n",
  },
  table: {
    azerType: "table",
    label: "Table",
    defaultFolder: "Tables",
    // Table data lives in the body's `azer-table` code block, not frontmatter.
    fields: [],
    bodyTemplate: "```azer-table\ndie: d20\nFirst result\nSecond result\n```\n",
  },
};

/** Convenience accessor; equivalent to `SCHEMAS[type]`. */
export function getSchema(type: AzerType): TypeSchema {
  return SCHEMAS[type];
}
