import { type App, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_SETTINGS, getApiKey, setApiKey } from "./settings";
import { CONFIG_PATH } from "./schema/loadTypes";
import type AzerPlugin from "./main";

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

    new Setting(containerEl).setName("Advanced").setHeading();

    new Setting(containerEl)
      .setName("Note types")
      .setDesc(
        `Note types and their templates are defined in ${CONFIG_PATH} at your vault root. ` +
          "Edit that file and reload Obsidian to apply changes.",
      );
  }
}
