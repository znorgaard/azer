import { describe, expect, it } from "vitest";
import {
  VAULT_ROOT_LABEL,
  campaignFromPick,
  campaignOf,
  campaignPicker,
  detectCampaigns,
  effectiveCampaign,
  pickerState,
  scopedFolder,
} from "../src/campaign";

describe("campaignOf", () => {
  it("returns the first segment of a nested path", () => {
    expect(campaignOf("Enyr/NPCs/Sildar.md")).toBe("Enyr");
  });
  it("returns the campaign for a one-level-nested path", () => {
    expect(campaignOf("Enyr/Quests.md")).toBe("Enyr");
  });
  it("returns null for a root-level file", () => {
    expect(campaignOf("Quests.md")).toBeNull();
  });
  it("returns null for an empty string", () => {
    expect(campaignOf("")).toBeNull();
  });
});

describe("detectCampaigns", () => {
  it("returns distinct top-level folders with azer notes, sorted case-insensitively", () => {
    const refs = [
      { path: "Zephria/PCs/Ajax.md" },
      { path: "Enyr/NPCs/Bob.md" },
      { path: "Enyr/NPCs/Carl.md" },
    ];
    expect(detectCampaigns(refs)).toEqual(["Enyr", "Zephria"]);
  });
  it("ignores root-level azer notes", () => {
    expect(detectCampaigns([{ path: "Loose.md" }])).toEqual([]);
  });
  it("returns empty for no notes", () => {
    expect(detectCampaigns([])).toEqual([]);
  });
  it("excludes configured type folders so a flat vault yields no campaigns", () => {
    const refs = [{ path: "NPCs/Sildar.md" }, { path: "Sessions/One.md" }, { path: "Enyr/NPCs/Bob.md" }];
    expect(detectCampaigns(refs, new Set(["npcs", "sessions"]))).toEqual(["Enyr"]);
  });
});

describe("effectiveCampaign", () => {
  it("returns the first segment for a note under a real campaign", () => {
    expect(effectiveCampaign("Enyr/NPCs/Sildar.md")).toBe("Enyr");
  });
  it("returns the vault root for a root-level note", () => {
    expect(effectiveCampaign("Quests.md")).toBe("");
  });
  it("returns the vault root for a note under an excluded type folder (flat vault)", () => {
    expect(effectiveCampaign("Adventure Log/S1.md", new Set(["adventure log"]))).toBe("");
  });
  it("keeps a real campaign when the exclude set doesn't match its first segment", () => {
    expect(effectiveCampaign("Enyr/NPCs/Bob.md", new Set(["npcs"]))).toBe("Enyr");
  });
  it("matches the exclude set case-insensitively (on-disk case differs from setting)", () => {
    // exclude holds lower-cased names; an on-disk "NPCS/" or "Npcs/" still excludes
    expect(effectiveCampaign("NPCS/Sildar.md", new Set(["npcs"]))).toBe("");
    expect(effectiveCampaign("Npcs/Sildar.md", new Set(["npcs"]))).toBe("");
  });
});

describe("scopedFolder", () => {
  it("prefixes the type folder with the campaign", () => {
    expect(scopedFolder("Enyr", "NPCs")).toBe("Enyr/NPCs");
  });
  it("returns the bare type folder for a blank campaign", () => {
    expect(scopedFolder("", "NPCs")).toBe("NPCs");
    expect(scopedFolder("   ", "NPCs")).toBe("NPCs");
  });
  it("normalizes stray slashes and whitespace", () => {
    expect(scopedFolder(" Enyr/ ", "/NPCs")).toBe("Enyr/NPCs");
  });
  it("returns the campaign alone when the type folder is blank", () => {
    expect(scopedFolder("Enyr", "")).toBe("Enyr");
    expect(scopedFolder("Enyr", "  ")).toBe("Enyr");
  });
  it("drops '.' and '..' segments so a typed campaign can't escape the vault", () => {
    expect(scopedFolder("../../Foo", "NPCs")).toBe("Foo/NPCs");
    expect(scopedFolder("Enyr/../Zephria", "NPCs")).toBe("Enyr/Zephria/NPCs");
    expect(scopedFolder(".", "NPCs")).toBe("NPCs");
  });
});

describe("pickerState", () => {
  it("leads the options with the vault-root entry and preselects the active campaign", () => {
    expect(pickerState(["Enyr", "Zephria"], "Zephria/PCs/Ajax.md")).toEqual({
      options: [VAULT_ROOT_LABEL, "Enyr", "Zephria"],
      selected: "Zephria",
    });
  });
  it("adds the active campaign when not already detected", () => {
    expect(pickerState(["Enyr"], "Mistholt/NPCs/X.md")).toEqual({
      options: [VAULT_ROOT_LABEL, "Enyr", "Mistholt"],
      selected: "Mistholt",
    });
  });
  it("defaults to vault root when no note is open", () => {
    expect(pickerState(["Enyr", "Zephria"], null)).toEqual({
      options: [VAULT_ROOT_LABEL, "Enyr", "Zephria"],
      selected: VAULT_ROOT_LABEL,
    });
  });
  it("defaults to vault root for a root-level active file", () => {
    expect(pickerState(["Enyr"], "Loose.md")).toEqual({
      options: [VAULT_ROOT_LABEL, "Enyr"],
      selected: VAULT_ROOT_LABEL,
    });
  });
  it("offers only the vault-root entry when nothing is detected and no note is open", () => {
    expect(pickerState([], null)).toEqual({ options: [VAULT_ROOT_LABEL], selected: VAULT_ROOT_LABEL });
  });
  it("discovers the campaign from the active path alone when detected is empty", () => {
    expect(pickerState([], "Enyr/NPCs/Sildar.md")).toEqual({
      options: [VAULT_ROOT_LABEL, "Enyr"],
      selected: "Enyr",
    });
  });
  it("sorts options regardless of detected input order", () => {
    expect(pickerState(["Zephria", "Enyr"], null)).toEqual({
      options: [VAULT_ROOT_LABEL, "Enyr", "Zephria"],
      selected: VAULT_ROOT_LABEL,
    });
  });
  it("does not preselect an active note that sits in an excluded type folder", () => {
    expect(pickerState([], "NPCs/Sildar.md", new Set(["npcs"]))).toEqual({
      options: [VAULT_ROOT_LABEL],
      selected: VAULT_ROOT_LABEL,
    });
  });
  it("never lists the vault-root sentinel twice when a folder is literally named it", () => {
    expect(pickerState([VAULT_ROOT_LABEL], null)).toEqual({
      options: [VAULT_ROOT_LABEL],
      selected: VAULT_ROOT_LABEL,
    });
  });
});

describe("campaignPicker", () => {
  it("detects + builds picker state, excluding type folders everywhere (flat vault near-miss)", () => {
    const refs = [{ path: "NPCs/Sildar.md" }, { path: "Enyr/NPCs/Bob.md" }];
    // active note sits in the NPCs type folder, which is excluded
    expect(campaignPicker(refs, "NPCs/Sildar.md", new Set(["npcs"]))).toEqual({
      options: [VAULT_ROOT_LABEL, "Enyr"],
      selected: VAULT_ROOT_LABEL,
    });
  });
});

describe("campaignFromPick", () => {
  it("maps the vault-root label (trimmed) to a blank campaign", () => {
    expect(campaignFromPick(VAULT_ROOT_LABEL)).toBe("");
    expect(campaignFromPick(`  ${VAULT_ROOT_LABEL}  `)).toBe("");
  });
  it("maps a blank entry to a blank campaign", () => {
    expect(campaignFromPick("")).toBe("");
    expect(campaignFromPick("   ")).toBe("");
  });
  it("keeps a plain campaign name", () => {
    expect(campaignFromPick("Enyr")).toBe("Enyr");
  });
  it("reduces a multi-segment entry to its first segment", () => {
    expect(campaignFromPick("Enyr/Sub")).toBe("Enyr");
  });
  it("sanitizes traversal segments", () => {
    expect(campaignFromPick("../../Foo")).toBe("Foo");
  });
});
