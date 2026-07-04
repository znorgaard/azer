import type { Complete } from "./client";
import type { AdventureLogNote } from "../notes/adventureLog";

export const RECAP_SYSTEM =
  "You summarize Dungeons & Dragons session notes into a concise bulleted " +
  "key-events reference for the DM.\n" +
  "Use ONLY the session notes provided in the user message. Summarize exactly the " +
  "sessions given — never invent, infer, or add sessions, events, NPCs, locations, " +
  "items, or outcomes that are not explicitly written in those notes. If a note is " +
  "brief, keep its summary brief. Do not use any outside knowledge of published " +
  "Dungeons & Dragons adventures, even if the notes resemble one.\n" +
  "For the content that is present, capture what happened, decisions made, and open " +
  "threads, as Markdown bullet points. No preamble.";

/** Join notes (in the given order) into one block for the model. */
export function formatNotesForRecap(notes: AdventureLogNote[]): string {
  return notes.map((n) => `## ${n.title} (${n.date})\n\n${n.body}`).join("\n\n---\n\n");
}

/**
 * Summarize the given adventure-log notes (expected oldest-first, non-empty —
 * the command guards on "no notes") into a bulleted Markdown recap, grounded
 * strictly in the provided notes (no fabrication; see RECAP_SYSTEM).
 */
export async function recap(complete: Complete, notes: AdventureLogNote[]): Promise<string> {
  const user =
    `Summarize these ${notes.length} session note(s) using only what is written below. ` +
    `Do not add anything that is not present.\n\n${formatNotesForRecap(notes)}`;
  return complete(RECAP_SYSTEM, user);
}
