export interface AzerSettings {
  /** Anthropic model for the AI features. */
  model: string;
  /** Max output tokens per AI request. */
  maxTokens: number;
  /** Folder for AI-generated recap notes. */
  recapsFolder: string;
  /**
   * Name of the Obsidian keychain secret holding the Anthropic API key
   * (`""` = unset). Only the name is persisted/synced — the key itself lives
   * in the device-local secret storage.
   */
  apiKeySecret: string;
}

export const DEFAULT_SETTINGS: AzerSettings = {
  model: "claude-opus-4-8",
  maxTokens: 4096,
  recapsFolder: "Recaps",
  apiKeySecret: "",
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
    apiKeySecret: coerceSecretName(data.apiKeySecret),
  };
}

/** Per-key coercion of raw values. */
export const SETTING_COERCERS: { [K in keyof AzerSettings]: (value: unknown) => AzerSettings[K] } = {
  model: coerceModel,
  maxTokens: coerceMaxTokens,
  recapsFolder: coerceRecapsFolder,
  apiKeySecret: coerceSecretName,
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

/** Coerce a raw value into a keychain secret name; junk and blanks mean unset. */
export function coerceSecretName(value: unknown): string {
  return coerceTrimmed(value, "");
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

/**
 * Legacy device-local storage key for the Anthropic API key (pre-keychain).
 * Kept only so `migrateApiKeyToSecretStorage` can find and clear old copies.
 */
export const API_KEY_LS_KEY = "azer:anthropic-api-key";

/** The slice of Obsidian's `App` used for device-local storage. */
export interface LocalStorageApp {
  loadLocalStorage(key: string): string | null;
  saveLocalStorage(key: string, value: string | null): void;
}

/**
 * The slice of Obsidian's `SecretStorage` (`app.secretStorage`, 1.11.4+) Azer
 * uses. Secrets live in the device-local keychain, outside the vault, so no
 * vault-sync mechanism copies them.
 */
export interface SecretStorageLike {
  getSecret(id: string): string | null;
  setSecret(id: string, secret: string): void;
}

/**
 * Shared secret name tried first: other AI plugins can reuse the same key,
 * which is the intent of Obsidian's keychain. Must be lowercase
 * alphanumeric/dashes per the SecretStorage id rules.
 */
export const DEFAULT_API_KEY_SECRET = "anthropic";

/** Azer-specific name used when `anthropic` already holds a different key. */
export const FALLBACK_API_KEY_SECRET = "azer-anthropic";

/** The API key named by `name`, or `""` when unset/missing. */
export function resolveApiKey(secrets: SecretStorageLike, name: string): string {
  if (name === "") return "";
  try {
    return secrets.getSecret(name)?.trim() ?? "";
  } catch {
    // getSecret's behavior for malformed ids is unspecified — treat as unset
    // so commands show the "set your key" notice instead of crashing.
    return "";
  }
}

/** Valid SecretStorage id — setSecret throws on anything else. */
const SECRET_ID = /^[a-z0-9-]+$/;

/**
 * One-time migration of the legacy device-local API key into the keychain.
 * Returns the secret name to persist in settings, or null when settings need
 * no change. The plaintext copy is cleared only after the key is safely in
 * the keychain (or deliberately discarded), so a throwing `setSecret` leaves
 * it in place for the next load. When a configured name synced in but its
 * secret is missing on this device — secret values never sync — the legacy
 * key fills it rather than being discarded.
 */
export function migrateApiKeyToSecretStorage(
  local: LocalStorageApp,
  secrets: SecretStorageLike,
  currentName: string,
): string | null {
  const legacy = local.loadLocalStorage(API_KEY_LS_KEY);
  if (typeof legacy !== "string") return null;
  const key = legacy.trim();

  // Discard paths: nothing worth keeping, or this device already has the
  // configured secret (the legacy copy is superseded). Only well-formed
  // names reach getSecret — its behavior for malformed ids is unspecified.
  const validName = currentName !== "" && SECRET_ID.test(currentName);
  if (key === "" || (validName && secrets.getSecret(currentName) !== null)) {
    local.saveLocalStorage(API_KEY_LS_KEY, null);
    return null;
  }

  if (currentName !== "") {
    // Synced-in name, empty local keychain: keep AI working on this device
    // by writing the legacy key under that name (or the fallback when the
    // name isn't a valid secret id).
    const dest = validName ? currentName : FALLBACK_API_KEY_SECRET;
    secrets.setSecret(dest, key);
    local.saveLocalStorage(API_KEY_LS_KEY, null);
    return dest === currentName ? null : dest;
  }

  // No name configured: prefer the shared name so other plugins can reuse
  // the key (adopting it when it already holds this key, padded or not,
  // since resolveApiKey trims on read); otherwise the Azer-specific
  // fallback, where the latest migration wins.
  const shared = secrets.getSecret(DEFAULT_API_KEY_SECRET)?.trim() ?? "";
  const dest = shared === "" || shared === key ? DEFAULT_API_KEY_SECRET : FALLBACK_API_KEY_SECRET;
  if (shared !== key) secrets.setSecret(dest, key);
  local.saveLocalStorage(API_KEY_LS_KEY, null);
  return dest;
}
