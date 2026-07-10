import { describe, expect, it } from "vitest";
import {
  API_KEY_LS_KEY,
  DEFAULT_SETTINGS,
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
