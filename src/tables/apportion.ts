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

/**
 * Ways to roll each sum of `n` dice of `m` faces, indexed by sum from the
 * minimum (`n`) up. `combos(2, 6)[0]` is the ways to roll a 2 (one), the peak
 * is the median sum. The total across the array is `m ** n`.
 */
export function combos(n: number, m: number): number[] {
  let ways = [1]; // zero dice: one way to roll a sum of 0
  for (let d = 0; d < n; d++) {
    const next = new Array<number>(ways.length + m - 1).fill(0);
    for (let i = 0; i < ways.length; i++) {
      for (let face = 1; face <= m; face++) next[i + face - 1] += ways[i];
    }
    ways = next;
  }
  return ways;
}

/**
 * Assign entries to contiguous bands of a dice pool's sum axis, weighted by the
 * probability mass of each sum (not an even spread) — so an entry's share of
 * the bell curve tracks its weight. Each entry gets >=1 distinct sum;
 * `ranges[i]` (in sum values, e.g. 2..12 for 2d6) corresponds to `weights[i]`.
 */
export function apportionPool(
  n: number,
  m: number,
  weights: readonly number[],
): ApportionResult {
  const nEntries = weights.length;
  if (nEntries === 0) return { ok: false, error: "This table has no entries." };

  const c = combos(n, m);
  const K = c.length; // number of distinct sums
  if (K < nEntries) {
    return {
      ok: false,
      error: `A ${n}d${m} has only ${K} possible results but this table has ${nEntries} entries — use fewer entries or a wider pool.`,
    };
  }

  const total = c.reduce((a, b) => a + b, 0);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const prefixMass: number[] = [];
  let acc = 0;
  for (const ways of c) prefixMass.push((acc += ways)); // prefixMass[j] = mass of sums 0..j

  const min = n; // sum index 0 is a roll of `n`
  const ranges: FaceRange[] = [];
  let prev = -1; // last sum index already consumed
  let cumWeight = 0;
  for (let i = 0; i < nEntries; i++) {
    cumWeight += weights[i];
    let e: number;
    if (i === nEntries - 1) {
      e = K - 1; // the last entry mops up the tail
    } else {
      // Cut at the sum index whose cumulative mass lands *closest* to this
      // entry's target share — so equal weights split the bell curve evenly
      // (2d6 → 2–6/7–12) rather than always overshooting the median.
      // ponytail: float target is fine — the mass is integer, and any rounding
      // wobble only shifts a boundary by one sum on absurd pools.
      const target = (total * cumWeight) / totalWeight;
      let j = prev + 1;
      while (j < K - 1 && prefixMass[j] < target) j++;
      // j is the first index reaching/exceeding target; j-1 undershoots it.
      // Prefer the nearer of the two (ties round down), but never below the
      // entry's own first sum (prev + 1).
      if (j > prev + 1 && target - prefixMass[j - 1] <= prefixMass[j] - target) {
        j -= 1;
      }
      const maxE = K - 1 - (nEntries - 1 - i); // reserve one sum per later entry
      e = Math.min(j, maxE);
    }
    ranges.push({ start: min + prev + 1, end: min + e });
    prev = e;
  }
  return { ok: true, ranges };
}

/** Format a face range for display; `pad` two-digit (percentile d100 reads 01–09). */
export function formatRange(range: FaceRange, pad: boolean): string {
  const fmt = (face: number): string =>
    pad ? String(face).padStart(2, "0") : String(face);
  return range.start === range.end
    ? fmt(range.start)
    : `${fmt(range.start)}–${fmt(range.end)}`;
}
