import { describe, expect, it } from "vitest";
import { createTypedNote } from "../src/commands/newNote";
import { getSchema } from "../src/schema/types";
import { FakePorts } from "./fakes";

describe("createTypedNote", () => {
  it("creates the folder, file, frontmatter, body, and opens it", async () => {
    const ports = new FakePorts();
    const handle = await createTypedNote(ports, getSchema("npc"), "Sildar Hallwinter", "NPCs");

    expect(handle.path).toBe("NPCs/Sildar Hallwinter.md");
    expect(ports.folderExists("NPCs")).toBe(true);
    const file = ports.files.get("NPCs/Sildar Hallwinter.md");
    expect(file?.fm["azer-type"]).toBe("npc");
    expect(file?.fm.species).toBe("");
    expect(file?.body).toBe(getSchema("npc").bodyTemplate);
    expect(ports.opened).toContain("NPCs/Sildar Hallwinter.md");
  });

  it("does not recreate an existing folder", async () => {
    const ports = new FakePorts();
    ports.folders.add("NPCs");
    let created = 0;
    const orig = ports.createFolder.bind(ports);
    ports.createFolder = async (p: string) => {
      created += 1;
      return orig(p);
    };
    await createTypedNote(ports, getSchema("npc"), "Toblen", "NPCs");
    expect(created).toBe(0);
  });

  it("refuses to overwrite an existing note", async () => {
    const ports = new FakePorts();
    ports.files.set("NPCs/Sildar Hallwinter.md", { body: "", fm: {} });
    await expect(
      createTypedNote(ports, getSchema("npc"), "Sildar Hallwinter", "NPCs"),
    ).rejects.toThrow(/already exists/);
  });

  it("rejects a blank name", async () => {
    const ports = new FakePorts();
    await expect(createTypedNote(ports, getSchema("npc"), "   ", "NPCs")).rejects.toThrow(
      /name is required/,
    );
  });

  it("uses a body override when provided instead of the schema template", async () => {
    const ports = new FakePorts();
    const body = "```azer-table\ndie: d6\n3x Bandits\nA dragon\n```\n";
    await createTypedNote(ports, getSchema("table"), "Ambushes", "Tables", body);
    const file = ports.files.get("Tables/Ambushes.md");
    expect(file).toBeDefined();
    expect(file?.body).toBe(body);
  });

  it("writes an empty-string body override literally (??, not || → no template fallback)", async () => {
    const ports = new FakePorts();
    await createTypedNote(ports, getSchema("npc"), "Ghost", "NPCs", "");
    expect(ports.files.get("NPCs/Ghost.md")?.body).toBe("");
  });
});
