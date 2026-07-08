import { Notice, Plugin, parseYaml } from "obsidian";
import { createTypedNote } from "./commands/newNote";
import { makeObsidianPorts } from "./obsidianPorts";
import { promptForNewNote } from "./nameModal";
import { ALL_TYPES, getSchema, type TypeSchema } from "./schema/types";
import { type CustomTypesResult, validateCustomTypes } from "./schema/customTypes";
import { AzerSettingTab } from "./settingsTab";
import { type AzerSettings, folderFor, mergeSettings, typeFolderNames } from "./settings";
import type { NotePorts } from "./ports";
import { registerAzerTable } from "./tables/codeBlock";
import { registerAiCommands } from "./commands/aiCommands";
import { campaignContext } from "./campaignScan";
import { campaignPicker, scopedFolder } from "./campaign";

export default class AzerPlugin extends Plugin {
  settings: AzerSettings = mergeSettings(null);
  /** Resolved user-defined types; rebuilt from settings on load. */
  customSchemas: TypeSchema[] = [];
  private ports!: NotePorts;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.customSchemas = AzerPlugin.resolveCustomTypes(this.settings.customTypesYaml).types;
    this.ports = makeObsidianPorts(this.app);

    // ponytail: custom-type commands are registered here, so a newly added type
    // gets its "New X" command only after the next reload. Live re-registration
    // would need Obsidian's private app.commands API — not worth the review risk.
    const schemas: TypeSchema[] = [...ALL_TYPES.map(getSchema), ...this.customSchemas];
    for (const schema of schemas) {
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

  /** Parse + validate the YAML block, turning a parse throw into one error. */
  static resolveCustomTypes(yaml: string): CustomTypesResult {
    try {
      return validateCustomTypes(parseYaml(yaml));
    } catch (e) {
      return { types: [], errors: [e instanceof Error ? e.message : String(e)] };
    }
  }

  /** Folders owned by custom types — excluded from the campaign picker. */
  customFolders(): string[] {
    return this.customSchemas.map((s) => s.defaultFolder);
  }

  private async newNote(schema: TypeSchema): Promise<void> {
    const { refs, activePath } = campaignContext(this.app);
    const state = campaignPicker(refs, activePath, typeFolderNames(this.settings, this.customFolders()));
    try {
      const result = await promptForNewNote(this.app, schema.label, state);
      if (!result) return;
      const folder = scopedFolder(result.campaign, folderFor(this.settings, schema));
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
