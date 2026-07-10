import { type App, TFile, normalizePath, parseYaml } from "obsidian";
import { validateCustomTypes } from "./customTypes";
import { DEFAULT_TYPES_YAML } from "./defaultTypes";
import type { TypeSchema } from "./types";

/** Vault-relative path of the note-types config file. */
export const CONFIG_PATH = "azer.yaml";

/**
 * Read and validate the note types defined in `azer.yaml` at the vault root.
 * If the file is absent, seed it with DEFAULT_TYPES_YAML first (deleting the
 * file resets to defaults). A parse throw becomes a single error; an empty
 * list is respected as "no note types". Obsidian-facing (imports `obsidian`),
 * so it is not unit-tested — the pure validation lives in `customTypes.ts`.
 */
export async function loadNoteTypes(app: App): Promise<{ schemas: TypeSchema[]; errors: string[] }> {
  const path = normalizePath(CONFIG_PATH);
  let raw: string;
  try {
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      raw = await app.vault.read(existing);
    } else {
      await app.vault.create(path, DEFAULT_TYPES_YAML);
      raw = DEFAULT_TYPES_YAML;
    }
  } catch (e) {
    return { schemas: [], errors: [e instanceof Error ? e.message : String(e)] };
  }

  try {
    const { types, errors } = validateCustomTypes(parseYaml(raw));
    return { schemas: types, errors };
  } catch (e) {
    return { schemas: [], errors: [e instanceof Error ? e.message : String(e)] };
  }
}
