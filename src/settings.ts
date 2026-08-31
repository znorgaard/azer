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
 * Build a fresh settings object from persisted plugin data.
 * Missing/invalid fields fall back to defaults; unknown keys drop.
 */
export function mergeSettings(loaded: unknown): AzerSettings {
  const data = (loaded ?? {}) as Partial<Record<keyof AzerSettings, unknown>>;
  return {
    model: coerceModel(data.model),
    maxTokens: coerceMaxTokens(data.maxTokens),
    recapsFolder: coerceRecapsFolder(data.recapsFolder),
  };
}

/** Per-key coercion of raw values. */
export const SETTING_COERCERS: { [K in keyof AzerSettings]: (value: unknown) => AzerSettings[K] } = {
  model: coerceModel,
  maxTokens: coerceMaxTokens,
  recapsFolder: coerceRecapsFolder,
};

/** Trim a string value, falling back to `fallback` for blanks and non-strings. */
function coerceTrimmed(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

/** Coerce a raw settings-control value into a `model`. */
export function coerceModel(value: unknown): string {
  return coerceTrimmed(value, DEFAULT_SETTINGS.model);
}

/** Coerce a raw settings-control value into a positive integer. */
export function coerceMaxTokens(value: unknown): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? Math.trunc(value) : Number.NaN;
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_SETTINGS.maxTokens;
}

/** Coerce a raw settings-control value into a valid `recapsFolder`. */
export function coerceRecapsFolder(value: unknown): string {
  return coerceTrimmed(value, DEFAULT_SETTINGS.recapsFolder);
}

/**
 * The top-level folder names Azer owns. The picker and recap
 * filter exclude them so a flat vault doesn't surface its type folders as
 * campaigns. Each folder is reduced to its first path segment (so a nested
 * "Types/NPCs" still excludes "Types").
 */
export function typeFolderNames(folders: readonly string[]): ReadonlySet<string> {
  const names = new Set<string>();
  for (const folder of folders) {
    const first = folder.split("/")[0].trim().toLowerCase();
    if (first) names.add(first);
  }
  return names;
}

/** Device-local storage key for the Anthropic API key. */
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
