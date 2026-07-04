import { describe, expect, it } from "vitest";
import { buildRequest, extractText } from "../src/ai/request";

const base = { apiKey: "sk-ant-x", model: "claude-opus-4-8", system: "S", user: "U", maxTokens: 4096 };

describe("buildRequest", () => {
  it("targets the messages endpoint with the required headers", () => {
    const r = buildRequest(base);
    expect(r.url).toBe("https://api.anthropic.com/v1/messages");
    expect(r.method).toBe("POST");
    expect(r.headers).toMatchObject({
      "x-api-key": "sk-ant-x",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    });
    expect(r.throw).toBe(false);
  });

  it("sends model, system, user message, adaptive thinking, and max_tokens — never budget_tokens", () => {
    const body = JSON.parse(buildRequest(base).body as string);
    expect(body).toMatchObject({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: "S",
      messages: [{ role: "user", content: "U" }],
      thinking: { type: "adaptive" },
    });
    expect(body).not.toHaveProperty("thinking.budget_tokens");
    expect(JSON.stringify(body)).not.toContain("budget_tokens");
  });
});

describe("extractText", () => {
  it("concatenates text blocks and ignores non-text blocks", () => {
    const json = { content: [{ type: "thinking", thinking: "..." }, { type: "text", text: "Hello " }, { type: "text", text: "world" }] };
    expect(extractText(json)).toBe("Hello world");
  });

  it("returns empty string for missing/non-array/empty content", () => {
    expect(extractText({})).toBe("");
    expect(extractText({ content: "nope" })).toBe("");
    expect(extractText(null)).toBe("");
    expect(extractText(undefined)).toBe("");
    expect(extractText({ content: [] })).toBe("");
  });

  it("trims the combined text", () => {
    expect(extractText({ content: [{ type: "text", text: "  spaced  " }] })).toBe("spaced");
  });
});
