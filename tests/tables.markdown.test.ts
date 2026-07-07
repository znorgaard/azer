import { describe, expect, it } from "vitest";
import { azerTableMarkdown } from "../src/tables/markdown";

describe("azerTableMarkdown", () => {
  it("renders a Roll/Result table with die-labeled header and computed ranges", () => {
    // apportion(20,[3,1]) -> faces 14/6 -> ranges 1-14 / 15-20
    expect(azerTableMarkdown("die: d20\n3x A\nB")).toBe(
      "| Roll (d20) | Result |\n| --- | --- |\n| 1–14 | A |\n| 15–20 | B |",
    );
  });

  it("escapes bare pipes and wikilink-alias pipes; preserves [[links]]", () => {
    // [[page\|alias]] is the correct Obsidian in-table syntax for an aliased link.
    expect(
      azerTableMarkdown("die: d4\nAsk [[X]] or pay | bribe\nSee [[page|alias]]"),
    ).toBe(
      "| Roll (d4) | Result |\n| --- | --- |\n| 1–2 | Ask [[X]] or pay \\| bribe |\n| 3–4 | See [[page\\|alias]] |",
    );
  });

  it("renders a dice-pool table with a pool-labeled header", () => {
    expect(azerTableMarkdown("die: 2d6\nA\nB")).toBe(
      "| Roll (2d6) | Result |\n| --- | --- |\n| 2–6 | A |\n| 7–12 | B |",
    );
  });

  it("renders a warning callout for a die that is too small", () => {
    const md = azerTableMarkdown("die: d4\nA\nB\nC\nD\nE");
    expect(md).toMatch(/^> \[!warning\]/);
    expect(md).toContain("only 4 faces");
  });

  it("renders a warning callout for a duplicate die directive", () => {
    const md = azerTableMarkdown("die: d6\ndie: d8\nA");
    expect(md).toMatch(/^> \[!warning\]/);
    expect(md).toContain("more than one");
  });

  it("renders a warning callout when there are no entries", () => {
    const md = azerTableMarkdown("die: d20");
    expect(md).toMatch(/^> \[!warning\]/);
    expect(md).toContain("no entries");
  });
});
