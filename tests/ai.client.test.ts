import { describe, expect, it } from "vitest";
import { AIError, complete, type Fetcher } from "../src/ai/client";

const params = { apiKey: "k", model: "claude-opus-4-8", system: "S", user: "U", maxTokens: 4096 };
const fetcherReturning = (status: number, json: unknown): Fetcher => () => Promise.resolve({ status, json });

describe("complete", () => {
  it("returns the model text on a 2xx response", async () => {
    const fetch = fetcherReturning(200, { content: [{ type: "text", text: "the answer" }] });
    expect(await complete(fetch, params)).toBe("the answer");
  });

  it("throws AIError with status and API message on a non-2xx", async () => {
    const fetch = fetcherReturning(401, { error: { type: "authentication_error", message: "invalid x-api-key" } });
    const err = await complete(fetch, params).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AIError);
    expect((err as Error).message).toMatch(/401.*invalid x-api-key/);
  });

  it("wraps a fetcher (network) error as AIError", async () => {
    const fetch: Fetcher = () => Promise.reject(new Error("ENOTFOUND"));
    await expect(complete(fetch, params)).rejects.toThrow(AIError);
    await expect(complete(fetch, params)).rejects.toThrow(/Network error: ENOTFOUND/);
  });

  it("falls back to a generic message when the error body has none", async () => {
    const fetch = fetcherReturning(500, {});
    await expect(complete(fetch, params)).rejects.toThrow(/500: request failed/);
  });

  it("throws AIError when the response has no text", async () => {
    const fetch = fetcherReturning(200, { content: [{ type: "thinking", thinking: "..." }] });
    await expect(complete(fetch, params)).rejects.toThrow(/Empty response/);
  });

  it("passes the built request to the fetcher", async () => {
    let seenUrl = "";
    const fetch: Fetcher = (req) => {
      seenUrl = req.url;
      return Promise.resolve({ status: 200, json: { content: [{ type: "text", text: "ok" }] } });
    };
    await complete(fetch, params);
    expect(seenUrl).toBe("https://api.anthropic.com/v1/messages");
  });
});
