import { describe, expect, it } from "vitest";
import {
  API_KEY_LS_KEY,
  DEFAULT_API_KEY_SECRET,
  DEFAULT_SETTINGS,
  FALLBACK_API_KEY_SECRET,
  coerceMaxTokens,
  coerceModel,
  coerceRecapsFolder,
  coerceSecretName,
  mergeSettings,
  migrateApiKeyToSecretStorage,
  resolveApiKey,
  typeFolderNames,
  type LocalStorageApp,
  type SecretStorageLike,
} from "../src/settings";

class FakeLocalStorageApp implements LocalStorageApp {
  store = new Map<string, string>();
  loadLocalStorage(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  saveLocalStorage(key: string, value: string | null): void {
    if (value === null) this.store.delete(key);
    else this.store.set(key, value);
  }
}

class FakeSecretStorage implements SecretStorageLike {
  secrets = new Map<string, string>();
  getSecret(id: string): string | null {
    return this.secrets.has(id) ? (this.secrets.get(id) as string) : null;
  }
  setSecret(id: string, secret: string): void {
    this.secrets.set(id, secret);
  }
}

describe("settings", () => {
  it("defaults to sensible values", () => {
    expect(DEFAULT_SETTINGS.model).toBe("claude-opus-4-8");
    expect(DEFAULT_SETTINGS.maxTokens).toBe(4096);
    expect(DEFAULT_SETTINGS.recapsFolder).toBe("Recaps");
  });

  it("collects folder names as lower-cased first path segments", () => {
    const names = typeFolderNames(["NPCs", "Types/Factions", "Recaps"]);
    expect(names.has("npcs")).toBe(true);
    expect(names.has("types")).toBe(true); // nested "Types/Factions" reduces to "Types"
    expect(names.has("factions")).toBe(false);
    expect(names.has("recaps")).toBe(true);
  });

  it("ignores blank folder segments", () => {
    expect(typeFolderNames(["", "  ", "/leading"]).size).toBe(0);
  });

  it("resolves the API key from the named secret", () => {
    const secrets = new FakeSecretStorage();
    secrets.setSecret("anthropic", "  sk-ant-123  ");
    expect(resolveApiKey(secrets, "anthropic")).toBe("sk-ant-123"); // trimmed
    expect(resolveApiKey(secrets, "missing")).toBe("");
    expect(resolveApiKey(secrets, "")).toBe("");
  });

  it("treats a throwing secret lookup as unset instead of crashing the command", () => {
    const secrets = new FakeSecretStorage();
    secrets.getSecret = () => {
      throw new Error("malformed id");
    };
    expect(resolveApiKey(secrets, "My Key!")).toBe("");
  });
});

describe("migrateApiKeyToSecretStorage", () => {
  it("does nothing when there is no legacy key", () => {
    const local = new FakeLocalStorageApp();
    const secrets = new FakeSecretStorage();
    expect(migrateApiKeyToSecretStorage(local, secrets, "")).toBeNull();
    expect(secrets.secrets.size).toBe(0);
  });

  it("moves the legacy key into the shared secret and clears the plaintext copy", () => {
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "sk-ant-legacy");
    const secrets = new FakeSecretStorage();
    expect(migrateApiKeyToSecretStorage(local, secrets, "")).toBe(DEFAULT_API_KEY_SECRET);
    expect(secrets.getSecret(DEFAULT_API_KEY_SECRET)).toBe("sk-ant-legacy");
    expect(local.store.has(API_KEY_LS_KEY)).toBe(false);
  });

  it("adopts the shared secret name when it already holds the same key", () => {
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "sk-ant-same");
    const secrets = new FakeSecretStorage();
    secrets.setSecret(DEFAULT_API_KEY_SECRET, "sk-ant-same");
    expect(migrateApiKeyToSecretStorage(local, secrets, "")).toBe(DEFAULT_API_KEY_SECRET);
    expect(local.store.has(API_KEY_LS_KEY)).toBe(false);
  });

  it("adopts the shared name even when its stored value is whitespace-padded", () => {
    // resolveApiKey trims on read, so a padded copy is the same key.
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "sk-ant-same");
    const secrets = new FakeSecretStorage();
    secrets.setSecret(DEFAULT_API_KEY_SECRET, "  sk-ant-same  ");
    expect(migrateApiKeyToSecretStorage(local, secrets, "")).toBe(DEFAULT_API_KEY_SECRET);
    expect(secrets.getSecret(FALLBACK_API_KEY_SECRET)).toBeNull(); // no duplicate
  });

  it("treats a blank shared secret as free", () => {
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "sk-ant-new");
    const secrets = new FakeSecretStorage();
    secrets.setSecret(DEFAULT_API_KEY_SECRET, "   ");
    expect(migrateApiKeyToSecretStorage(local, secrets, "")).toBe(DEFAULT_API_KEY_SECRET);
    expect(secrets.getSecret(DEFAULT_API_KEY_SECRET)).toBe("sk-ant-new");
  });

  it("uses the fallback name when the shared secret holds a different key", () => {
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "sk-ant-mine");
    const secrets = new FakeSecretStorage();
    secrets.setSecret(DEFAULT_API_KEY_SECRET, "sk-ant-other-plugins");
    expect(migrateApiKeyToSecretStorage(local, secrets, "")).toBe(FALLBACK_API_KEY_SECRET);
    expect(secrets.getSecret(DEFAULT_API_KEY_SECRET)).toBe("sk-ant-other-plugins"); // untouched
    expect(secrets.getSecret(FALLBACK_API_KEY_SECRET)).toBe("sk-ant-mine");
  });

  it("discards the legacy copy when the configured secret exists on this device", () => {
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "sk-ant-stale");
    const secrets = new FakeSecretStorage();
    secrets.setSecret("my-key", "sk-ant-current");
    expect(migrateApiKeyToSecretStorage(local, secrets, "my-key")).toBeNull();
    expect(local.store.has(API_KEY_LS_KEY)).toBe(false);
    expect(secrets.getSecret("my-key")).toBe("sk-ant-current"); // untouched
  });

  it("fills a synced-in name whose secret is missing on this device", () => {
    // Settings (and so the secret NAME) sync via data.json; the secret VALUE
    // is device-local. The legacy key is this device's only working copy.
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "sk-ant-local");
    const secrets = new FakeSecretStorage();
    expect(migrateApiKeyToSecretStorage(local, secrets, "my-key")).toBeNull();
    expect(secrets.getSecret("my-key")).toBe("sk-ant-local");
    expect(local.store.has(API_KEY_LS_KEY)).toBe(false);
  });

  it("routes to the fallback name when the configured name is not a valid secret id", () => {
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "sk-ant-local");
    const secrets = new FakeSecretStorage();
    expect(migrateApiKeyToSecretStorage(local, secrets, "My Key!")).toBe(FALLBACK_API_KEY_SECRET);
    expect(secrets.getSecret(FALLBACK_API_KEY_SECRET)).toBe("sk-ant-local");
  });

  it("keeps the plaintext copy when writing the secret throws", () => {
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "sk-ant-precious");
    const secrets = new FakeSecretStorage();
    secrets.setSecret = () => {
      throw new Error("keychain unavailable");
    };
    expect(() => migrateApiKeyToSecretStorage(local, secrets, "")).toThrow();
    expect(local.store.get(API_KEY_LS_KEY)).toBe("sk-ant-precious"); // retried next load
  });

  it("clears a blank legacy value without creating a secret", () => {
    const local = new FakeLocalStorageApp();
    local.saveLocalStorage(API_KEY_LS_KEY, "   ");
    const secrets = new FakeSecretStorage();
    expect(migrateApiKeyToSecretStorage(local, secrets, "")).toBeNull();
    expect(local.store.has(API_KEY_LS_KEY)).toBe(false);
    expect(secrets.secrets.size).toBe(0);
  });
});

describe("mergeSettings", () => {
  it("merges persisted values over defaults without shared mutable state", () => {
    const s = mergeSettings({ model: "claude-sonnet-5", recapsFolder: "Logs/Recaps" });
    expect(s.model).toBe("claude-sonnet-5");
    expect(s.recapsFolder).toBe("Logs/Recaps");
    expect(s.maxTokens).toBe(DEFAULT_SETTINGS.maxTokens); // default retained
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("coerces invalid persisted values instead of loading them verbatim", () => {
    // data.json can be hand-edited, sync-conflicted, or from another version.
    const s = mergeSettings({ model: null, maxTokens: "abc", recapsFolder: 7 });
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings({ maxTokens: -5 }).maxTokens).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(mergeSettings({ model: "  spaced  " }).model).toBe("spaced");
    expect(mergeSettings({ maxTokens: "8000" }).maxTokens).toBe(8000);
  });

  it("drops unknown keys from persisted data", () => {
    const s = mergeSettings({ model: "m", legacyField: true });
    expect(Object.keys(s).sort()).toEqual(["apiKeySecret", "maxTokens", "model", "recapsFolder"]);
  });

  it("carries the configured API-key secret name, defaulting to unset", () => {
    expect(mergeSettings(null).apiKeySecret).toBe("");
    expect(mergeSettings({ apiKeySecret: " anthropic " }).apiKeySecret).toBe("anthropic");
    expect(mergeSettings({ apiKeySecret: 7 }).apiKeySecret).toBe("");
  });
});

describe("setting coercers", () => {
  it("trims the model and falls back to the default when emptied", () => {
    expect(coerceModel("  claude-sonnet-5  ")).toBe("claude-sonnet-5");
    expect(coerceModel("")).toBe(DEFAULT_SETTINGS.model);
    expect(coerceModel("   ")).toBe(DEFAULT_SETTINGS.model);
    expect(coerceModel(undefined)).toBe(DEFAULT_SETTINGS.model);
    expect(coerceModel(42)).toBe(DEFAULT_SETTINGS.model);
  });

  it("accepts positive integers for max tokens, from numbers or strings", () => {
    expect(coerceMaxTokens(8000)).toBe(8000);
    expect(coerceMaxTokens("8000")).toBe(8000);
    expect(coerceMaxTokens(1)).toBe(1);
  });

  it("truncates fractional max tokens like the old parseInt path", () => {
    expect(coerceMaxTokens(3.7)).toBe(3);
    expect(coerceMaxTokens("3.7")).toBe(3);
  });

  it("falls back to the default max tokens for zero, negatives, and junk", () => {
    expect(coerceMaxTokens(0)).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(coerceMaxTokens(-5)).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(coerceMaxTokens(0.5)).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(coerceMaxTokens(Number.NaN)).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(coerceMaxTokens(Number.POSITIVE_INFINITY)).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(coerceMaxTokens("abc")).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(coerceMaxTokens("")).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(coerceMaxTokens(undefined)).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(coerceMaxTokens(null)).toBe(DEFAULT_SETTINGS.maxTokens);
  });

  it("trims the recaps folder and falls back to the default when emptied", () => {
    expect(coerceRecapsFolder("  Logs/Recaps  ")).toBe("Logs/Recaps");
    expect(coerceRecapsFolder("")).toBe(DEFAULT_SETTINGS.recapsFolder);
    expect(coerceRecapsFolder(undefined)).toBe(DEFAULT_SETTINGS.recapsFolder);
  });

  it("trims the secret name and treats junk as unset", () => {
    expect(coerceSecretName("  anthropic  ")).toBe("anthropic");
    expect(coerceSecretName("")).toBe("");
    expect(coerceSecretName(undefined)).toBe("");
    expect(coerceSecretName(42)).toBe("");
  });
});

describe("AI settings", () => {
  it("defaults maxTokens to 4096 and recapsFolder to Recaps", () => {
    expect(DEFAULT_SETTINGS.maxTokens).toBe(4096);
    expect(DEFAULT_SETTINGS.recapsFolder).toBe("Recaps");
  });

  it("mergeSettings keeps the new fields and honors overrides", () => {
    expect(mergeSettings(null).maxTokens).toBe(4096);
    expect(mergeSettings(null).recapsFolder).toBe("Recaps");
    const merged = mergeSettings({ maxTokens: 8000, recapsFolder: "Summaries" });
    expect(merged.maxTokens).toBe(8000);
    expect(merged.recapsFolder).toBe("Summaries");
  });
});
