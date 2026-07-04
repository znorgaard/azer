export const VALID_DICE = [4, 6, 8, 10, 12, 20, 100] as const;

export type Die = (typeof VALID_DICE)[number];

export interface ParsedEntry {
  /** Positive integer weight (>= 1). */
  readonly weight: number;
  /** Result text (arbitrary Markdown), trimmed of leading/trailing whitespace. */
  readonly text: string;
}

export interface ParsedTable {
  readonly die: Die;
  readonly entries: readonly ParsedEntry[];
}

export type ParseResult =
  | { ok: true; table: ParsedTable }
  | { ok: false; error: string };

const DEFAULT_DIE: Die = 20;
const DIE_LINE = /^\s*die\s*:(.*)$/i;
const DIE_VALUE = /^d(\d+)$/;
const WEIGHT_PREFIX = /^(\d+)x\s+(.+)$/;

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

  let die: Die = DEFAULT_DIE;
  if (dieValues.length === 1) {
    const vm = dieValues[0].match(DIE_VALUE);
    const n = vm ? Number(vm[1]) : NaN;
    if (!vm || !(VALID_DICE as readonly number[]).includes(n)) {
      return {
        ok: false,
        error: `Unknown die '${dieValues[0]}'. Use one of d4, d6, d8, d10, d12, d20, d100.`,
      };
    }
    die = n as Die;
  }

  if (entries.length === 0) {
    return { ok: false, error: "This table has no entries." };
  }

  return { ok: true, table: { die, entries } };
}
