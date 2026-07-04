import type { RequestUrlParam } from "obsidian";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";

export interface CompletionRequest {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}

/** Build the Obsidian requestUrl params for a one-shot Anthropic completion. */
export function buildRequest(p: CompletionRequest): RequestUrlParam {
  return {
    url: ANTHROPIC_MESSAGES_URL,
    method: "POST",
    headers: {
      "x-api-key": p.apiKey,
      "anthropic-version": ANTHROPIC_API_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: p.model,
      max_tokens: p.maxTokens,
      system: p.system,
      messages: [{ role: "user", content: p.user }],
      thinking: { type: "adaptive" },
    }),
    throw: false,
  };
}

/** Concatenate the text of every `text` content block in an Anthropic response. */
export function extractText(json: unknown): string {
  const content = (json as { content?: unknown } | null)?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (b): b is { type: "text"; text: string } =>
        typeof b === "object" &&
        b !== null &&
        (b as { type?: unknown }).type === "text" &&
        typeof (b as { text?: unknown }).text === "string",
    )
    .map((b) => b.text)
    .join("")
    .trim();
}
