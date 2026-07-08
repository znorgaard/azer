import type { TypeSchema } from "../src/schema/types";

/** Sample schemas for exercising note-creation and frontmatter logic in tests. */
export const NPC_SCHEMA: TypeSchema = {
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
};

export const SESSION_SCHEMA: TypeSchema = {
  azerType: "session",
  label: "Session",
  defaultFolder: "Sessions",
  fields: [
    { key: "date", default: "" },
    { key: "npcs", default: [] },
    { key: "locations", default: [] },
  ],
  bodyTemplate: "## Overview\n",
};
