import { type App, normalizePath, TFile, TFolder } from "obsidian";
import type { NotePorts } from "./ports";

/** Adapt the real Obsidian `App` to the `NotePorts` seam. */
export function makeObsidianPorts(app: App): NotePorts {
  const fileAt = (path: string): TFile | null => {
    const af = app.vault.getAbstractFileByPath(normalizePath(path));
    return af instanceof TFile ? af : null;
  };
  return {
    folderExists(path) {
      return app.vault.getAbstractFileByPath(normalizePath(path)) instanceof TFolder;
    },
    async createFolder(path) {
      // Obsidian throws if the folder already exists; callers
      // (createTypedNote) guard with folderExists first.
      await app.vault.createFolder(normalizePath(path));
    },
    fileExists(path) {
      return fileAt(path) !== null;
    },
    async createFile(path, data) {
      const file = await app.vault.create(normalizePath(path), data);
      return { path: file.path };
    },
    async processFrontmatter(handle, fn) {
      const file = fileAt(handle.path);
      if (!file) throw new Error(`Missing file ${handle.path}`);
      await app.fileManager.processFrontMatter(file, fn);
    },
    async openFile(handle) {
      const file = fileAt(handle.path);
      // Open in a new tab: preserves the user's current view without
      // spawning a fresh split pane on every "New X" command.
      if (file) await app.workspace.getLeaf("tab").openFile(file);
    },
  };
}
