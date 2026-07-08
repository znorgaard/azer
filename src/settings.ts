import { ALL_TYPES, SCHEMAS, type AzerType, type TypeSchema } from "./schema/types";

export interface AzerSettings {
  /** Anthropic model for the AI features. */
  model: string;
  /** Max output tokens per AI request. */
  maxTokens: number;
  /** Folder for AI-generated recap notes. */
  recapsFolder: string;
  /** Default folder per built-in note type (keyed by azer-type id). */
  folders: Record<string, string>;
  /** User-defined note types, authored as a raw YAML list; parsed on load. */
  customTypesYaml: string;
}

function defaultFolders(): Record<AzerType, string> {
  const folders = {} as Record<AzerType, string>;
  for (const type of ALL_TYPES) {
    folders[type] = SCHEMAS[type].defaultFolder;
  }
  return folders;
}

export const DEFAULT_SETTINGS: AzerSettings = {
  model: "claude-opus-4-8",
  maxTokens: 4096,
  recapsFolder: "Recaps",
  folders: defaultFolders(),
  customTypesYaml: "",
};

/**
 * Merge persisted plugin data over the defaults into a settings object that
 * shares NO mutable state with `DEFAULT_SETTINGS` — so editing a folder in the
 * settings tab can never mutate the module constant. Saved folder overrides
 * layer on top of the current defaults, so a note type added in a later
 * release still gets its default folder.
 */
export function mergeSettings(loaded: unknown): AzerSettings {
  const data = (loaded ?? {}) as Partial<AzerSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    folders: { ...DEFAULT_SETTINGS.folders, ...(data.folders ?? {}) },
  };
}

/**
 * The top-level folder names Azer uses for its own content (every type folder
 * plus the recaps folder), **lower-cased**. These are never campaigns — the
 * picker and recap filter exclude them so a flat vault doesn't surface its type
 * folders as campaigns. Each configured folder is reduced to its first path
 * segment (so a nested config like "Types/NPCs" still excludes "Types") and
 * lower-cased, so matching is case-insensitive — tolerating an on-disk folder
 * whose case differs from the setting (`npcs/` vs configured `NPCs`) on
 * case-insensitive filesystems. Consumers must compare against a lower-cased key
 * (see `effectiveCampaign`).
 */
export function typeFolderNames(
  settings: AzerSettings,
  customFolders: readonly string[] = [],
): ReadonlySet<string> {
  const names = new Set<string>();
  for (const folder of [...Object.values(settings.folders), settings.recapsFolder, ...customFolders]) {
    const first = folder.split("/")[0].trim().toLowerCase();
    if (first) names.add(first);
  }
  return names;
}

export function folderFor(settings: AzerSettings, schema: TypeSchema): string {
  // A built-in type may have a saved folder override; a custom type has none,
  // so it falls back to the folder declared in its YAML (schema.defaultFolder).
  return settings.folders[schema.azerType] ?? schema.defaultFolder;
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
