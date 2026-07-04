import { apportion, formatRange } from "./apportion";
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
  const result = apportion(
    die,
    entries.map((e) => e.weight),
  );
  if (!result.ok) return warningCallout(result.error);

  const rows = entries.map(
    (e, i) => `| ${formatRange(result.ranges[i], die)} | ${escapeCell(e.text)} |`,
  );
  return [`| Roll (d${die}) | Result |`, "| --- | --- |", ...rows].join("\n");
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
