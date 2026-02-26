import { afterEach, describe, expect, it, vi } from "vitest"
import { callChatAPI, parseAgentResponse, translateText } from "./api"
import { AppConfig, ChatMessage } from "@shared/types.ts"

const baseConfig: AppConfig = {
  apiEndpoint: "https://example.com/v1",
  apiKey: "sk-test",
  model: "gpt-4o-mini",
  shortcut: "CommandOrControl+Shift+P",
  systemPrompt: "system prompt",
}

afterEach(() => {
  vi.restoreAllMocks()
})

function createStreamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  })
}

describe("parseAgentResponse", () => {
  it("應能解析 JSON 內容", () => {
    const response = parseAgentResponse(
      '{"analysis":"分析","optimized_text":"優化文案","options":[{"id":"1","label":"正式","description":"更正式"}],"need_more_info":false}',
    )

    expect(response.analysis).toBe("分析")
    expect(response.optimized_text).toBe("優化文案")
    expect(response.options).toHaveLength(1)
    expect(response.need_more_info).toBe(false)
    expect(response.no_change).toBe(false)
    expect(response.no_change_reason).toBe("")
  })

  it("缺少 need_more_info 時，若有 optimized_text 應直接視為可確認", () => {
    const response = parseAgentResponse('{"analysis":"分析","optimized_text":"已優化","options":[]}')

    expect(response.optimized_text).toBe("已優化")
    expect(response.need_more_info).toBe(false)
    expect(response.no_change).toBe(false)
  })

  it("缺少 need_more_info 且無 optimized_text 時，應要求更多資訊", () => {
    const response = parseAgentResponse('{"analysis":"分析","options":[]}')

    expect(response.optimized_text).toBe("")
    expect(response.need_more_info).toBe(true)
    expect(response.no_change).toBe(false)
  })

  it("有 no_change_reason 時應回傳不修改資訊", () => {
    const response = parseAgentResponse(
      '{"analysis":"分析","optimized_text":"原文","options":[],"need_more_info":false,"no_change_reason":"語句已完整"}',
    )

    expect(response.no_change).toBe(true)
    expect(response.no_change_reason).toBe("語句已完整")
  })

  it("非 JSON 回應時應回退為純文字結果", () => {
    const content = "這是一段純文字回應"
    const response = parseAgentResponse(content)

    expect(response.analysis).toBe("")
    expect(response.optimized_text).toBe(content)
    expect(response.options).toEqual([])
    expect(response.need_more_info).toBe(false)
    expect(response.no_change).toBe(false)
    expect(response.no_change_reason).toBe("")
  })
})

describe("callChatAPI", () => {
  it("應帶入 system prompt 並解析串流回應", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        createStreamResponse([
          'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
          'data: {"choices":[{"delta":{"content":" World"}}]}\n',
          "data: [DONE]\n",
        ]),
      )

    const messages: ChatMessage[] = [{ role: "user", content: "hello" }]
    const content = await callChatAPI(baseConfig, messages)

    expect(content).toBe("Hello World")
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(requestBody.stream).toBe(true)
    const systemMessage = requestBody.messages[0]
    expect(systemMessage.role).toBe("system")
    expect(systemMessage.content).toContain('"core_guidelines": "system prompt"')

    const wrappedUserMessage = JSON.parse(String(requestBody.messages[1]?.content))
    expect(wrappedUserMessage).toEqual({
      task: "optimize_text",
      text_to_optimize: "hello",
    })
  })

  it("串流失敗時應回退至非串流", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(createStreamResponse(["data: {not-json}\n"], 200))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "fallback ok" } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )

    const content = await callChatAPI(baseConfig, [{ role: "user", content: "x" }])
    expect(content).toBe("fallback ok")
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(secondBody.stream).toBe(false)
  })

  it("可重試狀態碼應自動重試", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        createStreamResponse([
          'data: {"choices":[{"delta":{"content":"retry ok"}}]}\n',
          "data: [DONE]\n",
        ]),
      )

    const content = await callChatAPI(baseConfig, [{ role: "user", content: "retry" }])
    expect(content).toBe("retry ok")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("不可重試錯誤應直接拋出", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: "invalid key" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    )

    await expect(callChatAPI(baseConfig, [])).rejects.toThrow("invalid key")
  })
})

describe("translateText", () => {
  it("翻譯請求會返回文字", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Translated" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const result = await translateText(baseConfig, "測試")
    expect(result).toBe("Translated")
  })
})
