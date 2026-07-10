export interface AzerSettings {
  /** Anthropic model for the AI features. */
  model: string;
  /** Max output tokens per AI request. */
  maxTokens: number;
  /** Folder for AI-generated recap notes. */
  recapsFolder: string;
}

export const DEFAULT_SETTINGS: AzerSettings = {
  model: "claude-opus-4-8",
  maxTokens: 4096,
  recapsFolder: "Recaps",
};

/**
 * Merge persisted plugin data over the defaults into a fresh settings object
 * (no shared mutable state with `DEFAULT_SETTINGS`).
 */
export function mergeSettings(loaded: unknown): AzerSettings {
  const data = (loaded ?? {}) as Partial<AzerSettings>;
  return { ...DEFAULT_SETTINGS, ...data };
}

/**
 * The top-level folder names Azer owns (every note-type folder plus the recaps
 * folder), **lower-cased**. These are never campaigns — the picker and recap
 * filter exclude them so a flat vault doesn't surface its type folders as
 * campaigns. Each folder is reduced to its first path segment (so a nested
 * "Types/NPCs" still excludes "Types") and lower-cased for case-insensitive
 * matching. Consumers compare against a lower-cased key (see `effectiveCampaign`).
 */
export function typeFolderNames(folders: readonly string[]): ReadonlySet<string> {
  const names = new Set<string>();
  for (const folder of folders) {
    const first = folder.split("/")[0].trim().toLowerCase();
    if (first) names.add(first);
  }
  return names;
}

/**
 * Device-local storage key for the Anthropic API key. Stored via the app's
 * localStorage (the app profile, OUTSIDE the vault) so no vault-sync mechanism
 * — Obsidian Sync, git, Dropbox, iCloud — ever copies it between devices.
 */
export const API_KEY_LS_KEY = "azer:anthropic-api-key";

/** The slice of Obsidian's `App` used for device-local storage. */
export interface LocalStorageApp {
  loadLocalStorage(key: string): string | null;
  saveLocalStorage(key: string, value: string | null): void;
}

export function getApiKey(app: LocalStorageApp): string {
  return app.loadLocalStorage(API_KEY_LS_KEY) ?? "";
}

export function setApiKey(app: LocalStorageApp, key: string): void {
  const trimmed = key.trim();
  app.saveLocalStorage(API_KEY_LS_KEY, trimmed === "" ? null : trimmed);
}
