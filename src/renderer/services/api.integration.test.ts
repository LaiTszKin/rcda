import { afterEach, describe, expect, it, vi } from "vitest"
import { callChatAPI } from "./api"
import { AppConfig } from "@shared/types.ts"

const baseConfig: AppConfig = {
  apiEndpoint: "https://example.com/v1",
  apiKey: "sk-test",
  model: "gpt-4o-mini",
  shortcut: "CommandOrControl+Shift+P",
  autoOpenDevTools: false,
  systemPrompt: "system prompt",
  languagePreference: "system",
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("chat flow integration", () => {
  it("stream 失敗後能回退為非 stream 並拿到內容", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "integration result" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )

    const result = await callChatAPI(baseConfig, [{ role: "user", content: "hello" }])
    expect(result).toBe("integration result")
  })

  it("非 stream 回退遇到長度限制時會繼續拿完整內容", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "first" }, finish_reason: "length" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: " second" }, finish_reason: "stop" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )

    const result = await callChatAPI(baseConfig, [{ role: "user", content: "hello" }])
    expect(result).toBe("first second")
  })
})
