import { effectiveCampaign } from "../campaign";

export interface AdventureLogNote {
  title: string;
  date: string;
  body: string;
  /** Vault-relative path of the source note (used to scope by campaign). */
  path: string;
}

/**
 * The notes that belong to `campaign`, using the same vault-root rule as the
 * picker: a note under a root-level type folder (named in `exclude`, which must
 * hold lower-cased names — see `typeFolderNames`) belongs to the vault root
 * (""), so a flat-vault recap of "" still finds its logs.
 */
export function forCampaign(
  notes: readonly AdventureLogNote[],
  campaign: string,
  exclude?: ReadonlySet<string>,
): AdventureLogNote[] {
  return notes.filter((n) => effectiveCampaign(n.path, exclude) === campaign);
}

/**
 * The `n` most recent notes by `date`, returned oldest-first (ready to feed a
 * recap). Does not mutate the input. ISO `YYYY-MM-DD` dates sort
 * lexicographically; ties preserve insertion order (stable sort).
 */
export function selectForRecap(notes: AdventureLogNote[], n: number): AdventureLogNote[] {
  if (n <= 0) return [];
  const oldestFirst = [...notes].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return oldestFirst.slice(-n); // the last (most recent) n, already oldest-first
}

/**
 * Strip a leading `---` … `---` YAML frontmatter block from note text.
 *
 * Tolerant of real-world notes: a leading UTF-8 BOM and any blank lines before
 * the opening `---` are skipped (Obsidian ignores frontmatter that isn't at the
 * very top, but the raw text still carries it, so recaps must not). CRLF-safe.
 * Returns the text unchanged when there is no complete frontmatter block.
 */
export function stripFrontmatter(text: string): string {
  // Strip a leading BOM up front: the `---` check below is exact and won't trim it off.
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  let open = 0;
  while (open < lines.length && lines[open].trim() === "") open++;
  if (lines[open] !== "---") return text;
  const close = lines.indexOf("---", open + 1);
  if (close === -1) return text;
  return lines.slice(close + 1).join("\n").trimStart();
}
