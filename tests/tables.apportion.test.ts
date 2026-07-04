import { describe, expect, it } from "vitest";
import { apportion, formatRange, type FaceRange } from "../src/tables/apportion";

function ranges(die: number, weights: number[]): readonly FaceRange[] {
  const r = apportion(die, weights);
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.ranges;
}

describe("apportion", () => {
  it("maps weights 1/2/1 onto a d20 (even ×5 scaling)", () => {
    expect(ranges(20, [1, 2, 1])).toEqual([
      { start: 1, end: 5 },
      { start: 6, end: 15 },
      { start: 16, end: 20 },
    ]);
  });

  it("breaks rounding ties toward the later entries (1/1/1 on d20)", () => {
    expect(ranges(20, [1, 1, 1])).toEqual([
      { start: 1, end: 6 },
      { start: 7, end: 13 },
      { start: 14, end: 20 },
    ]);
  });

  it("guarantees >=1 face each (1/1/1 on d4)", () => {
    expect(ranges(4, [1, 1, 1])).toEqual([
      { start: 1, end: 1 },
      { start: 2, end: 2 },
      { start: 3, end: 4 },
    ]);
  });

  it("gives everyone exactly one face when die == entry count", () => {
    expect(ranges(4, [5, 5, 5, 5])).toEqual([
      { start: 1, end: 1 },
      { start: 2, end: 2 },
      { start: 3, end: 3 },
      { start: 4, end: 4 },
    ]);
  });

  it("keeps a tiny-weight entry rollable under skew (>=1 floor)", () => {
    const r = ranges(20, [1, 1, 1, 1, 97]);
    expect(r.slice(0, 4)).toEqual([
      { start: 1, end: 1 },
      { start: 2, end: 2 },
      { start: 3, end: 3 },
      { start: 4, end: 4 },
    ]);
    expect(r[4]).toEqual({ start: 5, end: 20 });
  });

  it("breaks ties toward the later entry even when float remainders disagree", () => {
    // d6, weights 2/12/1: idx0 and idx1 share the exact remainder 6, but float
    // fracs differ by a ULP. The later entry (idx1) must win the leftover face.
    expect(ranges(6, [2, 12, 1])).toEqual([
      { start: 1, end: 1 },
      { start: 2, end: 5 },
      { start: 6, end: 6 },
    ]);
  });

  it("gives the whole die to a single entry", () => {
    expect(ranges(6, [1])).toEqual([{ start: 1, end: 6 }]);
  });

  it("errors on an empty weights array", () => {
    const r = apportion(20, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no entries/);
  });

  it("errors when the die has fewer faces than entries", () => {
    const r = apportion(4, [1, 1, 1, 1, 1]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/only 4 faces/);
  });

  it("produces contiguous ranges covering 1..die with no gaps or overlaps", () => {
    const r = ranges(20, [3, 1, 4, 1, 5]);
    expect(r[0].start).toBe(1);
    expect(r[r.length - 1].end).toBe(20);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].start).toBe(r[i - 1].end + 1);
    }
  });

  it("formats single faces, bands, and two-digit d100", () => {
    expect(formatRange({ start: 7, end: 7 }, 20)).toBe("7");
    expect(formatRange({ start: 1, end: 5 }, 20)).toBe("1–5");
    expect(formatRange({ start: 1, end: 6 }, 100)).toBe("01–06");
    expect(formatRange({ start: 100, end: 100 }, 100)).toBe("100");
  });
});
