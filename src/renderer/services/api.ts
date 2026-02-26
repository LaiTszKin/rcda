import { AppConfig, ChatMessage, AgentResponse } from "@shared/types.ts"

const DEFAULT_RETRY_TIMES = 2
const MAX_CONTINUATION_ROUNDS = 3
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504])

interface ChatRequestOptions {
  stream?: boolean
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

interface ParsedNoChangePayload {
  no_change: boolean
  reason: string
}

interface ChatCompletionResult {
  content: string
  finishReason: string | null
}

function buildSystemPromptEnvelope(systemPrompt: string): string {
  return JSON.stringify(
    {
      prompt_type: "text_polish_core_instructions",
      core_guidelines: systemPrompt,
      output_contract: {
        format: "json",
        required_fields: ["analysis", "optimized_text", "options", "need_more_info"],
        optional_fields: ["no_change_reason"],
      },
      no_change_rule:
        "若內容無需修改，需說明 no_change_reason，optimized_text 保持原文，並設置 need_more_info 為 false",
    },
    null,
    2,
  )
}

function buildUserMessageEnvelope(content: string): string {
  return JSON.stringify(
    {
      task: "optimize_text",
      text_to_optimize: content,
    },
    null,
    2,
  )
}

function buildContinuationMessageEnvelope(): string {
  return JSON.stringify(
    {
      task: "continue_output",
      instruction: "請延續上一段輸出並僅返回尚未輸出的內容，不要重複已輸出段落。",
    },
    null,
    2,
  )
}

function parseNoChangePayload(parsed: any): ParsedNoChangePayload {
  const noChangeReason = typeof parsed.no_change_reason === "string" ? parsed.no_change_reason.trim() : ""
  const noChange = typeof parsed.no_change === "boolean" ? parsed.no_change : noChangeReason.length > 0

  return {
    no_change: noChange,
    reason: noChangeReason,
  }
}

function buildRequestBody(config: AppConfig, messages: ChatMessage[], options: ChatRequestOptions) {
  return {
    model: config.model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
    stream: options.stream ?? false,
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetry(status: number): boolean {
  return RETRYABLE_STATUS.has(status)
}

async function parseErrorMessage(response: Response, fallbackPrefix: string): Promise<string> {
  const payload = await response.json().catch(() => ({}) as { error?: { message?: string } })

  return payload.error?.message ?? `${fallbackPrefix}: ${response.status}`
}

async function readStreamToText(response: Response): Promise<ChatCompletionResult> {
  if (!response.body) {
    throw new Error("API 返回格式異常：無法讀取串流內容")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""
  let fullText = ""
  let finishReason: string | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data:")) {
        continue
      }

      const data = trimmed.slice(5).trim()
      if (data === "[DONE]") {
        return {
          content: fullText.trim(),
          finishReason,
        }
      }

      let chunk: any
      try {
        chunk = JSON.parse(data)
      } catch {
        throw new Error("API 返回格式異常：串流片段無法解析")
      }
      const choice = chunk.choices?.[0]
      const delta = choice?.delta?.content
      if (typeof choice?.finish_reason === "string") {
        finishReason = choice.finish_reason
      }
      if (typeof delta === "string") {
        fullText += delta
      }
    }
  }

  if (fullText.trim()) {
    return {
      content: fullText.trim(),
      finishReason,
    }
  }

  throw new Error("API 返回格式異常：串流結果為空")
}

async function requestChatCompletion(
  config: AppConfig,
  messages: ChatMessage[],
  options: ChatRequestOptions,
): Promise<ChatCompletionResult> {
  const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(buildRequestBody(config, messages, options)),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await parseErrorMessage(response, "API 請求失敗")
    throw new Error(error)
  }

  if (options.stream) {
    return readStreamToText(response)
  }

  const data = await response.json()
  const choice = data.choices?.[0]

  return {
    content: typeof choice?.message?.content === "string" ? choice.message.content : "",
    finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

async function requestWithRetry(
  config: AppConfig,
  messages: ChatMessage[],
  options: ChatRequestOptions,
): Promise<ChatCompletionResult> {
  let attempt = 0

  while (attempt <= DEFAULT_RETRY_TIMES) {
    try {
      return await requestChatCompletion(config, messages, options)
    } catch (error) {
      if (isAbortError(error)) {
        throw error
      }

      attempt += 1
      const message = error instanceof Error ? error.message : "未知錯誤"
      const matchedStatus = message.match(/\b(\d{3})\b/)
      const status = matchedStatus ? Number(matchedStatus[1]) : undefined

      if (!status || !shouldRetry(status) || attempt > DEFAULT_RETRY_TIMES) {
        throw new Error(message)
      }

      await sleep(300 * attempt)
    }
  }

  throw new Error("API 請求失敗")
}

async function requestWithContinuation(
  config: AppConfig,
  messages: ChatMessage[],
  options: ChatRequestOptions,
  continuationMessage: ChatMessage,
): Promise<string> {
  let requestMessages = [...messages]
  let output = ""
  let rounds = 0

  while (rounds <= MAX_CONTINUATION_ROUNDS) {
    const result = await requestWithRetry(config, requestMessages, options)
    output += result.content

    if (result.finishReason !== "length") {
      return output.trim()
    }

    requestMessages = [
      ...requestMessages,
      { role: "assistant", content: result.content },
      continuationMessage,
    ]
    rounds += 1
  }

  return output.trim()
}

export async function callChatAPI(
  config: AppConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const normalizedMessages = messages.map((message) => {
    if (message.role !== "user") {
      return message
    }

    return {
      ...message,
      content: buildUserMessageEnvelope(message.content),
    }
  })

  const requestMessages: ChatMessage[] = [
    { role: "system", content: buildSystemPromptEnvelope(config.systemPrompt) },
    ...normalizedMessages,
  ]

  const continuationMessage: ChatMessage = {
    role: "user",
    content: buildContinuationMessageEnvelope(),
  }

  try {
    return await requestWithContinuation(
      config,
      requestMessages,
      { stream: true, temperature: 0.7, signal },
      continuationMessage,
    )
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    const message = error instanceof Error ? error.message : ""
    const canFallback = message.includes("API 返回格式異常")
    if (!canFallback) {
      throw error
    }

    return requestWithContinuation(
      config,
      requestMessages,
      { stream: false, temperature: 0.7, signal },
      continuationMessage,
    )
  }
}

export function parseAgentResponse(content: string): AgentResponse {
  const normalized = content.trim()

  try {
    const fencedMatch = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
    const jsonContent = fencedMatch ? fencedMatch[1] : normalized
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const hasOptimizedText = typeof parsed.optimized_text === "string" && !!parsed.optimized_text.trim()
      const needMoreInfo =
        typeof parsed.need_more_info === "boolean" ? parsed.need_more_info : !hasOptimizedText
      const noChange = parseNoChangePayload(parsed)

      return {
        analysis: parsed.analysis || "",
        optimized_text: parsed.optimized_text || "",
        options: parsed.options || [],
        need_more_info: needMoreInfo,
        no_change: noChange.no_change,
        no_change_reason: noChange.reason,
      }
    }
  } catch (error) {
    console.error("Failed to parse agent response:", error)
  }

  return {
    analysis: "",
    optimized_text: content,
    options: [],
    need_more_info: false,
    no_change: false,
    no_change_reason: "",
  }
}

export async function translateText(
  config: AppConfig,
  text: string,
  signal?: AbortSignal,
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `請將以下文字翻譯成英文，只返回翻譯結果，不要添加任何解釋或說明：\n\n${text}`,
    },
  ]

  return requestWithContinuation(
    config,
    messages,
    {
      stream: false,
      temperature: 0.3,
      maxTokens: 2000,
      signal,
    },
    {
      role: "user",
      content: "請接續上一段翻譯並只返回尚未完成的內容，不要重複。",
    },
  )
}
