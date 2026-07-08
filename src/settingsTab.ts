import { type App, PluginSettingTab, Setting } from "obsidian";
import { ALL_TYPES, SCHEMAS } from "./schema/types";
import { DEFAULT_SETTINGS, getApiKey, setApiKey } from "./settings";
import AzerPlugin from "./main";

// Shown as placeholder in the empty custom-types box — mirrors the README example.
const CUSTOM_TYPES_EXAMPLE = `- id: faction            # required, kebab-case, unique, not a built-in id
  label: Faction         # optional; defaults to a Title-Cased id
  folder: Factions       # optional; defaults to the id
  fields:                # optional
    - key: leader        # scalar field (default "")
    - key: goals
      list: true         # list field (default [])
  body: |                # optional starter body
    ## Overview

    ## Members`;

export class AzerSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: AzerPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Anthropic API key")
      .setDesc("Stored only on this device; set it on each machine. Used by the AI table and recap commands.")
      .addText((text) => {
        text.inputEl.type = "password";
        // The key lives in device-local storage (loadLocalStorage), never in
        // synced `data.json`.
        text
          .setPlaceholder("sk-ant-...")
          .setValue(getApiKey(this.app))
          .onChange((value) => setApiKey(this.app, value));
      });

    new Setting(containerEl).setName("Model").setDesc("Anthropic model for AI features.").addText((text) =>
      text.setValue(this.plugin.settings.model).onChange(async (value) => {
        this.plugin.settings.model = value.trim() || DEFAULT_SETTINGS.model;
        await this.plugin.saveSettings();
      }),
    );

    new Setting(containerEl)
      .setName("Max tokens")
      .setDesc("Maximum output tokens per AI request.")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.maxTokens)).onChange(async (value) => {
          const n = Number.parseInt(value, 10);
          this.plugin.settings.maxTokens = Number.isFinite(n) && n > 0 ? n : DEFAULT_SETTINGS.maxTokens;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Recaps folder")
      .setDesc("Folder where AI-generated recap notes are saved.")
      .addText((text) =>
        text.setValue(this.plugin.settings.recapsFolder).onChange(async (value) => {
          this.plugin.settings.recapsFolder = value.trim() || DEFAULT_SETTINGS.recapsFolder;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl).setName("Default folders").setHeading();
    for (const type of ALL_TYPES) {
      new Setting(containerEl).setName(SCHEMAS[type].label).addText((text) =>
        text.setValue(this.plugin.settings.folders[type]).onChange(async (value) => {
          this.plugin.settings.folders[type] = value.trim() || SCHEMAS[type].defaultFolder;
          await this.plugin.saveSettings();
        }),
      );
    }

    new Setting(containerEl).setName("Advanced").setHeading();

    const setting = new Setting(containerEl)
      .setName("Custom note types (YAML)")
      .setDesc(
        'Define extra note types as a YAML list. Each needs a kebab-case id; ' +
          'a new type gets its "New X" command after you reload Obsidian.',
      );

    const status = containerEl.createDiv({ cls: "setting-item-description" });
    const renderStatus = (yaml: string): void => {
      const { types, errors } = AzerPlugin.resolveCustomTypes(yaml);
      status.empty();
      status.createDiv({ text: `${types.length} custom type${types.length === 1 ? "" : "s"} loaded.` });
      for (const err of errors) status.createDiv({ text: err });
    };

    setting.addTextArea((text) => {
      text.setPlaceholder(CUSTOM_TYPES_EXAMPLE);
      text.setValue(this.plugin.settings.customTypesYaml).onChange(async (value) => {
        this.plugin.settings.customTypesYaml = value;
        renderStatus(value);
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 12;
    });
    renderStatus(this.plugin.settings.customTypesYaml);

    // Always-visible annotated example (the placeholder above vanishes once the
    // box has any text), collapsible so it doesn't crowd the tab.
    const example = containerEl.createEl("details", { cls: "setting-item-description" });
    example.createEl("summary", { text: "Example" });
    example.createEl("pre", { text: CUSTOM_TYPES_EXAMPLE });
  }
}
