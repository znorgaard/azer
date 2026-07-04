export interface FaceRange {
  /** First die face (1-based, inclusive). */
  readonly start: number;
  /** Last die face (inclusive); equals start for a single face. */
  readonly end: number;
}

export type ApportionResult =
  | { ok: true; ranges: readonly FaceRange[] }
  | { ok: false; error: string };

/**
 * Scale entry weights onto a die's faces. Every entry gets >=1 face; the
 * surplus faces are distributed by largest-remainder, ties breaking toward the
 * later (higher) entry. `ranges[i]` corresponds to `weights[i]`, in order.
 *
 * Precondition: `die` is a positive integer and each weight is a positive
 * integer (as produced by `parseTable`); `total` is therefore always > 0.
 */
export function apportion(die: number, weights: readonly number[]): ApportionResult {
  const n = weights.length;
  // Defensive: parseTable already guarantees >=1 entry, so this is unreachable
  // from the renderer — it just keeps apportion safe as a standalone function.
  if (n === 0) return { ok: false, error: "This table has no entries." };
  if (die < n) {
    return {
      ok: false,
      error: `A d${die} has only ${die} faces but this table has ${n} entries — use a larger die.`,
    };
  }

  const total = weights.reduce((a, b) => a + b, 0);
  const surplus = die - n;
  const extra = weights.map((w) => Math.floor((surplus * w) / total));
  const leftover = surplus - extra.reduce((a, b) => a + b, 0);

  // Largest remainder wins a leftover face; ties go to the later index. Compare
  // INTEGER remainders ((surplus*w) % total) — float fracs can tie-misorder by a ULP.
  const byRemainder = weights
    .map((w, i) => ({ i, rem: (surplus * w) % total }))
    .sort((a, b) => b.rem - a.rem || b.i - a.i);
  for (let k = 0; k < leftover; k++) {
    extra[byRemainder[k].i] += 1;
  }

  const ranges: FaceRange[] = [];
  let cursor = 1;
  for (const e of extra) {
    const faces = e + 1;
    ranges.push({ start: cursor, end: cursor + faces - 1 });
    cursor += faces;
  }
  return { ok: true, ranges };
}

/** Format a face range for display (two-digit on d100). */
export function formatRange(range: FaceRange, die: number): string {
  const fmt = (face: number): string =>
    die === 100 ? String(face).padStart(2, "0") : String(face);
  return range.start === range.end
    ? fmt(range.start)
    : `${fmt(range.start)}–${fmt(range.end)}`;
}
