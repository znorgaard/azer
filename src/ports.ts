/** A reference to a note by vault-relative path. */
export interface NoteHandle {
  path: string;
}

/**
 * The single seam between Azer's domain logic and Obsidian. Implemented over
 * the real `App` in `obsidianPorts.ts`, and in-memory in tests (`FakePorts`).
 */
export interface NotePorts {
  folderExists(path: string): boolean;
  createFolder(path: string): Promise<void>;
  fileExists(path: string): boolean;
  createFile(path: string, data: string): Promise<NoteHandle>;
  processFrontmatter(handle: NoteHandle, fn: (fm: Record<string, unknown>) => void): Promise<void>;
  openFile(handle: NoteHandle): Promise<void>;
}
