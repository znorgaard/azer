import { ALL_TYPES, type FieldSpec, type TypeSchema } from "./types";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BUILT_IN: ReadonlySet<string> = new Set(ALL_TYPES);

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
    const id = entry.id;
    if (typeof id !== "string" || id.trim() === "") {
      errors.push(`Entry ${i + 1}: id is required.`);
      return;
    }
    if (!KEBAB.test(id)) {
      errors.push(`${id}: id must be kebab-case (lowercase letters, digits, hyphens).`);
      return;
    }
    if (BUILT_IN.has(id)) {
      errors.push(`${id}: id clashes with a built-in type.`);
      return;
    }
    if (seen.has(id)) {
      errors.push(`${id}: duplicate id.`);
      return;
    }
    seen.add(id);

    const label = typeof entry.label === "string" && entry.label.trim() !== "" ? entry.label : labelFromId(id);
    const defaultFolder = typeof entry.folder === "string" && entry.folder.trim() !== "" ? entry.folder : id;
    const bodyTemplate = typeof entry.body === "string" ? entry.body : "";

    const fields: FieldSpec[] = [];
    const rawFields = entry.fields;
    if (rawFields !== undefined) {
      if (!Array.isArray(rawFields)) {
        errors.push(`${id}: fields must be a list.`);
      } else {
        rawFields.forEach((f, j) => {
          if (!isMapping(f) || typeof f.key !== "string" || f.key.trim() === "") {
            errors.push(`${id}: field ${j + 1} needs a key.`);
            return;
          }
          fields.push({ key: f.key, default: f.list === true ? [] : "" });
        });
      }
    }

    types.push({ azerType: id, label, defaultFolder, fields, bodyTemplate });
  });

  return { types, errors };
}
