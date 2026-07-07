export const VALID_DICE = [4, 6, 8, 10, 12, 20, 100] as const;

export type Die = (typeof VALID_DICE)[number];

/** A die roll: `n` dice of `m` faces each. `n === 1` is a single die (d20); `n > 1` is a pool (2d6). */
export interface DieSpec {
  readonly n: number;
  readonly m: Die;
}

export interface ParsedEntry {
  /** Positive integer weight (>= 1). */
  readonly weight: number;
  /** Result text (arbitrary Markdown), trimmed of leading/trailing whitespace. */
  readonly text: string;
}

export interface ParsedTable {
  readonly die: DieSpec;
  readonly entries: readonly ParsedEntry[];
}

export type ParseResult =
  | { ok: true; table: ParsedTable }
  | { ok: false; error: string };

const DEFAULT_DIE: DieSpec = { n: 1, m: 20 };
const DIE_LINE = /^\s*die\s*:(.*)$/i;
const DIE_VALUE = /^(\d*)d(\d+)$/; // optional dice count, then dN — "d20" or "2d6"
const WEIGHT_PREFIX = /^(\d+)x\s+(.+)$/;

// A real table never pools more than a few dice; cap `n` so a typo like
// `die: 200000d20` can't drive combos() into O(n²) work on the render thread.
const MAX_POOL_DICE = 100;

/** Parse a die token (`d20`, `2d6`) into a spec, or null if malformed/non-standard. */
function parseDieSpec(token: string): DieSpec | null {
  const vm = token.match(DIE_VALUE);
  if (!vm) return null;
  const n = vm[1] === "" ? 1 : Number(vm[1]);
  const m = Number(vm[2]);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_POOL_DICE) return null;
  if (!(VALID_DICE as readonly number[]).includes(m)) return null;
  return { n, m: m as Die };
}

/** Parse an `azer-table` code-block body into a table, or an error message. */
export function parseTable(source: string): ParseResult {
  const dieValues: string[] = [];
  const entries: ParsedEntry[] = [];

  for (const raw of source.split(/\r?\n/)) {
    if (raw.trim() === "") continue;
    // A line matching `die:` is always the die directive, never entry text.
    const dieMatch = raw.match(DIE_LINE);
    if (dieMatch) {
      dieValues.push(dieMatch[1].trim().toLowerCase());
      continue;
    }
    const wm = raw.match(WEIGHT_PREFIX);
    const n = wm ? Number(wm[1]) : NaN;
    if (wm && Number.isSafeInteger(n) && n >= 1) {
      entries.push({ weight: n, text: wm[2].trim() });
    } else {
      entries.push({ weight: 1, text: raw.trim() });
    }
  }

  if (dieValues.length > 1) {
    return { ok: false, error: "This table declares more than one `die:` — keep exactly one." };
  }

  let die: DieSpec = DEFAULT_DIE;
  if (dieValues.length === 1) {
    const spec = parseDieSpec(dieValues[0]);
    if (!spec) {
      return {
        ok: false,
        error: `Unknown die '${dieValues[0]}'. Use a single die (d4, d6, d8, d10, d12, d20, d100) or a pool (e.g. 2d6).`,
      };
    }
    die = spec;
  }

  if (entries.length === 0) {
    return { ok: false, error: "This table has no entries." };
  }

  return { ok: true, table: { die, entries } };
}
