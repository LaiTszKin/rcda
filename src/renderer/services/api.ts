import { AppConfig, ChatMessage, AgentResponse } from "@shared/types.ts"

const DEFAULT_RETRY_TIMES = 2
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504])

interface ChatRequestOptions {
  stream?: boolean
  temperature?: number
  maxTokens?: number
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

async function readStreamToText(response: Response): Promise<string> {
  if (!response.body) {
    throw new Error("API 返回格式異常：無法讀取串流內容")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""
  let fullText = ""

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
        return fullText.trim()
      }

      let chunk: any
      try {
        chunk = JSON.parse(data)
      } catch {
        throw new Error("API 返回格式異常：串流片段無法解析")
      }
      const delta = chunk.choices?.[0]?.delta?.content
      if (typeof delta === "string") {
        fullText += delta
      }
    }
  }

  if (fullText.trim()) {
    return fullText.trim()
  }

  throw new Error("API 返回格式異常：串流結果為空")
}

async function requestChatCompletion(
  config: AppConfig,
  messages: ChatMessage[],
  options: ChatRequestOptions,
): Promise<string> {
  const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(buildRequestBody(config, messages, options)),
  })

  if (!response.ok) {
    const error = await parseErrorMessage(response, "API 請求失敗")
    throw new Error(error)
  }

  if (options.stream) {
    return readStreamToText(response)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content?.trim() ?? ""
}

async function requestWithRetry(
  config: AppConfig,
  messages: ChatMessage[],
  options: ChatRequestOptions,
): Promise<string> {
  let attempt = 0

  while (attempt <= DEFAULT_RETRY_TIMES) {
    try {
      return await requestChatCompletion(config, messages, options)
    } catch (error) {
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

export async function callChatAPI(config: AppConfig, messages: ChatMessage[]): Promise<string> {
  const requestMessages: ChatMessage[] = [
    { role: "system", content: config.systemPrompt },
    ...messages,
  ]

  try {
    return await requestWithRetry(config, requestMessages, { stream: true, temperature: 0.7 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const canFallback = message.includes("API 返回格式異常")
    if (!canFallback) {
      throw error
    }

    return requestWithRetry(config, requestMessages, { stream: false, temperature: 0.7 })
  }
}

export function parseAgentResponse(content: string): AgentResponse {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        analysis: parsed.analysis || "",
        optimized_text: parsed.optimized_text || "",
        options: parsed.options || [],
        need_more_info: parsed.need_more_info !== false,
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
  }
}

export async function translateText(config: AppConfig, text: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `請將以下文字翻譯成英文，只返回翻譯結果，不要添加任何解釋或說明：\n\n${text}`,
    },
  ]

  return requestWithRetry(config, messages, {
    stream: false,
    temperature: 0.3,
    maxTokens: 2000,
  })
}
