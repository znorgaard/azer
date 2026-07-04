import { planFrontmatter } from "../schema/frontmatter";
import type { TypeSchema } from "../schema/types";
import type { NoteHandle, NotePorts } from "../ports";

/**
 * Create a new typed note: ensure the folder, write the body (a `body` override
 * or the schema's starter template), stamp frontmatter (`azer-type` + defaults),
 * and open it. Refuses to overwrite an existing note (surfacing the native
 * conflict rather than clobbering).
 *
 * `folder` is caller-supplied (e.g. `folderFor(settings, type)`) and assumed
 * valid. If `processFrontmatter` fails after the file is created, the note is
 * left with the body but no frontmatter — the same partially-created state
 * Obsidian itself would leave on a write failure.
 */
export async function createTypedNote(
  ports: NotePorts,
  schema: TypeSchema,
  name: string,
  folder: string,
  body?: string,
): Promise<NoteHandle> {
  const trimmed = name.trim();
  if (trimmed === "") throw new Error("Note name is required");

  const path = `${folder}/${trimmed}.md`;
  if (ports.fileExists(path)) {
    throw new Error(`A note already exists at ${path}`);
  }
  if (!ports.folderExists(folder)) {
    await ports.createFolder(folder);
  }

  const handle = await ports.createFile(path, body ?? schema.bodyTemplate);
  await ports.processFrontmatter(handle, (fm) => {
    Object.assign(fm, planFrontmatter(schema, fm));
  });
  await ports.openFile(handle);
  return handle;
}
