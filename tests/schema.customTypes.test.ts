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

  it("distinguishes a missing id from a present-but-non-string one", () => {
    const r = validateCustomTypes([{ label: "No id" }, { id: 2024 }]);
    expect(r.types).toEqual([]);
    expect(r.errors).toEqual([
      "Entry 1: id is required.",
      "Entry 2: id must be a non-empty string.",
    ]);
  });

  it("rejects non-kebab ids and duplicates, keeping valid ones (former built-in ids are now allowed)", () => {
    const r = validateCustomTypes([
      { id: "Faction" }, // not kebab-case
      { id: "npc" },      // formerly a built-in clash — now a valid id
      { id: "deity" },    // ok
      { id: "deity" },    // duplicate
    ]);
    expect(r.types.map((t) => t.azerType)).toEqual(["npc", "deity"]);
    expect(r.errors).toHaveLength(2);
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

  it("trims a padded id (e.g. a quoted `id: \"faction \"`) instead of failing the kebab check", () => {
    const r = validateCustomTypes([{ id: " faction " }]);
    expect(r.errors).toEqual([]);
    expect(r.types[0].azerType).toBe("faction");
  });

  it("reports a non-string body/label/folder but still builds the type with fallbacks", () => {
    const r = validateCustomTypes([{ id: "faction", label: 1, folder: [], body: { a: 1 } }]);
    expect(r.types[0]).toMatchObject({ label: "Faction", defaultFolder: "faction", bodyTemplate: "" });
    expect(r.errors).toEqual([
      "faction: label must be a string.",
      "faction: folder must be a string.",
      "faction: body must be a string.",
    ]);
  });

  it("distinguishes a missing field key from a present-but-non-string one", () => {
    const r = validateCustomTypes([{ id: "faction", fields: [{ list: true }, { key: 42 }, { key: "leader" }] }]);
    expect(r.types[0].fields).toEqual([{ key: "leader", default: "" }]);
    expect(r.errors).toEqual([
      "faction: field 1 needs a key.",
      "faction: field 2 key must be a non-empty string.",
    ]);
  });

  it("reports a non-boolean list but still builds the field as a scalar", () => {
    const r = validateCustomTypes([{ id: "faction", fields: [{ key: "goals", list: "true" }] }]);
    expect(r.types[0].fields).toEqual([{ key: "goals", default: "" }]);
    expect(r.errors).toEqual(['faction: field "goals" list must be true or false.']);
  });

  it("rejects a duplicate field key, keeping the first occurrence", () => {
    const r = validateCustomTypes([{ id: "faction", fields: [{ key: "leader" }, { key: "leader", list: true }] }]);
    expect(r.types[0].fields).toEqual([{ key: "leader", default: "" }]);
    expect(r.errors).toEqual(['faction: duplicate field key "leader".']);
  });

  it("errors but keeps the type when fields is not a list", () => {
    const r = validateCustomTypes([{ id: "faction", fields: { key: "leader" } }]);
    expect(r.types.map((t) => t.azerType)).toEqual(["faction"]);
    expect(r.types[0].fields).toEqual([]);
    expect(r.errors).toHaveLength(1);
  });
});
