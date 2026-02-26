import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { DEFAULT_CONFIG, AgentOption, ChatMessage } from "@shared/types.ts"
import { callChatAPI, parseAgentResponse, translateText } from "./services/api"
import { useConfigStore, useDialogStore, useUIStore } from "./stores"

interface SettingsDraft {
  apiEndpoint: string
  apiKey: string
  model: string
  shortcut: string
  systemPrompt: string
}

function LoadingDots() {
  return (
    <div className="loading">
      <div className="loading-dots">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
    </div>
  )
}

export default function App() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { config, isLoaded, loadConfig, saveConfig } = useConfigStore()
  const {
    stage,
    messages,
    currentInput,
    options,
    optimizedText,
    translatedText,
    isLoading,
    error,
    setCurrentInput,
    addMessage,
    setOptions,
    setOptimizedText,
    setTranslatedText,
    setStage,
    setLoading,
    setError,
    reset,
  } = useDialogStore()
  const {
    showSettings,
    copiedOriginal,
    copiedTranslated,
    setShowSettings,
    setCopiedOriginal,
    setCopiedTranslated,
  } = useUIStore()

  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(config)

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  useEffect(() => {
    setSettingsDraft(config)
  }, [config])

  useEffect(() => {
    const cleanupWindowShown = window.electronAPI.onWindowShown(() => {
      setTimeout(() => inputRef.current?.focus(), 50)
    })
    const cleanupOpenSettings = window.electronAPI.onOpenSettings(() => {
      setShowSettings(true)
    })

    return () => {
      cleanupWindowShown()
      cleanupOpenSettings()
    }
  }, [setShowSettings])

  useEffect(() => {
    if (!showSettings) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showSettings])

  const canSend = useMemo(() => {
    return currentInput.trim().length > 0 && !isLoading
  }, [currentInput, isLoading])

  const ensureAPIReady = (): boolean => {
    if (!config.apiKey) {
      setError("尚未配置 API Key，請先到設定頁完成配置")
      setShowSettings(true)
      return false
    }

    return true
  }

  const runRefine = async (prompt: string, nextMessages: ChatMessage[]) => {
    const content = await callChatAPI(config, nextMessages)
    const parsed = parseAgentResponse(content)

    if (parsed.analysis) {
      addMessage({ role: "assistant", content: parsed.analysis })
    }

    if (parsed.optimized_text) {
      setOptimizedText(parsed.optimized_text)
    }

    setOptions(parsed.options)
    setStage(parsed.need_more_info ? "refining" : "confirming")

    if (!parsed.need_more_info && !parsed.optimized_text) {
      setOptimizedText(prompt)
    }
  }

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault()

    const trimmed = currentInput.trim()
    if (!trimmed || !ensureAPIReady()) {
      return
    }

    const userMessage: ChatMessage = { role: "user", content: trimmed }

    try {
      setLoading(true)
      setError(null)
      setCurrentInput("")
      addMessage(userMessage)

      const nextMessages = [...messages, userMessage]
      await runRefine(trimmed, nextMessages)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "請求失敗")
    } finally {
      setLoading(false)
    }
  }

  const handleOptionSelect = async (option: AgentOption) => {
    if (option.id === "other") {
      setCurrentInput("請描述你希望調整的方向：")
      inputRef.current?.focus()
      return
    }

    if (!ensureAPIReady()) {
      return
    }

    const baseText =
      optimizedText || messages.find((message) => message.role === "user")?.content || ""
    const prompt = `請根據以下方向優化文字：${option.label}\n\n原文：${baseText}`
    const userMessage: ChatMessage = { role: "user", content: prompt }

    try {
      setLoading(true)
      setError(null)
      addMessage({ role: "system", content: `已選擇：${option.label}` })
      addMessage(userMessage)

      const nextMessages = [...messages, userMessage]
      await runRefine(prompt, nextMessages)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "優化失敗")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmTranslation = async () => {
    if (!ensureAPIReady()) {
      return
    }

    const sourceText =
      optimizedText || messages.find((message) => message.role === "user")?.content || ""
    if (!sourceText) {
      setError("沒有可翻譯的文字")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setStage("translating")
      const translated = await translateText(config, sourceText)
      setTranslatedText(translated)
      setStage("result")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "翻譯失敗")
      setStage("confirming")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string, type: "original" | "translated") => {
    if (!text.trim()) {
      return
    }

    await window.electronAPI.copyToClipboard(text)

    if (type === "original") {
      setCopiedOriginal(true)
      setTimeout(() => setCopiedOriginal(false), 1500)
    } else {
      setCopiedTranslated(true)
      setTimeout(() => setCopiedTranslated(false), 1500)
    }
  }

  const handleClose = async () => {
    await window.electronAPI.hideWindow()
  }

  const handleEsc = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      await window.electronAPI.hideWindow()
      return
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const handleSaveSettings = async () => {
    try {
      setError(null)
      await saveConfig(settingsDraft)
      setShowSettings(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存設定失敗")
    }
  }

  const handleResetPrompt = () => {
    setSettingsDraft((prev) => ({ ...prev, systemPrompt: DEFAULT_CONFIG.systemPrompt }))
  }

  const handleNewSession = () => {
    reset()
    setCopiedOriginal(false)
    setCopiedTranslated(false)
  }

  if (!isLoaded) {
    return <LoadingDots />
  }

  return (
    <div className="app-container">
      <div className="title-bar">
        <div className="title-bar-title">Text Polish Agent</div>
        <div className="title-bar-buttons">
          <button
            className="title-bar-btn"
            onClick={() => setShowSettings(!showSettings)}
            type="button"
          >
            ⚙
          </button>
          <button className="title-bar-btn" onClick={() => void handleClose()} type="button">
            ✕
          </button>
        </div>
      </div>

      <div className="content">
        {showSettings ? (
          <div className="settings-panel">
            <div className="settings-section">
              <div className="settings-title">API 設定</div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="api-endpoint">
                  Endpoint
                </label>
                <input
                  id="api-endpoint"
                  className="settings-input"
                  value={settingsDraft.apiEndpoint}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({ ...prev, apiEndpoint: event.target.value }))
                  }
                />
              </div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="api-key">
                  API Key
                </label>
                <input
                  id="api-key"
                  className="settings-input"
                  type="password"
                  value={settingsDraft.apiKey}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({ ...prev, apiKey: event.target.value }))
                  }
                />
              </div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="model">
                  Model
                </label>
                <input
                  id="model"
                  className="settings-input"
                  value={settingsDraft.model}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({ ...prev, model: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-title">快捷鍵與 Prompt</div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="shortcut">
                  全局快捷鍵
                </label>
                <input
                  id="shortcut"
                  className="settings-input"
                  value={settingsDraft.shortcut}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({ ...prev, shortcut: event.target.value }))
                  }
                />
                <div className="shortcut-hint">例：CommandOrControl+Shift+P</div>
              </div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="system-prompt">
                  System Prompt
                </label>
                <textarea
                  id="system-prompt"
                  className="settings-textarea"
                  value={settingsDraft.systemPrompt}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({ ...prev, systemPrompt: event.target.value }))
                  }
                />
              </div>
              <div className="result-actions">
                <button className="copy-btn" onClick={handleResetPrompt} type="button">
                  重置 Prompt
                </button>
                <button
                  className="confirm-btn"
                  onClick={() => void handleSaveSettings()}
                  type="button"
                >
                  保存設定
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {error ? <div className="error-message">{error}</div> : null}

            {messages.length === 0 && stage === "input" ? (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <div className="empty-title">開始優化文字</div>
                <div className="empty-desc">
                  輸入文字後按 Enter 發送，Shift+Enter 換行，Esc 可收起視窗。
                </div>
              </div>
            ) : (
              <div className="messages">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                    {message.content}
                  </div>
                ))}

                {optimizedText && stage !== "result" ? (
                  <div className="message assistant">優化預覽：{optimizedText}</div>
                ) : null}
              </div>
            )}

            {isLoading ? <LoadingDots /> : null}

            {options.length > 0 && stage === "refining" ? (
              <div className="options-container">
                {options.map((option) => (
                  <button
                    key={option.id}
                    className="option-btn"
                    onClick={() => void handleOptionSelect(option)}
                    type="button"
                  >
                    <div className="option-label">{option.label}</div>
                    <div className="option-desc">{option.description}</div>
                  </button>
                ))}
              </div>
            ) : null}

            {stage === "confirming" && optimizedText ? (
              <div className="options-container">
                <button
                  className="confirm-btn"
                  onClick={() => void handleConfirmTranslation()}
                  type="button"
                >
                  確認並翻譯
                </button>
              </div>
            ) : null}

            {stage === "result" ? (
              <div className="result-container">
                <div className="result-box">
                  <div className="result-label">原文</div>
                  <div className="result-text">{optimizedText}</div>
                  <div className="result-actions">
                    <button
                      className={`copy-btn ${copiedOriginal ? "copied" : ""}`}
                      onClick={() => void handleCopy(optimizedText, "original")}
                      type="button"
                    >
                      {copiedOriginal ? "已複製" : "複製原文"}
                    </button>
                  </div>
                </div>
                <div className="result-box">
                  <div className="result-label">英文翻譯</div>
                  <div className="result-text">{translatedText}</div>
                  <div className="result-actions">
                    <button
                      className={`copy-btn ${copiedTranslated ? "copied" : ""}`}
                      onClick={() => void handleCopy(translatedText, "translated")}
                      type="button"
                    >
                      {copiedTranslated ? "已複製" : "複製譯文"}
                    </button>
                    <button className="confirm-btn" onClick={handleNewSession} type="button">
                      新會話
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <form className="input-area" onSubmit={(event) => void handleSend(event)}>
              <div className="input-wrapper">
                <textarea
                  ref={inputRef}
                  className="input-field"
                  placeholder="輸入要優化的文字..."
                  value={currentInput}
                  onChange={(event) => setCurrentInput(event.target.value)}
                  onKeyDown={(event) => void handleEsc(event)}
                />
                <button className="send-btn" type="submit" disabled={!canSend}>
                  發送
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
