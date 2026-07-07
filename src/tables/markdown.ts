import { apportion, apportionPool, formatRange } from "./apportion";
import { parseTable } from "./parse";

/**
 * Build the physical-die lookup for an `azer-table` block as a Markdown string.
 * On any parse/apportion error, returns a `[!warning]` callout instead — the
 * block always renders something readable, never throws or blanks.
 */
export function azerTableMarkdown(source: string): string {
  const parsed = parseTable(source);
  if (!parsed.ok) return warningCallout(parsed.error);

  const { die, entries } = parsed.table;
  const weights = entries.map((e) => e.weight);
  const result =
    die.n === 1 ? apportion(die.m, weights) : apportionPool(die.n, die.m, weights);
  if (!result.ok) return warningCallout(result.error);

  const label = die.n === 1 ? `d${die.m}` : `${die.n}d${die.m}`;
  // Pad only percentile d100 faces (01–09); pool sums never need it.
  const pad = die.n === 1 && die.m === 100;
  const rows = entries.map(
    (e, i) => `| ${formatRange(result.ranges[i], pad)} | ${escapeCell(e.text)} |`,
  );
  return [`| Roll (${label}) | Result |`, "| --- | --- |", ...rows].join("\n");
}

function warningCallout(message: string): string {
  return `> [!warning] Azer table\n> ${message}`;
}

// `|` is the only character that needs escaping in a Markdown table cell.
// This also turns a `[[page|alias]]` wikilink into `[[page\|alias]]`, which is
// the correct in-table syntax — Obsidian still renders it as the aliased link.
function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|");
}
