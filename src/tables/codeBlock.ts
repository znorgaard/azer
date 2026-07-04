import { MarkdownRenderChild, MarkdownRenderer, type Plugin } from "obsidian";
import { azerTableMarkdown } from "./markdown";

/**
 * Register the `azer-table` code-block processor. It builds the lookup (or a
 * warning callout) as Markdown and lets Obsidian render it — giving native
 * table styling and clickable `[[links]]` in result cells for free.
 */
export function registerAzerTable(plugin: Plugin): void {
  plugin.registerMarkdownCodeBlockProcessor("azer-table", (source, el, ctx) => {
    const child = new MarkdownRenderChild(el);
    ctx.addChild(child);
    return MarkdownRenderer.render(plugin.app, azerTableMarkdown(source), el, ctx.sourcePath, child);
  });
}
