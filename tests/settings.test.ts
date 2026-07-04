import { describe, expect, it } from "vitest";
import {
  API_KEY_LS_KEY,
  DEFAULT_SETTINGS,
  folderFor,
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
  it("defaults the model and folders", () => {
    expect(DEFAULT_SETTINGS.model).toBe("claude-opus-4-8");
    expect(DEFAULT_SETTINGS.folders.npc).toBe("NPCs");
    expect(DEFAULT_SETTINGS.folders["adventure-log"]).toBe("Adventure Log");
  });

  it("resolves a folder, honoring overrides", () => {
    expect(folderFor(DEFAULT_SETTINGS, "pc")).toBe("PCs");
    const custom = { ...DEFAULT_SETTINGS, folders: { ...DEFAULT_SETTINGS.folders, pc: "Party" } };
    expect(folderFor(custom, "pc")).toBe("Party");
  });

  it("collects every type folder plus the recaps folder as lower-cased non-campaign names", () => {
    const names = typeFolderNames(DEFAULT_SETTINGS);
    expect(names.has("npcs")).toBe(true);
    expect(names.has("adventure log")).toBe(true);
    expect(names.has("recaps")).toBe(true);
    expect(names.has("NPCs")).toBe(false); // stored lower-cased
    expect(names.has("enyr")).toBe(false);
    // every configured folder is present (lower-cased)
    for (const folder of Object.values(DEFAULT_SETTINGS.folders)) expect(names.has(folder.toLowerCase())).toBe(true);
  });

  it("reduces a multi-segment type folder to its lower-cased first segment", () => {
    const custom = { ...DEFAULT_SETTINGS, folders: { ...DEFAULT_SETTINGS.folders, npc: "Types/NPCs" } };
    const names = typeFolderNames(custom);
    expect(names.has("types")).toBe(true);
    expect(names.has("Types/NPCs")).toBe(false);
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
  it("does not alias DEFAULT_SETTINGS.folders (mutating the result is safe)", () => {
    const s = mergeSettings(null);
    s.folders.npc = "Changed";
    expect(DEFAULT_SETTINGS.folders.npc).toBe("NPCs");
  });

  it("falls back to defaults for null/empty data", () => {
    const s = mergeSettings(null);
    expect(s.model).toBe(DEFAULT_SETTINGS.model);
    expect(s.folders).toEqual(DEFAULT_SETTINGS.folders);
  });

  it("layers saved overrides on top of current defaults", () => {
    const s = mergeSettings({ model: "claude-custom", folders: { pc: "Party" } });
    expect(s.model).toBe("claude-custom");
    expect(s.folders.pc).toBe("Party"); // saved override
    expect(s.folders.npc).toBe("NPCs"); // default retained for unsaved type
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
