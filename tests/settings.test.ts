import { describe, expect, it } from "vitest";
import {
  API_KEY_LS_KEY,
  DEFAULT_SETTINGS,
  coerceMaxTokens,
  coerceModel,
  coerceRecapsFolder,
  getApiKey,
  mergeSettings,
  setApiKey,
  typeFolderNames,
  type LocalStorageApp,
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

  it("returns empty string when no API key is set", () => {
    expect(getApiKey(new FakeLocalStorageApp())).toBe("");
  });

  it("stores a trimmed API key and reads it back", () => {
    const app = new FakeLocalStorageApp();
    setApiKey(app, "  sk-ant-123  ");
    expect(getApiKey(app)).toBe("sk-ant-123");
  });

  it("clears the key when set to blank", () => {
    const app = new FakeLocalStorageApp();
    setApiKey(app, "sk-ant-123");
    setApiKey(app, "   ");
    expect(getApiKey(app)).toBe("");
    expect(app.store.has(API_KEY_LS_KEY)).toBe(false);
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
    expect(Object.keys(s).sort()).toEqual(["maxTokens", "model", "recapsFolder"]);
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
