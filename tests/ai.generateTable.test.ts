import { describe, expect, it } from "vitest";
import { AIError } from "../src/ai/client";
import { chooseDie, fencedAzerTable, generateTable, sanitizeTableBody } from "../src/ai/generateTable";
import { apportion } from "../src/tables/apportion";
import { parseTable } from "../src/tables/parse";

const VALID = "die: d6\n3x Bandits\nA dragon\nNothing happens";
const UNKNOWN_DIE = "die: d7\nGoblins\nBandits"; // unknown die value → unrepairable parse error
const NO_ENTRIES = "die: d20"; // a die line but no outcomes → unrepairable
const TOO_SMALL = "die: d4\nalpha\nbeta\ngamma\ndelta\nepsilon"; // 5 entries on a d4 → repairable
const FENCED = "```azer-table\ndie: d6\n3x Bandits\nA dragon\nNothing happens\n```";
// A `1x die: …` line parses to a weight-1 entry whose text is a `die:` directive,
// so the reconstructed body has two `die:` lines — caught by the re-render recheck.
const DIE_ENTRY = "die: d4\n1x die: roll for poison";

/** A fake Complete that returns queued responses and records the prompts seen. */
function fakeComplete(responses: string[]) {
  const users: string[] = [];
  const fn = async (_system: string, user: string) => {
    users.push(user);
    return responses.shift() ?? "";
  };
  return { fn, users };
}

/** Assert a generated body parses through the real Phase 2 code and fits its die. */
function expectValid(body: string): void {
  const parsed = parseTable(body);
  expect(parsed.ok, parsed.ok ? "" : parsed.error).toBe(true);
  if (parsed.ok) {
    const fit = apportion(
      parsed.table.die,
      parsed.table.entries.map((e) => e.weight),
    );
    expect(fit.ok, fit.ok ? "" : fit.error).toBe(true);
  }
}

describe("sanitizeTableBody", () => {
  it("strips a surrounding code fence (with or without a language tag)", () => {
    expect(sanitizeTableBody(FENCED)).toBe(VALID);
    expect(sanitizeTableBody("```\ndie: d4\na\n```")).toBe("die: d4\na");
  });
  it("leaves an unfenced body unchanged (trimmed)", () => {
    expect(sanitizeTableBody(`  ${VALID}  `)).toBe(VALID);
  });
});

describe("chooseDie", () => {
  it("keeps a die that already fits, bumps one that's too small", () => {
    expect(chooseDie(20, 5)).toBe(20);
    expect(chooseDie(4, 5)).toBe(6);
    expect(chooseDie(6, 9)).toBe(10);
    expect(chooseDie(100, 100)).toBe(100);
  });
  it("returns null when there are more entries than the largest die", () => {
    expect(chooseDie(100, 101)).toBeNull();
  });
});

describe("generateTable", () => {
  it("returns the (cleaned) body when the first response is valid", async () => {
    const { fn, users } = fakeComplete([VALID]);
    expect(await generateTable(fn, "bandit camp")).toBe(VALID);
    expect(users).toHaveLength(1);
    expect(users[0]).toContain("bandit camp");
  });

  it("repairs a too-small die by bumping to one that fits (keeping the entries)", async () => {
    const { fn } = fakeComplete([TOO_SMALL]);
    const body = await generateTable(fn, "loot");
    expect(body).toBe("die: d6\nalpha\nbeta\ngamma\ndelta\nepsilon");
    expectValid(body);
  });

  it("strips a surrounding code fence the model added, then validates", async () => {
    const { fn } = fakeComplete([FENCED]);
    expect(await generateTable(fn, "x")).toBe(VALID);
  });

  it("strips a fence AND bumps a too-small die in one repair pass", async () => {
    const { fn } = fakeComplete(["```\ndie: d4\nalpha\nbeta\ngamma\ndelta\nepsilon\n```"]);
    const body = await generateTable(fn, "x");
    expect(body).toBe("die: d6\nalpha\nbeta\ngamma\ndelta\nepsilon");
    expectValid(body);
  });

  it("preserves a weight-1 entry whose text starts with an Nx prefix (round-trip guard)", async () => {
    const { fn } = fakeComplete(["die: d4\n1x 3x bonus loot"]);
    const body = await generateTable(fn, "x");
    expect(body).toBe("die: d4\n1x 3x bonus loot");
    expectValid(body);
  });

  it("rejects an entry whose text is a die: directive (re-render recheck is live)", async () => {
    const { fn } = fakeComplete([DIE_ENTRY, DIE_ENTRY]);
    const err = await generateTable(fn, "x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AIError);
    expect((err as Error).message).toContain("more than one");
  });

  it("retries once on an unrepairable parse error, then returns the valid retry", async () => {
    const { fn, users } = fakeComplete([UNKNOWN_DIE, VALID]);
    expect(await generateTable(fn, "rumors")).toBe(VALID);
    expect(users).toHaveLength(2);
    expect(users[1]).toMatch(/previous output was invalid/i);
    expect(users[1]).toContain("Unknown die");
  });

  it("throws AIError (writing nothing) when both attempts are unrepairable, surfacing the LAST error", async () => {
    const { fn } = fakeComplete([UNKNOWN_DIE, NO_ENTRIES]); // distinct errors prove the last one wins
    const err = await generateTable(fn, "x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AIError);
    expect((err as Error).message).toMatch(/invalid table twice/i);
    expect((err as Error).message).toContain("no entries");
  });
});

describe("fencedAzerTable", () => {
  it("wraps a bare body in an azer-table code block whose content still parses", () => {
    const fenced = fencedAzerTable(VALID);
    expect(fenced.startsWith("```azer-table\n")).toBe(true);
    expect(fenced.trimEnd().endsWith("```")).toBe(true);
    const inner = fenced.replace(/^```azer-table\n/, "").replace(/\n```\n?$/, "");
    expect(parseTable(inner).ok).toBe(true);
  });
});
