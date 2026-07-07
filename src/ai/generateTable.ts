import { AIError, type Complete } from "./client";
import { apportion, apportionPool } from "../tables/apportion";
import { type Die, type DieSpec, type ParsedEntry, VALID_DICE, parseTable } from "../tables/parse";

export const TABLE_SYSTEM =
  "You generate Dungeons & Dragons random tables in a specific text format.\n" +
  "Output ONLY the table body — no code fences, no numbering, no preamble, no commentary, no blank lines.\n" +
  "Format:\n" +
  "- The FIRST line must be `die: dN` (a single die) or `die: KdN` (a pool of K dice, e.g. `2d6`, `3d10`), where N is one of 4, 6, 8, 10, 12, 20, 100.\n" +
  "- Then one outcome per line.\n" +
  "- Use a die (or pool) with at least as many possible results as outcomes: a single dN has N results; a pool KdN has K*(N-1)+1 (e.g. 2d6 has 11).\n" +
  "- Prefix an outcome with `Nx ` (e.g. `3x Bandits`) to make it N times more likely; leave rare results unprefixed.\n" +
  "- Use [[wikilinks]] for places or NPCs when natural.\n" +
  "Example:\n" +
  "die: d8\n3x Goblin scouts\n2x A wolf pack\nA [[Redbrand]] patrol\nAn abandoned cart\nA lost child\nNothing";

/** Wrap a bare azer-table body in the fenced ```azer-table code block the renderer reads. */
export function fencedAzerTable(body: string): string {
  return "```azer-table\n" + body.trim() + "\n```\n";
}

/** Strip a surrounding markdown code fence the model sometimes adds despite instructions (CRLF-safe). */
export function sanitizeTableBody(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```[^\r\n]*\r?\n([\s\S]*?)\r?\n```$/);
  return (fenced ? fenced[1] : t).trim();
}

/**
 * Returns `current` if it already fits `entryCount`; otherwise the smallest die
 * in VALID_DICE whose face count is ≥ `entryCount`. Returns `null` when
 * `entryCount > 100` (no standard die fits).
 */
export function chooseDie(current: Die, entryCount: number): Die | null {
  if (current >= entryCount) return current;
  for (const d of VALID_DICE) {
    if (d >= entryCount) return d;
  }
  return null;
}

function renderBody(die: DieSpec, entries: readonly ParsedEntry[]): string {
  const lines = entries.map((e) => {
    if (e.weight > 1) return `${e.weight}x ${e.text}`;
    // Guard a weight-1 entry whose text literally starts with an `Nx ` prefix,
    // so re-parsing the rendered body doesn't reinterpret it as a weight.
    return /^\d+x\s/.test(e.text) ? `1x ${e.text}` : e.text;
  });
  const label = die.n === 1 ? `d${die.m}` : `${die.n}d${die.m}`;
  return `die: ${label}\n${lines.join("\n")}`;
}

/** How many distinct results a pool of `n` dice of `m` faces can roll (2d6 → 11). */
function poolSums(die: DieSpec): number {
  return die.n * (die.m - 1) + 1;
}

type RepairResult = { ok: true; body: string } | { ok: false; error: string };

/**
 * Sanitize the model output, parse it, settle on a die that fits the entry
 * count (keeping a valid pool, else bumping to a single die that fits), and
 * re-render a clean, validated azer-table body. Only genuinely malformed output
 * (unknown/duplicate die, no entries, >100 entries) fails — a die that's merely
 * too small for the entries is repaired, not rejected.
 */
function repairTable(text: string): RepairResult {
  const parsed = parseTable(sanitizeTableBody(text));
  if (!parsed.ok) return { ok: false, error: parsed.error };

  // Keep a pool the model chose if it has room for every entry; otherwise (a
  // single die, or a pool with fewer sums than entries) fall back to the
  // smallest single die that fits — the same silent repair single dice get.
  const spec = parsed.table.die;
  const entryCount = parsed.table.entries.length;
  let die: DieSpec;
  if (spec.n > 1 && poolSums(spec) >= entryCount) {
    die = spec;
  } else {
    const m = chooseDie(spec.m, entryCount);
    if (m === null) {
      return { ok: false, error: `too many entries (${entryCount}) for the largest die (d100)` };
    }
    die = { n: 1, m };
  }

  const body = renderBody(die, parsed.table.entries);
  // Re-validate the rendered body end-to-end (catches e.g. an entry whose text
  // is itself a `die:` line, which would make the reconstruction ambiguous).
  const recheck = parseTable(body);
  if (!recheck.ok) return { ok: false, error: recheck.error };
  const rd = recheck.table.die;
  const weights = recheck.table.entries.map((e) => e.weight);
  const fit = rd.n === 1 ? apportion(rd.m, weights) : apportionPool(rd.n, rd.m, weights);
  return fit.ok ? { ok: true, body } : { ok: false, error: fit.error };
}

/**
 * Ask the model for a random table body and turn it into a valid azer-table body
 * via {@link repairTable}. One retry with the error fed back; otherwise fail hard
 * so a malformed table never lands.
 */
export async function generateTable(complete: Complete, prompt: string): Promise<string> {
  const user = `Generate a random table about: ${prompt}`;

  const first = repairTable(await complete(TABLE_SYSTEM, user));
  if (first.ok) return first.body;

  const retryUser = `${user}\n\nThe previous output was invalid: ${first.error}. Return a corrected table body, nothing else.`;
  const second = repairTable(await complete(TABLE_SYSTEM, retryUser));
  if (second.ok) return second.body;

  throw new AIError(`The model returned an invalid table twice. Last error: ${second.error}`);
}
