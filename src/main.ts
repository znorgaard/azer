import { Notice, Plugin, TFile, normalizePath } from "obsidian";
import { createTypedNote } from "./commands/newNote";
import { makeObsidianPorts } from "./obsidianPorts";
import { promptForNewNote } from "./nameModal";
import type { TypeSchema } from "./schema/types";
import { CONFIG_PATH, loadNoteTypes } from "./schema/loadTypes";
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
    this.ports = makeObsidianPorts(this.app);

    registerAzerTable(this);
    registerAiCommands(this);
    this.addSettingTab(new AzerSettingTab(this.app, this));

    // Resolving note types reads azer.yaml, but the vault file index isn't
    // reliably populated during onload — getAbstractFileByPath can return null
    // for an existing file, sending loadNoteTypes down the seed path where
    // create() throws "already exists" and every "New X" command is lost. Defer
    // to onLayoutReady, when the index is ready (fires immediately if already).
    this.app.workspace.onLayoutReady(() => void this.registerNoteTypes());
  }

  /** Resolve note types from azer.yaml and register a "New X" command per type. */
  private async registerNoteTypes(): Promise<void> {
    const { schemas, errors } = await loadNoteTypes(this.app);
    this.schemas = schemas;
    if (errors.length > 0) {
      console.warn(`Azer: ${errors.length} issue(s) in azer.yaml:`, errors);
      const frag = new DocumentFragment();
      frag.appendText(`Azer: ${errors.length} issue(s) in `);
      const link = frag.createEl("a", { text: CONFIG_PATH, href: "#" });
      link.addEventListener("click", (e) => {
        e.preventDefault();
        void this.openConfigFile();
      });
      frag.appendText(" — open it to fix (details in the developer console).");
      new Notice(frag, 15000);
    }

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
  }

  /**
   * Open `azer.yaml` in a new tab. Obsidian's editor is Markdown-only, so a
   * YAML-editor community plugin renders it in-app; otherwise Obsidian hands it
   * to the default app. Called from the settings link and the error notice.
   */
  async openConfigFile(): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(normalizePath(CONFIG_PATH));
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf("tab").openFile(file);
    } else {
      new Notice(`${CONFIG_PATH} not found in this vault.`);
    }
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
