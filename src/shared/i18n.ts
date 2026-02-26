export type UILanguage = "zh-TW" | "zh-CN" | "en"
export type LanguagePreference = "system" | UILanguage

export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = "system"

export interface UIStrings {
  requestAborted: string
  apiKeyMissing: string
  refineDirectionPrompt: string
  optimizeFailed: string
  noTextToTranslate: string
  translationFailed: string
  saveSettingsFailed: string
  resetPrompt: string
  saveSettings: string
  emptyTitle: string
  emptyDescription: string
  optimizedPreview: string
  confirmAndTranslate: string
  originalText: string
  translatedText: string
  copied: string
  copyOriginal: string
  copyTranslated: string
  newSession: string
  inputPlaceholder: string
  send: string
  setButton: string
  exitButton: string
  apiSettings: string
  shortcutAndPrompt: string
  shortcutLabel: string
  shortcutHint: string
  newSessionHint: string
  autoOpenDevTools: string
  languageLabel: string
  languageSystem: string
  languageZhTw: string
  languageZhCn: string
  languageEn: string
  noChangeReasonDefault: string
  noChangePrefix: string
  selectedPrefix: string
  refinePromptTemplate: string
}

export interface MainStrings {
  trayTooltip: string
  trayShowWindow: string
  traySettings: string
  trayQuit: string
}

const DEFAULT_SYSTEM_PROMPTS: Record<UILanguage, string> = {
  "zh-TW": `你是一個專業的文字優化助手。你的任務是幫助用戶優化和潤色他們的文字。

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
  "zh-CN": `你是一个专业的文字优化助手。你的任务是帮助用户优化和润色他们的文字。

当用户提供一段文字时，请：
1. 分析文字的内容和意图
2. 提供 3-4 个优化方向选项供用户选择，每个选项应简洁明了
3. 如果用户选择 "Other"，请询问用户具体想要如何调整

请以 JSON 格式回应，格式如下：
{
  "analysis": "对用户文字的简要分析",
  "optimized_text": "优化后的文字预览（如果已有足够信息）",
  "options": [
    { "id": "1", "label": "更正式的语气", "description": "使用更专业和正式的表达方式" },
    { "id": "2", "label": "更简洁的表达", "description": "精简文字，去除冗余" },
    { "id": "3", "label": "更具说服力", "description": "增强论点和说服力" },
    { "id": "other", "label": "其他（自行输入）", "description": "请描述您想要的调整方向" }
  ],
  "need_more_info": false
}

如果用户的选择已经足够明确，可以直接返回优化后的文字，并设置 "need_more_info": false。`,
  en: `You are a professional text polishing assistant. Your task is to help users optimize and refine their writing.

When users provide a text, please:
1. Analyze the content and intent
2. Provide 3-4 concise optimization directions for users to choose from
3. If the user selects "Other", ask for the specific adjustment they want

Respond in JSON with this structure:
{
  "analysis": "A short analysis of the text",
  "optimized_text": "A polished preview when enough context is available",
  "options": [
    { "id": "1", "label": "More formal tone", "description": "Use a more professional and formal style" },
    { "id": "2", "label": "More concise writing", "description": "Reduce redundancy and keep it clear" },
    { "id": "3", "label": "More persuasive", "description": "Strengthen the argument and persuasion" },
    { "id": "other", "label": "Other (custom input)", "description": "Describe your preferred adjustment" }
  ],
  "need_more_info": false
}

If the user's intent is clear enough, return the optimized text directly and set "need_more_info" to false.`,
}

const UI_TEXTS: Record<UILanguage, UIStrings> = {
  "zh-TW": {
    requestAborted: "已中止當前請求",
    apiKeyMissing: "尚未配置 API Key，請先到設定頁完成配置",
    refineDirectionPrompt: "請描述你希望調整的方向：",
    optimizeFailed: "優化失敗",
    noTextToTranslate: "沒有可翻譯的文字",
    translationFailed: "翻譯失敗",
    saveSettingsFailed: "保存設定失敗",
    resetPrompt: "重置 Prompt",
    saveSettings: "保存設定",
    emptyTitle: "開始優化文字",
    emptyDescription:
      "輸入文字後按 Enter 發送，Shift+Enter 換行，Esc 可中止請求或收起視窗，CommandOrControl+N 可開新會話。",
    optimizedPreview: "優化預覽：",
    confirmAndTranslate: "確認並翻譯",
    originalText: "原文",
    translatedText: "英文翻譯",
    copied: "已複製",
    copyOriginal: "複製原文",
    copyTranslated: "複製譯文",
    newSession: "新會話",
    inputPlaceholder: "輸入要優化的文字...",
    send: "發送",
    setButton: "SET",
    exitButton: "EXIT",
    apiSettings: "API 設定",
    shortcutAndPrompt: "快捷鍵與 Prompt",
    shortcutLabel: "全局快捷鍵",
    shortcutHint: "點擊輸入框後直接按下組合鍵即可設定（例：CommandOrControl+Shift+P）",
    newSessionHint: "預設新會話快捷鍵：CommandOrControl+N",
    autoOpenDevTools: "啟動時自動開啟 Developer Tools（僅開發模式）",
    languageLabel: "介面語言",
    languageSystem: "跟隨系統",
    languageZhTw: "繁體中文",
    languageZhCn: "簡體中文",
    languageEn: "English",
    noChangeReasonDefault: "原文已足夠清楚，無需進一步調整。",
    noChangePrefix: "未進行修改：",
    selectedPrefix: "已選擇：",
    refinePromptTemplate: "請根據以下方向優化文字：{label}\n\n原文：{text}",
  },
  "zh-CN": {
    requestAborted: "已中止当前请求",
    apiKeyMissing: "尚未配置 API Key，请先到设置页完成配置",
    refineDirectionPrompt: "请描述你希望调整的方向：",
    optimizeFailed: "优化失败",
    noTextToTranslate: "没有可翻译的文字",
    translationFailed: "翻译失败",
    saveSettingsFailed: "保存设置失败",
    resetPrompt: "重置 Prompt",
    saveSettings: "保存设置",
    emptyTitle: "开始优化文字",
    emptyDescription:
      "输入文字后按 Enter 发送，Shift+Enter 换行，Esc 可中止请求或收起窗口，CommandOrControl+N 可开新会话。",
    optimizedPreview: "优化预览：",
    confirmAndTranslate: "确认并翻译",
    originalText: "原文",
    translatedText: "英文翻译",
    copied: "已复制",
    copyOriginal: "复制原文",
    copyTranslated: "复制译文",
    newSession: "新会话",
    inputPlaceholder: "输入要优化的文字...",
    send: "发送",
    setButton: "SET",
    exitButton: "EXIT",
    apiSettings: "API 设置",
    shortcutAndPrompt: "快捷键与 Prompt",
    shortcutLabel: "全局快捷键",
    shortcutHint: "点击输入框后直接按下组合键即可设置（例：CommandOrControl+Shift+P）",
    newSessionHint: "默认新会话快捷键：CommandOrControl+N",
    autoOpenDevTools: "启动时自动开启 Developer Tools（仅开发模式）",
    languageLabel: "界面语言",
    languageSystem: "跟随系统",
    languageZhTw: "繁體中文",
    languageZhCn: "简体中文",
    languageEn: "English",
    noChangeReasonDefault: "原文已经足够清楚，无需进一步调整。",
    noChangePrefix: "未进行修改：",
    selectedPrefix: "已选择：",
    refinePromptTemplate: "请根据以下方向优化文字：{label}\n\n原文：{text}",
  },
  en: {
    requestAborted: "Current request aborted",
    apiKeyMissing: "API key is not configured yet. Please complete setup in settings.",
    refineDirectionPrompt: "Describe the adjustment direction you want:",
    optimizeFailed: "Optimization failed",
    noTextToTranslate: "No text available for translation",
    translationFailed: "Translation failed",
    saveSettingsFailed: "Failed to save settings",
    resetPrompt: "Reset Prompt",
    saveSettings: "Save Settings",
    emptyTitle: "Start polishing text",
    emptyDescription:
      "Type text and press Enter to send, Shift+Enter for newline, Esc to abort/hide, CommandOrControl+N to start a new session.",
    optimizedPreview: "Optimization preview:",
    confirmAndTranslate: "Confirm and Translate",
    originalText: "Original",
    translatedText: "English Translation",
    copied: "Copied",
    copyOriginal: "Copy Original",
    copyTranslated: "Copy Translation",
    newSession: "New Session",
    inputPlaceholder: "Enter text to optimize...",
    send: "Send",
    setButton: "SET",
    exitButton: "EXIT",
    apiSettings: "API Settings",
    shortcutAndPrompt: "Shortcut & Prompt",
    shortcutLabel: "Global Shortcut",
    shortcutHint:
      "Click the field and press your key combo directly (e.g. CommandOrControl+Shift+P).",
    newSessionHint: "Default new session shortcut: CommandOrControl+N",
    autoOpenDevTools: "Auto-open Developer Tools on launch (dev mode only)",
    languageLabel: "Interface Language",
    languageSystem: "Follow System",
    languageZhTw: "Traditional Chinese",
    languageZhCn: "Simplified Chinese",
    languageEn: "English",
    noChangeReasonDefault:
      "The original text is already clear enough and needs no further changes.",
    noChangePrefix: "No edits made:",
    selectedPrefix: "Selected:",
    refinePromptTemplate:
      "Please optimize the text with this direction: {label}\n\nOriginal: {text}",
  },
}

const MAIN_TEXTS: Record<UILanguage, MainStrings> = {
  "zh-TW": {
    trayTooltip: "Text Polish Agent",
    trayShowWindow: "顯示視窗",
    traySettings: "設定",
    trayQuit: "退出",
  },
  "zh-CN": {
    trayTooltip: "Text Polish Agent",
    trayShowWindow: "显示窗口",
    traySettings: "设置",
    trayQuit: "退出",
  },
  en: {
    trayTooltip: "Text Polish Agent",
    trayShowWindow: "Show Window",
    traySettings: "Settings",
    trayQuit: "Quit",
  },
}

export function resolveLanguage(preference: LanguagePreference, locale: string): UILanguage {
  if (preference !== "system") {
    return preference
  }

  const normalized = locale.toLowerCase()
  if (
    normalized.startsWith("zh-hant") ||
    normalized.startsWith("zh-tw") ||
    normalized.startsWith("zh-hk")
  ) {
    return "zh-TW"
  }

  if (normalized.startsWith("zh")) {
    return "zh-CN"
  }

  return "en"
}

export function getDefaultSystemPrompt(language: UILanguage): string {
  return DEFAULT_SYSTEM_PROMPTS[language]
}

export function getUIStrings(language: UILanguage): UIStrings {
  return UI_TEXTS[language]
}

export function getMainStrings(language: UILanguage): MainStrings {
  return MAIN_TEXTS[language]
}
