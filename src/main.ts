import { Notice, Plugin } from "obsidian";
import { createTypedNote } from "./commands/newNote";
import { makeObsidianPorts } from "./obsidianPorts";
import { promptForNewNote } from "./nameModal";
import { ALL_TYPES, type AzerType, getSchema } from "./schema/types";
import { AzerSettingTab } from "./settingsTab";
import { type AzerSettings, folderFor, mergeSettings, typeFolderNames } from "./settings";
import type { NotePorts } from "./ports";
import { registerAzerTable } from "./tables/codeBlock";
import { registerAiCommands } from "./commands/aiCommands";
import { campaignContext } from "./campaignScan";
import { campaignPicker, scopedFolder } from "./campaign";

export default class AzerPlugin extends Plugin {
  settings: AzerSettings = mergeSettings(null);
  private ports!: NotePorts;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.ports = makeObsidianPorts(this.app);

    for (const type of ALL_TYPES) {
      const schema = getSchema(type);
      this.addCommand({
        id: `azer-new-${type}`,
        name: `New ${schema.label}`,
        callback: () => void this.newNote(type),
      });
    }

    registerAzerTable(this);
    registerAiCommands(this);

    this.addSettingTab(new AzerSettingTab(this.app, this));
  }

  private async newNote(type: AzerType): Promise<void> {
    const schema = getSchema(type);
    const { refs, activePath } = campaignContext(this.app);
    const state = campaignPicker(refs, activePath, typeFolderNames(this.settings));
    try {
      const result = await promptForNewNote(this.app, schema.label, state);
      if (!result) return;
      const folder = scopedFolder(result.campaign, folderFor(this.settings, type));
      await createTypedNote(this.ports, schema, result.name, folder);
    } catch (err) {
      new Notice(err instanceof Error ? err.message : String(err));
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = mergeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
