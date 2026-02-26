import { DEFAULT_LANGUAGE_PREFERENCE, LanguagePreference, getDefaultSystemPrompt } from "./i18n"

export interface AppConfig {
  apiEndpoint: string
  apiKey: string
  model: string
  shortcut: string
  systemPrompt: string
  autoOpenDevTools: boolean
  languagePreference: LanguagePreference
}

export interface SaveConfigResult {
  ok: boolean
  error?: string
}

export const DEFAULT_CONFIG: AppConfig = {
  apiEndpoint: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  shortcut: "CommandOrControl+Shift+P",
  autoOpenDevTools: false,
  languagePreference: DEFAULT_LANGUAGE_PREFERENCE,
  systemPrompt: getDefaultSystemPrompt("zh-TW"),
}

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface AgentOption {
  id: string
  label: string
  description: string
}

export interface AgentResponse {
  analysis: string
  optimized_text: string
  options: AgentOption[]
  need_more_info: boolean
  no_change: boolean
  no_change_reason: string
}
