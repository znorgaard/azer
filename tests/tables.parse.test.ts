import { describe, expect, it } from "vitest";
import { parseTable } from "../src/tables/parse";

function ok(source: string) {
  const r = parseTable(source);
  if (!r.ok) throw new Error(`expected ok, got error: ${r.error}`);
  return r.table;
}
function err(source: string): string {
  const r = parseTable(source);
  if (r.ok) throw new Error("expected error, got ok");
  return r.error;
}

describe("parseTable", () => {
  it("defaults to d20 when no die directive is present", () => {
    const t = ok("A\nB");
    expect(t.die).toEqual({ n: 1, m: 20 });
    expect(t.entries).toEqual([
      { weight: 1, text: "A" },
      { weight: 1, text: "B" },
    ]);
  });

  it("reads an explicit die directive anywhere in the block", () => {
    expect(ok("X\ndie: d8\nY").die).toEqual({ n: 1, m: 8 });
  });

  it("accepts a die directive case-insensitively (DIE: D8)", () => {
    expect(ok("DIE: D8\nX").die).toEqual({ n: 1, m: 8 });
  });

  it("parses a dice pool (2d6, 3d10)", () => {
    expect(ok("die: 2d6\nA\nB").die).toEqual({ n: 2, m: 6 });
    expect(ok("die: 3d10\nA").die).toEqual({ n: 3, m: 10 });
    expect(ok("die: 100d6\nA").die).toEqual({ n: 100, m: 6 }); // pool count at the cap
  });

  it("rejects an unknown die value", () => {
    expect(err("die: d7\nX")).toMatch(/Unknown die 'd7'/);
    expect(err("die: d20x\nX")).toMatch(/Unknown die/);
    expect(err("die:\nX")).toMatch(/Unknown die/);
    expect(err("die: 2d7\nX")).toMatch(/Unknown die/); // pool with a non-standard face count
    expect(err("die: 0d6\nX")).toMatch(/Unknown die/); // pool must roll at least one die
    expect(err("die: 101d6\nX")).toMatch(/Unknown die/); // pool count over the cap
    expect(err("die: 200000d20\nX")).toMatch(/Unknown die/); // absurd pool can't reach combos()
  });

  it("rejects more than one die directive", () => {
    expect(err("die: d6\ndie: d8\nX")).toMatch(/more than one/);
  });

  it("parses an Nx weight prefix (N >= 1)", () => {
    expect(ok("3x Redbrands").entries[0]).toEqual({ weight: 3, text: "Redbrands" });
    expect(ok("1x foo").entries[0]).toEqual({ weight: 1, text: "foo" });
  });

  it("treats a malformed weight prefix as literal text at weight 1", () => {
    expect(ok("0x foo").entries[0]).toEqual({ weight: 1, text: "0x foo" });
    expect(ok("-2x foo").entries[0]).toEqual({ weight: 1, text: "-2x foo" });
  });

  it("lets entry text itself look like a weight prefix (1x 3x apples)", () => {
    expect(ok("1x 3x apples").entries[0]).toEqual({ weight: 1, text: "3x apples" });
  });

  it("ignores blank lines and preserves [[links]] in result text", () => {
    const t = ok("A\n\n   \nAsk [[Shady Strangers]] today");
    expect(t.entries).toHaveLength(2);
    expect(t.entries[1].text).toBe("Ask [[Shady Strangers]] today");
  });

  it("errors when there are no entries", () => {
    expect(err("die: d20")).toMatch(/no entries/);
    expect(err("")).toMatch(/no entries/);
  });
});
