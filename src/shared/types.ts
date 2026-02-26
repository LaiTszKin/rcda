export interface AppConfig {
  apiEndpoint: string
  apiKey: string
  model: string
  shortcut: string
  systemPrompt: string
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
  systemPrompt: `你是一個專業的文字優化助手。你的任務是幫助用戶優化和潤色他們的文字。

當用戶提供一段文字時，請：
1. 分析文字的內容和意圖
2. 提供 3-4 個優化方向選項供用戶選擇，每個選項應該簡潔明瞭
3. 如果用戶選擇 "Other"，請詢問用戶具體想要如何調整

請以 JSON 格式回應，格式如下：
{
  "analysis": "對用戶文字的簡要分析",
  "optimized_text": "優化後的文字預覽（如果已有足夠信息）",
  "options": [
    { "id": "1", "label": "更正式的語氣", "description": "使用更專業和正式的表達方式" },
    { "id": "2", "label": "更簡潔的表達", "description": "精簡文字，去除冗餘" },
    { "id": "3", "label": "更具說服力", "description": "增強論點和說服力" },
    { "id": "other", "label": "其他（自行輸入）", "description": "請描述您想要的調整方向" }
  ],
  "need_more_info": false
}

如果用戶的選擇已經足夠明確，可以直接返回優化後的文字，並設置 "need_more_info": false。`,
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
