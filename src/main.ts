import { Notice, Plugin } from "obsidian";
import { createTypedNote } from "./commands/newNote";
import { makeObsidianPorts } from "./obsidianPorts";
import { promptForNewNote } from "./nameModal";
import type { TypeSchema } from "./schema/types";
import { loadNoteTypes } from "./schema/loadTypes";
import { TABLE_SCHEMA } from "./schema/defaultTypes";
import { AzerSettingTab } from "./settingsTab";
import { type AzerSettings, mergeSettings, typeFolderNames } from "./settings";
import type { NotePorts } from "./ports";
import { registerAzerTable } from "./tables/codeBlock";
import { registerAiCommands } from "./commands/aiCommands";
import { campaignContext } from "./campaignScan";
import { campaignPicker, scopedFolder } from "./campaign";

export default class AzerPlugin extends Plugin {
  settings: AzerSettings = mergeSettings(null);
  /** All note types, resolved from azer.yaml on load. */
  private schemas: TypeSchema[] = [];
  private ports!: NotePorts;

  async onload(): Promise<void> {
    await this.loadSettings();
    const { schemas, errors } = await loadNoteTypes(this.app);
    this.schemas = schemas;
    if (errors.length > 0) {
      console.warn(`Azer: ${errors.length} issue(s) in azer.yaml:`, errors);
      new Notice(`Azer: ${errors.length} issue(s) in azer.yaml — open it to fix (details in the developer console).`);
    }
    this.ports = makeObsidianPorts(this.app);

    // ponytail: type commands are registered here, so a newly added type gets
    // its "New X" command only after the next reload. Live re-registration
    // would need Obsidian's private app.commands API — not worth the review risk.
    for (const schema of this.schemas) {
      this.addCommand({
        id: `new-${schema.azerType}`,
        name: `New ${schema.label}`,
        callback: () => void this.newNote(schema),
      });
    }

    registerAzerTable(this);
    registerAiCommands(this);

    this.addSettingTab(new AzerSettingTab(this.app, this));
  }

  /** The `table` schema from azer.yaml, or the hardcoded fallback if deleted. */
  tableSchema(): TypeSchema {
    return this.schemas.find((s) => s.azerType === "table") ?? TABLE_SCHEMA;
  }

  /** Lower-cased folder names Azer owns — excluded from the campaign picker. */
  folderExclusions(): ReadonlySet<string> {
    // Include the table fallback folder so a vault that deleted the `table` type
    // (Generate Table still writes there via TABLE_SCHEMA) doesn't surface
    // Tables/ as a campaign. tableSchema() de-dupes when the entry is present.
    return typeFolderNames([
      ...this.schemas.map((s) => s.defaultFolder),
      this.tableSchema().defaultFolder,
      this.settings.recapsFolder,
    ]);
  }

  private async newNote(schema: TypeSchema): Promise<void> {
    const { refs, activePath } = campaignContext(this.app);
    const state = campaignPicker(refs, activePath, this.folderExclusions());
    try {
      const result = await promptForNewNote(this.app, schema.label, state);
      if (!result) return;
      const folder = scopedFolder(result.campaign, schema.defaultFolder);
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
