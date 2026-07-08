import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { validateCustomTypes } from "../src/schema/customTypes";
import { DEFAULT_TYPES_YAML, TABLE_SCHEMA } from "../src/schema/defaultTypes";

// The seed is parsed by Obsidian's `parseYaml` in production; here we parse it
// with the `yaml` package (same YAML 1.2 semantics for this simple document)
// purely to guard that the shipped seed validates to the six built-ins cleanly.
describe("DEFAULT_TYPES_YAML", () => {
  const { types, errors } = validateCustomTypes(parse(DEFAULT_TYPES_YAML));

  it("validates with no errors", () => {
    expect(errors).toEqual([]);
  });

  it("defines the six built-ins with their folders", () => {
    expect(types.map((t) => t.azerType)).toEqual(["npc", "session", "adventure-log", "location", "pc", "table"]);
    expect(types.map((t) => t.defaultFolder)).toEqual(["NPCs", "Sessions", "Adventure Log", "Locations", "PCs", "Tables"]);
  });

  it("keeps the NPC labels and fields", () => {
    const npc = types.find((t) => t.azerType === "npc");
    expect(npc?.label).toBe("NPC");
    expect(npc?.fields.map((f) => f.key)).toEqual(["role", "species", "location", "dndb_stats"]);
  });

  it("marks the session npcs/locations fields as lists", () => {
    const session = types.find((t) => t.azerType === "session");
    expect(session?.fields).toEqual([
      { key: "date", default: "" },
      { key: "npcs", default: [] },
      { key: "locations", default: [] },
    ]);
  });

  it("carries the table body template that TABLE_SCHEMA also holds", () => {
    const table = types.find((t) => t.azerType === "table");
    expect(table?.bodyTemplate).toBe(TABLE_SCHEMA.bodyTemplate);
    expect(table).toEqual(TABLE_SCHEMA);
  });
});
