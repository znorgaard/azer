import { type App, Modal, Setting } from "obsidian";
import { addCampaignField } from "./ui/campaignField";
import { campaignFromPick, type PickerState } from "./campaign";

export interface NewNoteResult {
  name: string;
  campaign: string;
}

/** Prompt for a note name + campaign; resolves to the result, or null if cancelled. */
export function promptForNewNote(
  app: App,
  label: string,
  campaigns: PickerState,
): Promise<NewNoteResult | null> {
  return new Promise((resolve) => {
    new NameModal(app, label, campaigns, resolve).open();
  });
}

class NameModal extends Modal {
  private value = "";
  private getCampaign: () => string = () => "";
  private resolved = false;

  constructor(
    app: App,
    private label: string,
    private campaigns: PickerState,
    private done: (result: NewNoteResult | null) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(`New ${this.label}`);
    new Setting(this.contentEl).setName("Name").addText((text) => {
      text.setPlaceholder(`${this.label} name`).onChange((v) => (this.value = v));
      text.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submit();
      });
      window.setTimeout(() => text.inputEl.focus(), 0);
    });
    this.getCampaign = addCampaignField(this.contentEl, this.campaigns, () => this.submit());
    new Setting(this.contentEl).addButton((btn) =>
      btn
        .setButtonText("Create")
        .setCta()
        .onClick(() => this.submit()),
    );
  }

  private submit(): void {
    if (this.resolved) return;
    const trimmed = this.value.trim();
    if (trimmed === "") return;
    this.resolved = true;
    this.close();
    this.done({ name: trimmed, campaign: campaignFromPick(this.getCampaign()) });
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.resolved) this.done(null);
  }
}
