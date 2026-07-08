import { parseYaml } from "obsidian";
import { type CustomTypesResult, validateCustomTypes } from "./customTypes";

/**
 * Parse the raw YAML block and validate it into note-type schemas, turning a
 * parse throw into one error. This is the Obsidian-facing wrapper (it imports
 * `parseYaml`); the pure validation lives in `customTypes.ts`.
 */
export function resolveCustomTypes(yaml: string): CustomTypesResult {
  try {
    return validateCustomTypes(parseYaml(yaml));
  } catch (e) {
    return { types: [], errors: [e instanceof Error ? e.message : String(e)] };
  }
}
