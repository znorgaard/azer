import { Setting } from "obsidian";

/** Monotonic suffix for datalist element ids — collision-free and deterministic. */
let datalistSeq = 0;

/**
 * Add a "Campaign" combo box to a modal body: a text input backed by a
 * `<datalist>` of `state.options`, preset to `state.selected`, that also
 * accepts a typed-in new campaign name. Returns a getter for the current
 * trimmed value. `onEnter`, when provided, fires on Enter in the field.
 */
export function addCampaignField(
  containerEl: HTMLElement,
  state: { readonly options: readonly string[]; readonly selected: string },
  onEnter?: () => void,
): () => string {
  let value = state.selected;
  new Setting(containerEl).setName("Campaign").addText((text) => {
    text.setPlaceholder("Campaign (new or existing)").setValue(state.selected).onChange((v) => (value = v));
    const listId = `azer-campaigns-${datalistSeq++}`;
    const datalist = createEl("datalist", { attr: { id: listId } });
    for (const opt of state.options) {
      datalist.createEl("option", { value: opt });
    }
    text.inputEl.setAttribute("list", listId);
    text.inputEl.insertAdjacentElement("afterend", datalist);
    if (onEnter) {
      text.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") onEnter();
      });
    }
  });
  return () => value.trim();
}
