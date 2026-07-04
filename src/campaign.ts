/** A note seen during a vault scan, referenced by its vault-relative path. */
export interface AzerNoteRef {
  path: string;
}

/**
 * The campaign a vault path belongs to: its first path segment, but only when
 * the path is nested (a campaign folder must contain the note). Returns null
 * for a root-level file like "Quests.md".
 */
export function campaignOf(path: string): string | null {
  const slash = path.indexOf("/");
  // > 0 (not !== -1): a leading-slash path is treated as root-level — "" would
  // be a worse campaign name than null. Obsidian never produces leading slashes.
  return slash > 0 ? path.slice(0, slash) : null;
}

const byName = (a: string, b: string): number => a.localeCompare(b, undefined, { sensitivity: "base" });

/** Shared empty exclude set (read-only; never mutated). */
const EMPTY: ReadonlySet<string> = new Set();

/**
 * The campaign a note path belongs to, mapping BOTH root-level notes and notes
 * that sit directly under one of Azer's own type/recap folders to the vault
 * root (""). This is the single definition of "which campaign owns this note",
 * shared by detection, the picker, and the recap filter — so "vault root" means
 * the same thing everywhere. `exclude` holds the **lower-cased** type/recap
 * folder names (see `typeFolderNames`); the first segment is lower-cased for the
 * membership test so the match is case-insensitive, but a real campaign is
 * returned in its original casing. (Deliberate tradeoff: on a case-sensitive
 * filesystem a campaign folder whose name case-insensitively equals a type
 * folder is treated as that type folder — an inherently ambiguous setup.)
 */
export function effectiveCampaign(path: string, exclude: ReadonlySet<string> = EMPTY): string {
  const c = campaignOf(path);
  return c === null || exclude.has(c.toLowerCase()) ? "" : c;
}

/**
 * Distinct campaigns that own at least one Azer note, sorted case-insensitively.
 * Root-level notes and notes under an excluded type/recap folder belong to the
 * vault root and contribute no campaign — so a flat pre-feature vault, whose
 * notes sit directly in type folders, yields none.
 */
export function detectCampaigns(notes: readonly AzerNoteRef[], exclude: ReadonlySet<string> = EMPTY): string[] {
  const seen = new Set<string>();
  for (const note of notes) {
    const c = effectiveCampaign(note.path, exclude);
    if (c !== "") seen.add(c);
  }
  return [...seen].sort(byName);
}

/**
 * Build the in-campaign folder for a type folder. A blank campaign yields the
 * bare type folder (back-compat / a vault with no campaigns). Each side is
 * split on "/" and its segments trimmed; empty, "." and ".." segments are
 * dropped — so stray slashes, surrounding whitespace, and path-traversal
 * attempts in a typed-in campaign name can never leak a leading/double slash
 * or escape the vault.
 */
export function scopedFolder(campaign: string, typeFolder: string): string {
  const c = sanitizeFolder(campaign);
  const f = sanitizeFolder(typeFolder);
  if (f === "") return c; // blank type folder → just the campaign (no trailing slash)
  return c === "" ? f : `${c}/${f}`;
}

/** Trim path segments and drop empty / "." / ".." parts so a path can't escape the vault. */
function sanitizeFolder(path: string): string {
  return path
    .split("/")
    .map((seg) => seg.trim())
    .filter((seg) => seg !== "" && seg !== "." && seg !== "..")
    .join("/");
}

/** The picker entry meaning "no campaign folder" — notes go to bare type folders. */
export const VAULT_ROOT_LABEL = "(Vault root)";

/** The option list and preselected value driving a campaign picker. */
export interface PickerState {
  options: string[];
  selected: string;
}

/**
 * The option list and preselected value for the campaign picker. Options are
 * `VAULT_ROOT_LABEL` followed by the detected campaigns plus the active note's
 * campaign (deduped, sorted; a campaign folder literally named the sentinel is
 * dropped from the list — its notes are effectively unreachable via the picker).
 * The selection is the active note's campaign when it is a real campaign
 * (present and not an excluded type folder), else the vault-root entry — so the
 * picker never silently preselects a stray folder.
 */
export function pickerState(
  detected: readonly string[],
  activePath: string | null,
  exclude: ReadonlySet<string> = EMPTY,
): PickerState {
  const activeCampaign = activePath !== null ? effectiveCampaign(activePath, exclude) : "";
  const set = new Set<string>(detected);
  if (activeCampaign !== "") set.add(activeCampaign);
  // Drop the sentinel from real campaigns so a folder literally named
  // "(Vault root)" can't show up twice; it is the explicit first option only.
  const campaigns = [...set].filter((c) => c !== VAULT_ROOT_LABEL).sort(byName);
  const options = [VAULT_ROOT_LABEL, ...campaigns];
  return { options, selected: activeCampaign !== "" ? activeCampaign : VAULT_ROOT_LABEL };
}

/** Detect campaigns and build picker state in one call (the live commands' entry point). */
export function campaignPicker(
  refs: readonly AzerNoteRef[],
  activePath: string | null,
  exclude: ReadonlySet<string> = EMPTY,
): PickerState {
  return pickerState(detectCampaigns(refs, exclude), activePath, exclude);
}

/**
 * Map a picker field value to a campaign folder: the vault-root label (or a
 * blank entry) becomes "" (root → bare type folder); any other value is reduced
 * to its first sanitized path segment, so a stray `Enyr/Sub` scopes and files
 * to the same single campaign `Enyr`.
 */
export function campaignFromPick(value: string): string {
  if (value.trim() === VAULT_ROOT_LABEL) return "";
  return sanitizeFolder(value).split("/")[0];
}
