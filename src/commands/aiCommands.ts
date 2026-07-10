import { type App, Modal, Notice, type RequestUrlParam, Setting, requestUrl } from "obsidian";
import { AIError, type Complete, type FetchResult, complete } from "../ai/client";
import { fencedAzerTable, generateTable } from "../ai/generateTable";
import { recap } from "../ai/recap";
import { type AdventureLogNote, forCampaign, selectForRecap, stripFrontmatter } from "../notes/adventureLog";
import { createTypedNote } from "./newNote";
import { makeObsidianPorts } from "../obsidianPorts";
import { getApiKey } from "../settings";
import { AZER_TYPE_KEY } from "../schema/frontmatter";
import type { NotePorts } from "../ports";
import type AzerPlugin from "../main";
import { campaignContext } from "../campaignScan";
import { type PickerState, campaignFromPick, campaignPicker, scopedFolder } from "../campaign";
import { addCampaignField } from "../ui/campaignField";

/** Adapt Obsidian's requestUrl to the client's Fetcher. */
async function obsidianFetch(req: RequestUrlParam): Promise<FetchResult> {
  const res = await requestUrl(req);
  // `res.json` is a getter that throws on a non-JSON body (e.g. an HTML 5xx from
  // a proxy). Read it defensively so the HTTP status still surfaces as an
  // "Anthropic API <status>" error rather than being mis-reported as a network error.
  let json: unknown = null;
  try {
    json = res.json;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

export function registerAiCommands(plugin: AzerPlugin): void {
  // Reads apiKey/model/maxTokens fresh on every call (inside the closure).
  const ask: Complete = (system, user) =>
    complete(obsidianFetch, {
      apiKey: getApiKey(plugin.app),
      model: plugin.settings.model,
      system,
      user,
      maxTokens: plugin.settings.maxTokens,
    });

  const requireKey = (): boolean => {
    if (getApiKey(plugin.app).trim() === "") {
      new Notice("Set your Anthropic API key in Azer settings to use AI features.");
      return false;
    }
    return true;
  };

  plugin.addCommand({
    id: "generate-table",
    name: "Generate Table (AI)",
    callback: () => {
      if (!requireKey()) return;
      const { refs, activePath } = campaignContext(plugin.app);
      const state = campaignPicker(refs, activePath, plugin.folderExclusions());
      promptForTable(plugin.app, state, async ({ name, prompt, campaign }) => {
        const notice = new Notice("Generating table…", 0);
        try {
          const body = fencedAzerTable(await generateTable(ask, prompt));
          const ports = makeObsidianPorts(plugin.app);
          const schema = plugin.tableSchema();
          const folder = scopedFolder(campaign, schema.defaultFolder);
          await createTypedNote(ports, schema, name, folder, body);
        } catch (err) {
          new Notice(err instanceof AIError ? err.message : String(err));
        } finally {
          notice.hide();
        }
      });
    },
  });

  plugin.addCommand({
    id: "recap-sessions",
    name: "Recap Recent Sessions (AI)",
    callback: () => {
      if (!requireKey()) return;
      const { refs, activePath } = campaignContext(plugin.app);
      const exclude = plugin.folderExclusions();
      const state = campaignPicker(refs, activePath, exclude);
      promptForRecap(plugin.app, state, async ({ count, campaign }) => {
        const all = await gatherAdventureLog(plugin.app);
        const selected = selectForRecap(forCampaign(all, campaign, exclude), count);
        if (selected.length === 0) {
          new Notice("No Adventure Log notes found to recap.");
          return;
        }
        const notice = new Notice("Generating recap…", 0);
        try {
          const summary = await recap(ask, selected);
          const ports = makeObsidianPorts(plugin.app);
          const folder = scopedFolder(campaign, plugin.settings.recapsFolder);
          if (!ports.folderExists(folder)) await ports.createFolder(folder);
          const title = `Recap ${selected[0].date} to ${selected[selected.length - 1].date}`;
          const handle = await ports.createFile(uniqueNotePath(ports, folder, title), summary);
          await ports.openFile(handle);
        } catch (err) {
          new Notice(err instanceof AIError ? err.message : String(err));
        } finally {
          notice.hide();
        }
      });
    },
  });
}

/** A vault path under `folder` for `title` that doesn't collide (suffixes " 2", " 3", …). */
function uniqueNotePath(ports: NotePorts, folder: string, title: string): string {
  let path = `${folder}/${title}.md`;
  for (let i = 2; ports.fileExists(path); i++) {
    path = `${folder}/${title} ${i}.md`;
  }
  return path;
}

async function gatherAdventureLog(app: App): Promise<AdventureLogNote[]> {
  const out: AdventureLogNote[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    if (fm?.[AZER_TYPE_KEY] !== "adventure-log") continue;
    const raw = await app.vault.cachedRead(file);
    out.push({
      title: file.basename,
      date: typeof fm.date === "string" ? fm.date : "",
      body: stripFrontmatter(raw),
      path: file.path,
    });
  }
  return out;
}

function promptForTable(
  app: App,
  campaigns: PickerState,
  done: (v: { name: string; prompt: string; campaign: string }) => void | Promise<void>,
): void {
  new TablePromptModal(app, campaigns, done).open();
}

class TablePromptModal extends Modal {
  private name = "";
  private prompt = "";
  private getCampaign: () => string = () => "";
  constructor(
    app: App,
    private campaigns: PickerState,
    private done: (v: { name: string; prompt: string; campaign: string }) => void | Promise<void>,
  ) {
    super(app);
  }
  onOpen(): void {
    this.titleEl.setText("Generate Table (AI)");
    new Setting(this.contentEl).setName("Table name").addText((t) => {
      t.onChange((v) => (this.name = v));
      window.setTimeout(() => t.inputEl.focus(), 0);
    });
    new Setting(this.contentEl).setName("Describe the table").addTextArea((t) => t.onChange((v) => (this.prompt = v)));
    this.getCampaign = addCampaignField(this.contentEl, this.campaigns);
    new Setting(this.contentEl).addButton((b) =>
      b
        .setButtonText("Generate")
        .setCta()
        .onClick(() => {
          if (this.name.trim() === "" || this.prompt.trim() === "") return;
          this.close();
          void this.done({ name: this.name.trim(), prompt: this.prompt.trim(), campaign: campaignFromPick(this.getCampaign()) });
        }),
    );
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

function promptForRecap(
  app: App,
  campaigns: PickerState,
  done: (v: { count: number; campaign: string }) => void | Promise<void>,
): void {
  new RecapModal(app, campaigns, done).open();
}

class RecapModal extends Modal {
  private count = 3;
  private getCampaign: () => string = () => "";
  constructor(
    app: App,
    private campaigns: PickerState,
    private done: (v: { count: number; campaign: string }) => void | Promise<void>,
  ) {
    super(app);
  }
  onOpen(): void {
    this.titleEl.setText("Recap Recent Sessions (AI)");
    new Setting(this.contentEl).setName("How many recent sessions?").addText((t) => {
      t.setValue(String(this.count)).onChange((v) => {
        const n = Number.parseInt(v, 10);
        if (Number.isFinite(n) && n >= 1) this.count = n;
      });
      window.setTimeout(() => t.inputEl.focus(), 0);
    });
    this.getCampaign = addCampaignField(this.contentEl, this.campaigns);
    new Setting(this.contentEl).addButton((b) =>
      b
        .setButtonText("Recap")
        .setCta()
        .onClick(() => {
          this.close();
          void this.done({ count: this.count, campaign: campaignFromPick(this.getCampaign()) });
        }),
    );
  }
  onClose(): void {
    this.contentEl.empty();
  }
}
