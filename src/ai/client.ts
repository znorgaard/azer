import type { RequestUrlParam } from "obsidian";
import { buildRequest, type CompletionRequest, extractText } from "./request";

/** Any AI request failure (HTTP error, empty response, network). */
export class AIError extends Error {}

export interface FetchResult {
  status: number;
  json: unknown;
}

/** The HTTP transport: in the plugin it wraps Obsidian's `requestUrl`. */
export type Fetcher = (req: RequestUrlParam) => Promise<FetchResult>;

/** A bound completion call used by the features (apiKey/model/maxTokens fixed). */
export type Complete = (system: string, user: string) => Promise<string>;

/** Run one completion through the injected fetcher; throw AIError on failure. */
export async function complete(fetcher: Fetcher, p: CompletionRequest): Promise<string> {
  let res: FetchResult;
  try {
    res = await fetcher(buildRequest(p));
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new AIError(`Network error: ${detail}`, { cause });
  }
  if (res.status < 200 || res.status >= 300) {
    throw new AIError(`Anthropic API ${res.status}: ${shortMessage(res.json)}`);
  }
  const text = extractText(res.json);
  if (!text) throw new AIError("Empty response from the model.");
  return text;
}

function shortMessage(json: unknown): string {
  const msg = (json as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof msg === "string" ? msg : "request failed";
}
