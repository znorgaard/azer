import type { TypeSchema } from "./types";

export const AZER_TYPE_KEY = "azer-type";

/**
 * Compute the frontmatter keys to assign for a note of `schema`'s type.
 *
 * Always sets `azer-type` to the schema's value (authoritative discriminator).
 * Adds each schema field at its default ONLY if the key is absent from
 * `existing`, so hand-authored values are never overwritten on convert.
 * Array defaults are returned as fresh copies.
 *
 * @example
 *   // Merge into a note's existing frontmatter — existing fields survive:
 *   Object.assign(fm, planFrontmatter(schema, fm));
 */
export function planFrontmatter(
  schema: TypeSchema,
  existing: Record<string, unknown> = {},
): Record<string, unknown> {
  const additions: Record<string, unknown> = { [AZER_TYPE_KEY]: schema.azerType };
  for (const field of schema.fields) {
    if (!Object.hasOwn(existing, field.key)) {
      additions[field.key] = typeof field.default === "string" ? field.default : [...field.default];
    }
  }
  return additions;
}
