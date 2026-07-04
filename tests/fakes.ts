import type { NoteHandle, NotePorts } from "../src/ports";

interface FakeFile {
  body: string;
  fm: Record<string, unknown>;
}

export class FakePorts implements NotePorts {
  folders = new Set<string>();
  files = new Map<string, FakeFile>();
  opened: string[] = [];

  folderExists(path: string): boolean {
    return this.folders.has(path);
  }
  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
  }
  fileExists(path: string): boolean {
    return this.files.has(path);
  }
  async createFile(path: string, data: string): Promise<NoteHandle> {
    this.files.set(path, { body: data, fm: {} });
    return { path };
  }
  async processFrontmatter(
    handle: NoteHandle,
    fn: (fm: Record<string, unknown>) => void,
  ): Promise<void> {
    const file = this.files.get(handle.path);
    if (!file) throw new Error(`Missing file ${handle.path}`);
    fn(file.fm);
  }
  async openFile(handle: NoteHandle): Promise<void> {
    this.opened.push(handle.path);
  }
}
