import { describe, expect, it } from "vitest";
import { RECAP_SYSTEM, formatNotesForRecap, recap } from "../src/ai/recap";
import type { AdventureLogNote } from "../src/notes/adventureLog";

const notes: AdventureLogNote[] = [
  { title: "Session 1", date: "2026-06-01", body: "Met Sildar.", path: "Enyr/Adventure Log/Session 1.md" },
  { title: "Session 2", date: "2026-06-08", body: "Cleared the hideout.", path: "Enyr/Adventure Log/Session 2.md" },
];

describe("formatNotesForRecap", () => {
  it("renders each note with its title and date, in the given order", () => {
    const out = formatNotesForRecap(notes);
    expect(out.indexOf("Session 1")).toBeLessThan(out.indexOf("Session 2"));
    expect(out).toContain("Session 1 (2026-06-01)");
    expect(out).toContain("Cleared the hideout.");
  });
});

describe("recap", () => {
  it("sends the formatted notes to the model and returns its text", async () => {
    let seenSystem = "";
    let seenUser = "";
    const complete = async (system: string, user: string) => {
      seenSystem = system;
      seenUser = user;
      return "- Met Sildar\n- Cleared the hideout";
    };
    const result = await recap(complete, notes);
    expect(result).toBe("- Met Sildar\n- Cleared the hideout");
    expect(seenSystem).toBe(RECAP_SYSTEM);
    expect(seenUser).toContain("Met Sildar.");
    expect(seenUser).toContain("Cleared the hideout.");
    // grounded user message: states the exact count and "only what is written"
    expect(seenUser).toContain("these 2 session note(s)");
    expect(seenUser).toMatch(/only what is written/i);
  });

  it("system prompt forbids fabrication and outside knowledge", () => {
    expect(RECAP_SYSTEM).toMatch(/only the session notes/i);
    expect(RECAP_SYSTEM).toMatch(/never invent/i);
    expect(RECAP_SYSTEM).toMatch(/outside knowledge of published/i);
  });
});
