import type { App } from "obsidian";
import type { AzerNoteRef } from "./campaign";
import { AZER_TYPE_KEY } from "./schema/frontmatter";

/**
 * Read the data the campaign picker needs from the live vault: a ref for every
 * Azer note (those carrying an `azer-type` frontmatter key), and the active
 * file's path (for the default selection).
 */
export function campaignContext(app: App): { refs: AzerNoteRef[]; activePath: string | null } {
  const refs: AzerNoteRef[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const azerType = app.metadataCache.getFileCache(file)?.frontmatter?.[AZER_TYPE_KEY];
    if (typeof azerType === "string") refs.push({ path: file.path });
  }
  return { refs, activePath: app.workspace.getActiveFile()?.path ?? null };
}
