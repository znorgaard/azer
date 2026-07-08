import { describe, expect, it } from "vitest";
import { validateCustomTypes } from "../src/schema/customTypes";

describe("validateCustomTypes", () => {
  it("returns nothing for null/undefined (empty YAML)", () => {
    expect(validateCustomTypes(null)).toEqual({ types: [], errors: [] });
    expect(validateCustomTypes(undefined)).toEqual({ types: [], errors: [] });
  });

  it("errors when the top level is not a list", () => {
    const r = validateCustomTypes({ id: "faction" });
    expect(r.types).toEqual([]);
    expect(r.errors).toHaveLength(1);
  });

  it("builds a full schema from a valid entry", () => {
    const r = validateCustomTypes([
      { id: "faction", label: "Faction", folder: "Factions",
        fields: [{ key: "leader" }, { key: "goals", list: true }],
        body: "## Overview\n" },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.types).toEqual([
      {
        azerType: "faction",
        label: "Faction",
        defaultFolder: "Factions",
        fields: [
          { key: "leader", default: "" },
          { key: "goals", default: [] },
        ],
        bodyTemplate: "## Overview\n",
      },
    ]);
  });

  it("falls back label from id (kebab → Title Case) and folder to id", () => {
    const r = validateCustomTypes([{ id: "town-guard" }]);
    expect(r.errors).toEqual([]);
    expect(r.types[0]).toMatchObject({
      azerType: "town-guard",
      label: "Town Guard",
      defaultFolder: "town-guard",
      fields: [],
      bodyTemplate: "",
    });
  });

  it("rejects non-kebab ids, built-in clashes, and duplicates, keeping valid ones", () => {
    const r = validateCustomTypes([
      { id: "Faction" },        // not kebab-case
      { id: "npc" },            // built-in clash
      { id: "deity" },          // ok
      { id: "deity" },          // duplicate
    ]);
    expect(r.types.map((t) => t.azerType)).toEqual(["deity"]);
    expect(r.errors).toHaveLength(3);
  });

  it("skips a field with a missing key but keeps the type", () => {
    const r = validateCustomTypes([{ id: "item", fields: [{ key: "" }, { key: "rarity" }] }]);
    expect(r.types[0].fields).toEqual([{ key: "rarity", default: "" }]);
    expect(r.errors).toHaveLength(1);
  });

  it("errors and skips an entry that is not a mapping", () => {
    const r = validateCustomTypes(["nope", { id: "faction" }]);
    expect(r.types.map((t) => t.azerType)).toEqual(["faction"]);
    expect(r.errors).toHaveLength(1);
  });

  it("rejects a field that reuses the reserved azer-type key, keeping the type", () => {
    const r = validateCustomTypes([{ id: "faction", fields: [{ key: "azer-type" }, { key: "leader" }] }]);
    expect(r.types[0].fields).toEqual([{ key: "leader", default: "" }]);
    expect(r.errors).toHaveLength(1);
  });

  it("trims a stored label, folder, and field key", () => {
    const r = validateCustomTypes([{ id: "faction", label: " Faction ", folder: " Factions ", fields: [{ key: " leader " }] }]);
    expect(r.types[0]).toMatchObject({ label: "Faction", defaultFolder: "Factions", fields: [{ key: "leader", default: "" }] });
  });

  it("errors but keeps the type when fields is not a list", () => {
    const r = validateCustomTypes([{ id: "faction", fields: { key: "leader" } }]);
    expect(r.types.map((t) => t.azerType)).toEqual(["faction"]);
    expect(r.types[0].fields).toEqual([]);
    expect(r.errors).toHaveLength(1);
  });
});
