import { type FieldSpec, type TypeSchema } from "./types";
import { AZER_TYPE_KEY } from "./frontmatter";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CustomTypesResult {
  types: TypeSchema[];
  errors: string[];
}

function isMapping(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** "town-guard" -> "Town Guard". */
function labelFromId(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Validate the plain value produced by `parseYaml` into note-type schemas.
 * Resilient: one bad entry (or field) is reported and skipped; the rest load.
 * The Obsidian layer parses YAML and passes the result here so this module
 * stays obsidian-free and unit-testable.
 */
export function validateCustomTypes(parsed: unknown): CustomTypesResult {
  const types: TypeSchema[] = [];
  const errors: string[] = [];
  if (parsed === null || parsed === undefined) return { types, errors };
  if (!Array.isArray(parsed)) {
    errors.push("Custom types must be a YAML list of type entries.");
    return { types, errors };
  }

  const seen = new Set<string>();
  parsed.forEach((entry, i) => {
    if (!isMapping(entry)) {
      errors.push(`Entry ${i + 1}: must be a mapping with an id.`);
      return;
    }
    const rawId = entry.id;
    if (rawId === undefined || rawId === null) {
      errors.push(`Entry ${i + 1}: id is required.`);
      return;
    }
    if (typeof rawId !== "string" || rawId.trim() === "") {
      errors.push(`Entry ${i + 1}: id must be a non-empty string.`);
      return;
    }
    // Trim like label/folder/key so a quoted `id: "faction "` doesn't fail the
    // kebab check with a message that looks like it should have passed.
    const id = rawId.trim();
    if (!KEBAB.test(id)) {
      errors.push(`${id}: id must be kebab-case (lowercase letters, digits, hyphens).`);
      return;
    }
    if (seen.has(id)) {
      errors.push(`${id}: duplicate id.`);
      return;
    }
    seen.add(id);

    // A present-but-wrong-type label/folder/body is a mistake worth surfacing —
    // otherwise it silently falls back and the user wonders where their body went.
    if (entry.label !== undefined && typeof entry.label !== "string") {
      errors.push(`${id}: label must be a string.`);
    }
    if (entry.folder !== undefined && typeof entry.folder !== "string") {
      errors.push(`${id}: folder must be a string.`);
    }
    if (entry.body !== undefined && typeof entry.body !== "string") {
      errors.push(`${id}: body must be a string.`);
    }
    const label = typeof entry.label === "string" && entry.label.trim() !== "" ? entry.label.trim() : labelFromId(id);
    const defaultFolder = typeof entry.folder === "string" && entry.folder.trim() !== "" ? entry.folder.trim() : id;
    const bodyTemplate = typeof entry.body === "string" ? entry.body : "";

    const fields: FieldSpec[] = [];
    const rawFields = entry.fields;
    if (rawFields !== undefined) {
      if (!Array.isArray(rawFields)) {
        errors.push(`${id}: fields must be a list.`);
      } else {
        const seenKeys = new Set<string>();
        rawFields.forEach((f, j) => {
          if (!isMapping(f) || f.key === undefined || f.key === null) {
            errors.push(`${id}: field ${j + 1} needs a key.`);
            return;
          }
          if (typeof f.key !== "string" || f.key.trim() === "") {
            errors.push(`${id}: field ${j + 1} key must be a non-empty string.`);
            return;
          }
          const key = f.key.trim();
          if (key === AZER_TYPE_KEY) {
            errors.push(`${id}: field key "${AZER_TYPE_KEY}" is reserved.`);
            return;
          }
          if (seenKeys.has(key)) {
            errors.push(`${id}: duplicate field key "${key}".`);
            return;
          }
          // Report a present-but-wrong-type `list` like the label/folder/body
          // checks above, so a `list: "true"` string doesn't silently become a
          // scalar; the field is still built (only `list: true` makes a list).
          if (f.list !== undefined && typeof f.list !== "boolean") {
            errors.push(`${id}: field "${key}" list must be true or false.`);
          }
          seenKeys.add(key);
          fields.push({ key, default: f.list === true ? [] : "" });
        });
      }
    }

    types.push({ azerType: id, label, defaultFolder, fields, bodyTemplate });
  });

  return { types, errors };
}
