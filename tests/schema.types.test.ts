import { describe, expect, it } from "vitest";
import { ALL_TYPES, getSchema, SCHEMAS } from "../src/schema/types";

describe("note-type schemas", () => {
  it("defines all six types", () => {
    expect(ALL_TYPES).toEqual(["npc", "session", "adventure-log", "location", "pc", "table"]);
  });

  it("defines the table type: Tables/ folder, no fields, starter code block", () => {
    const table = getSchema("table");
    expect(table.azerType).toBe("table");
    expect(table.label).toBe("Table");
    expect(table.defaultFolder).toBe("Tables");
    expect(table.fields).toEqual([]);
    expect(table.bodyTemplate).toBe(
      "```azer-table\ndie: d20\nFirst result\nSecond result\n```\n",
    );
  });

  it("keys each schema by its own azerType", () => {
    for (const type of ALL_TYPES) {
      expect(SCHEMAS[type].azerType).toBe(type);
    }
  });

  it("uses the agreed default folders", () => {
    expect(getSchema("npc").defaultFolder).toBe("NPCs");
    expect(getSchema("session").defaultFolder).toBe("Sessions");
    expect(getSchema("adventure-log").defaultFolder).toBe("Adventure Log");
    expect(getSchema("location").defaultFolder).toBe("Locations");
    expect(getSchema("pc").defaultFolder).toBe("PCs");
    expect(getSchema("table").defaultFolder).toBe("Tables");
  });

  it("uses 2024 'species' (not 'race'); PC carries neither", () => {
    const keys = (type: "npc" | "pc") => getSchema(type).fields.map((f) => f.key);
    expect(keys("npc")).toContain("species");
    expect(keys("npc")).not.toContain("race");
    expect(keys("pc")).not.toContain("race");
    expect(keys("pc")).not.toContain("species"); // PC species removed per Improvements
  });

  it("gives NPC its fields in the expected order", () => {
    expect(getSchema("npc").fields.map((f) => f.key)).toEqual([
      "role", "species", "location", "dndb_stats",
    ]);
  });

  it("gives Session its remaining link fields with array defaults", () => {
    const fields = getSchema("session").fields;
    expect(fields.find((f) => f.key === "ddb_encounter_urls")).toBeUndefined();
    expect(fields.find((f) => f.key === "npcs")?.default).toEqual([]);
    expect(fields.find((f) => f.key === "locations")?.default).toEqual([]);
  });

  it("gives Location its fields in the expected order", () => {
    expect(getSchema("location").fields.map((f) => f.key)).toEqual(["summary", "parent"]);
  });

  it("gives PC its fields in the expected order", () => {
    expect(getSchema("pc").fields.map((f) => f.key)).toEqual(["player", "dndb_stats"]);
  });

  it("scaffolds the expected body sections per type", () => {
    expect(getSchema("npc").bodyTemplate).toBe(
      "## Appearance\n\n## Character Details\n\n## Motivations\n\n## Secrets\n\n## Items\n\n## Connections\n",
    );
    expect(getSchema("pc").bodyTemplate).toBe("## Background\n\n## Notes\n");
    expect(getSchema("location").bodyTemplate).toBe(
      "## Description\n\n## Points of Interest\n\n## Key NPCs\n\n## Loot\n",
    );
    const session = getSchema("session").bodyTemplate;
    expect(session).toContain("## Encounters");
    expect(session).toContain("| Name | Intro | Experience | DnD Beyond Link |");
    expect(session).toContain("## For the DM");
    expect(session).toContain("## Follow Up");
    expect(session).toContain("## Log");
    expect(session).not.toContain("## Secrets");
  });
});
