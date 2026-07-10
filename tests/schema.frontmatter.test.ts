import { describe, expect, it } from "vitest";
import { AZER_TYPE_KEY, planFrontmatter } from "../src/schema/frontmatter";
import { NPC_SCHEMA, SESSION_SCHEMA } from "./schemaFixtures";

describe("planFrontmatter", () => {
  it("sets azer-type and all defaults for a fresh note", () => {
    const result = planFrontmatter(NPC_SCHEMA, {});
    expect(result[AZER_TYPE_KEY]).toBe("npc");
    expect(result).toMatchObject({ role: "", species: "", location: "", dndb_stats: "" });
  });

  it("returns fresh array copies for list defaults", () => {
    const result = planFrontmatter(SESSION_SCHEMA, {});
    const npcs = result.npcs as string[];
    npcs.push("x");
    const again = planFrontmatter(SESSION_SCHEMA, {});
    expect(again.npcs).toEqual([]);
  });

  it("never overwrites an existing field value (additions omit it, so a merge keeps it)", () => {
    const existing = { role: "Quest giver" };
    const merged = { ...existing, ...planFrontmatter(NPC_SCHEMA, existing) };
    expect(merged.role).toBe("Quest giver");
  });

  it("always forces azer-type to the schema value (even over an existing one)", () => {
    const existing = { [AZER_TYPE_KEY]: "pc" };
    const merged = { ...existing, ...planFrontmatter(NPC_SCHEMA, existing) };
    expect(merged[AZER_TYPE_KEY]).toBe("npc");
  });

  it("omits fields already present (does not list them for assignment)", () => {
    const result = planFrontmatter(NPC_SCHEMA, { role: "Quest giver" });
    expect("role" in result).toBe(false);
  });

  it("adds only azer-type when every schema field is already present", () => {
    const existing = { role: "Guard", species: "Human", location: "", dndb_stats: "" };
    const result = planFrontmatter(NPC_SCHEMA, existing);
    expect(result).toEqual({ [AZER_TYPE_KEY]: "npc" });
  });
});
