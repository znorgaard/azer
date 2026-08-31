import { type App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { type AzerSettings, DEFAULT_SETTINGS, SETTING_COERCERS, getApiKey, setApiKey } from "./settings";
import { CONFIG_PATH } from "./schema/loadTypes";
import type AzerPlugin from "./main";

function isSettingsKey(key: string): key is keyof AzerSettings {
  return Object.hasOwn(SETTING_COERCERS, key);
}

/** Row names/descriptions shared by the declarative definitions and the display() fallback. */
const LABELS = {
  apiKey: {
    name: "Anthropic API key",
    desc: "Stored only on this device; set it on each machine. Used by the AI table and recap commands.",
  },
  model: { name: "Model", desc: "Anthropic model for AI features." },
  maxTokens: { name: "Max tokens", desc: "Maximum output tokens per AI request." },
  recapsFolder: { name: "Recaps folder", desc: "Folder where AI-generated recap notes are saved." },
  advanced: "Advanced",
  noteTypes: {
    name: "Note types",
    desc: `Note types and their templates are defined in ${CONFIG_PATH} at your vault root. Edit that file and reload Obsidian to apply changes.`,
  },
} as const;

export class AzerSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: AzerPlugin,
  ) {
    super(app, plugin);
  }

  /**
   * Declarative settings for Obsidian 1.13+, which renders these definitions
   * (skipping display()) and indexes them for settings search.
   */
  getSettingDefinitions(): SettingDefinitionItem<keyof AzerSettings>[] {
    return [
      {
        ...LABELS.apiKey,
        aliases: ["claude", "anthropic"],
        // The key lives in device-local storage, not plugin settings, so it
        // can't be a plain control binding — see renderApiKeyControl.
        render: (setting: Setting) => this.renderApiKeyControl(setting),
      },
      {
        ...LABELS.model,
        control: { type: "text", key: "model", placeholder: DEFAULT_SETTINGS.model },
      },
      {
        ...LABELS.maxTokens,
        control: { type: "number", key: "maxTokens", min: 1, step: 1, defaultValue: DEFAULT_SETTINGS.maxTokens },
      },
      {
        ...LABELS.recapsFolder,
        control: { type: "text", key: "recapsFolder", placeholder: DEFAULT_SETTINGS.recapsFolder },
      },
      {
        type: "group",
        heading: LABELS.advanced,
        items: [
          {
            // Plain-string desc for the search index
            ...LABELS.noteTypes,
            render: (setting: Setting) => void setting.setDesc(this.noteTypesDesc()),
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    return isSettingsKey(key) ? this.plugin.settings[key] : undefined;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (!isSettingsKey(key)) return;
    this.applySetting(key, value);
    await this.plugin.saveSettings();
  }

  /** Coerce and store one settings value; the caller persists. */
  private applySetting<K extends keyof AzerSettings>(key: K, value: unknown): void {
    this.plugin.settings[key] = SETTING_COERCERS[key](value);
  }

  /** Password-style input backed by device-local storage — never synced `data.json`. */
  private renderApiKeyControl(setting: Setting): void {
    setting.addText((text) => {
      text.inputEl.type = "password";
      text
        .setPlaceholder("sk-ant-...")
        .setValue(getApiKey(this.app))
        .onChange((value) => setApiKey(this.app, value));
    });
  }

  private noteTypesDesc(): DocumentFragment {
    const desc = new DocumentFragment();
    desc.appendText("Note types and their templates are defined in ");
    const configLink = desc.createEl("a", { text: CONFIG_PATH, href: "#" });
    configLink.addEventListener("click", (e) => {
      e.preventDefault();
      void this.plugin.openConfigFile();
    });
    desc.appendText(" at your vault root. Edit that file and reload Obsidian to apply changes.");
    return desc;
  }

  /**
   * Imperative fallback for Obsidian < 1.13, which never calls
   * getSettingDefinitions(). Newer versions render the definitions above and
   * skip display() entirely.
   */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.renderApiKeyControl(
      new Setting(containerEl).setName(LABELS.apiKey.name).setDesc(LABELS.apiKey.desc),
    );

    new Setting(containerEl).setName(LABELS.model.name).setDesc(LABELS.model.desc).addText((text) =>
      text.setValue(this.plugin.settings.model).onChange(async (value) => {
        await this.setControlValue("model", value);
      }),
    );

    new Setting(containerEl)
      .setName(LABELS.maxTokens.name)
      .setDesc(LABELS.maxTokens.desc)
      .addText((text) =>
        text.setValue(String(this.plugin.settings.maxTokens)).onChange(async (value) => {
          await this.setControlValue("maxTokens", value);
        }),
      );

    new Setting(containerEl)
      .setName(LABELS.recapsFolder.name)
      .setDesc(LABELS.recapsFolder.desc)
      .addText((text) =>
        text.setValue(this.plugin.settings.recapsFolder).onChange(async (value) => {
          await this.setControlValue("recapsFolder", value);
        }),
      );

    new Setting(containerEl).setName(LABELS.advanced).setHeading();

    new Setting(containerEl).setName(LABELS.noteTypes.name).setDesc(this.noteTypesDesc());
  }
}
