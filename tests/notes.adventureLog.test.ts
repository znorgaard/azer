import { describe, expect, it } from "vitest";
import { forCampaign, selectForRecap, stripFrontmatter, type AdventureLogNote } from "../src/notes/adventureLog";

const note = (title: string, date: string, path = `${title}.md`): AdventureLogNote => ({
  title,
  date,
  body: title,
  path,
});

describe("selectForRecap", () => {
  it("takes the N most recent by date, returned oldest-first", () => {
    const notes = [note("A", "2026-06-01"), note("C", "2026-06-20"), note("B", "2026-06-10")];
    expect(selectForRecap(notes, 2).map((n) => n.title)).toEqual(["B", "C"]);
  });

  it("returns all (oldest-first) when N exceeds the count", () => {
    const notes = [note("B", "2026-06-10"), note("A", "2026-06-01")];
    expect(selectForRecap(notes, 5).map((n) => n.title)).toEqual(["A", "B"]);
  });

  it("returns empty for N <= 0 (zero and negative) or an empty input", () => {
    expect(selectForRecap([note("A", "2026-06-01")], 0)).toEqual([]);
    expect(selectForRecap([note("A", "2026-06-01")], -1)).toEqual([]);
    expect(selectForRecap([], 5)).toEqual([]);
  });

  it("preserves insertion order for equal dates", () => {
    const notes = [note("First", "2026-06-10"), note("Second", "2026-06-10")];
    expect(selectForRecap(notes, 2).map((n) => n.title)).toEqual(["First", "Second"]);
  });

  it("does not mutate the input array", () => {
    const notes = [note("B", "2026-06-10"), note("A", "2026-06-01")];
    selectForRecap(notes, 1);
    expect(notes.map((n) => n.title)).toEqual(["B", "A"]);
  });
});

describe("stripFrontmatter", () => {
  it("removes a leading YAML frontmatter block", () => {
    expect(stripFrontmatter("---\nazer-type: adventure-log\ndate: 2026-06-01\n---\nThe party fought goblins.")).toBe(
      "The party fought goblins.",
    );
  });

  it("leaves text without frontmatter unchanged", () => {
    expect(stripFrontmatter("No frontmatter here.")).toBe("No frontmatter here.");
  });

  it("leaves an unterminated frontmatter block unchanged", () => {
    expect(stripFrontmatter("---\nazer-type: adventure-log\nstill open")).toBe("---\nazer-type: adventure-log\nstill open");
  });

  it("strips a CRLF frontmatter block", () => {
    expect(stripFrontmatter("---\r\nazer-type: adventure-log\r\ndate: 2026-06-01\r\n---\r\nThe party fought goblins.")).toBe(
      "The party fought goblins.",
    );
  });

  it("strips frontmatter preceded by leading blank lines", () => {
    expect(stripFrontmatter("\n\n---\nazer-type: adventure-log\n---\nThe party fought goblins.")).toBe(
      "The party fought goblins.",
    );
  });

  it("strips frontmatter preceded by a whitespace-only line", () => {
    expect(stripFrontmatter("   \n---\nazer-type: adventure-log\n---\nThe party fought goblins.")).toBe(
      "The party fought goblins.",
    );
  });

  it("strips frontmatter preceded by a UTF-8 BOM", () => {
    expect(stripFrontmatter("\uFEFF---\nazer-type: adventure-log\n---\nThe party fought goblins.")).toBe(
      "The party fought goblins.",
    );
  });

  it("strips frontmatter preceded by a BOM and blank lines together", () => {
    expect(stripFrontmatter("\uFEFF\n\n---\nazer-type: adventure-log\n---\nThe party fought goblins.")).toBe(
      "The party fought goblins.",
    );
  });

  it("leaves an unterminated block preceded by blank lines unchanged", () => {
    const text = "\n\n---\nazer-type: adventure-log\nstill open";
    expect(stripFrontmatter(text)).toBe(text);
  });
});

describe("forCampaign", () => {
  const enyr = note("E1", "2026-06-01", "Enyr/Adventure Log/E1.md");
  const zephria = note("Z1", "2026-06-02", "Zephria/Adventure Log/Z1.md");
  const loose = note("R", "2026-06-03"); // default path is already root-level

  it("keeps only notes under the given campaign", () => {
    expect(forCampaign([enyr, zephria], "Enyr")).toEqual([enyr]);
  });

  it("matches root-level notes when the campaign is blank (mixed list)", () => {
    expect(forCampaign([enyr, zephria, loose], "")).toEqual([loose]);
  });

  it("returns empty for empty input", () => {
    expect(forCampaign([], "Enyr")).toEqual([]);
  });

  it("returns empty when no note matches the campaign", () => {
    expect(forCampaign([enyr, zephria], "Unknown")).toEqual([]);
  });

  it("matches a flat-vault log under an excluded type folder as vault root", () => {
    // Adventure Log/ is a type folder, so its notes belong to the vault root ("").
    const flat = note("S1", "2026-06-04", "Adventure Log/S1.md");
    expect(forCampaign([flat, enyr], "", new Set(["adventure log"]))).toEqual([flat]);
  });
});
