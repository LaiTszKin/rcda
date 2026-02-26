import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AgentOption, ChatMessage } from "@shared/types.ts"
import {
  LanguagePreference,
  getDefaultSystemPrompt,
  getUIStrings,
  resolveLanguage,
} from "@shared/i18n.ts"
import { callChatAPI, parseAgentResponse, translateText } from "./services/api"
import { isIMEComposingKeyEvent } from "./utils/ime"
import { getShortcutFromKeyboardEvent, isNewSessionShortcut } from "./utils/shortcut"
import { useConfigStore, useDialogStore, useUIStore } from "./stores"

interface SettingsDraft {
  apiEndpoint: string
  apiKey: string
  model: string
  shortcut: string
  systemPrompt: string
  autoOpenDevTools: boolean
  languagePreference: LanguagePreference
}

type DialogStage = "input" | "refining" | "confirming" | "translating" | "result"

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === "AbortError"
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
  const requestAbortControllerRef = useRef<AbortController | null>(null)
  const isCancellingRef = useRef(false)
  const isIMEComposingRef = useRef(false)
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

  const systemLocale = useMemo(() => window.navigator.language || "en-US", [])
  const activeLanguage = useMemo(
    () => resolveLanguage(config.languagePreference, systemLocale),
    [config.languagePreference, systemLocale],
  )
  const ui = useMemo(() => getUIStrings(activeLanguage), [activeLanguage])

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

  useEffect(() => {
    document.documentElement.lang = activeLanguage
  }, [activeLanguage])

  const canSend = useMemo(() => {
    return currentInput.trim().length > 0 && !isLoading
  }, [currentInput, isLoading])

  const cancelCurrentRequest = useCallback(() => {
    const currentController = requestAbortControllerRef.current
    if (!currentController) {
      return false
    }

    isCancellingRef.current = true
    requestAbortControllerRef.current = null
    currentController.abort()
    setLoading(false)
    setError(null)
    return true
  }, [setError, setLoading])

  const recoverAfterAbort = useCallback(
    (fallbackStage: DialogStage) => {
      if (isCancellingRef.current) {
        addMessage({ role: "system", content: ui.requestAborted })
        isCancellingRef.current = false
      }

      setStage(optimizedText ? "confirming" : fallbackStage)
    },
    [addMessage, optimizedText, setStage, ui.requestAborted],
  )

  const ensureAPIReady = (): boolean => {
    if (!config.apiKey) {
      setError(ui.apiKeyMissing)
      setShowSettings(true)
      return false
    }

    return true
  }

  const runRefine = async (nextMessages: ChatMessage[], signal?: AbortSignal) => {
    const content = await callChatAPI(config, nextMessages, signal)
    const parsed = parseAgentResponse(content)
    const firstUserMessage = nextMessages.find((message) => message.role === "user")?.content || ""
    const baselineText = optimizedText || firstUserMessage
    const optimized = parsed.optimized_text.trim()
    const sourceText = optimized || baselineText
    const isNoChange =
      !parsed.need_more_info &&
      !!baselineText &&
      (parsed.no_change || !!parsed.no_change_reason || optimized === baselineText.trim())

    if (parsed.analysis) {
      addMessage({ role: "assistant", content: parsed.analysis })
    }

    if (isNoChange) {
      const reason = parsed.no_change_reason || ui.noChangeReasonDefault
      addMessage({ role: "assistant", content: `${ui.noChangePrefix}${reason}` })
      setOptimizedText(sourceText)
      setOptions([])
      setStage("translating")

      const translated = await translateText(config, sourceText, signal)
      setTranslatedText(translated)
      setStage("result")
      return
    }

    if (parsed.optimized_text) {
      setOptimizedText(parsed.optimized_text)
    }

    setOptions(parsed.options)
    setStage(parsed.need_more_info ? "refining" : "confirming")
  }

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault()

    const trimmed = currentInput.trim()
    if (!trimmed || !ensureAPIReady()) {
      return
    }

    const userMessage: ChatMessage = { role: "user", content: trimmed }
    const previousStage = stage
    const abortController = new AbortController()

    try {
      requestAbortControllerRef.current = abortController
      setLoading(true)
      setError(null)
      setCurrentInput("")
      addMessage(userMessage)

      const nextMessages = [...messages, userMessage]
      await runRefine(nextMessages, abortController.signal)
    } catch (requestError) {
      if (isAbortError(requestError)) {
        recoverAfterAbort(previousStage)
        return
      }
      setError(requestError instanceof Error ? requestError.message : ui.optimizeFailed)
    } finally {
      if (requestAbortControllerRef.current === abortController) {
        requestAbortControllerRef.current = null
      }
      setLoading(false)
    }
  }

  const handleOptionSelect = async (option: AgentOption) => {
    if (option.id === "other") {
      setCurrentInput(ui.refineDirectionPrompt)
      inputRef.current?.focus()
      return
    }

    if (!ensureAPIReady()) {
      return
    }

    const baseText =
      optimizedText || messages.find((message) => message.role === "user")?.content || ""
    const prompt = ui.refinePromptTemplate
      .replace("{label}", option.label)
      .replace("{text}", baseText)
    const userMessage: ChatMessage = { role: "user", content: prompt }
    const previousStage = stage
    const abortController = new AbortController()

    try {
      requestAbortControllerRef.current = abortController
      setLoading(true)
      setError(null)
      addMessage({ role: "system", content: `${ui.selectedPrefix}${option.label}` })
      addMessage(userMessage)

      const nextMessages = [...messages, userMessage]
      await runRefine(nextMessages, abortController.signal)
    } catch (requestError) {
      if (isAbortError(requestError)) {
        recoverAfterAbort(previousStage)
        return
      }
      setError(requestError instanceof Error ? requestError.message : ui.optimizeFailed)
    } finally {
      if (requestAbortControllerRef.current === abortController) {
        requestAbortControllerRef.current = null
      }
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
      setError(ui.noTextToTranslate)
      return
    }

    const previousStage = stage
    const abortController = new AbortController()

    try {
      requestAbortControllerRef.current = abortController
      setLoading(true)
      setError(null)
      setStage("translating")
      const translated = await translateText(config, sourceText, abortController.signal)
      setTranslatedText(translated)
      setStage("result")
    } catch (requestError) {
      if (isAbortError(requestError)) {
        recoverAfterAbort(previousStage)
        return
      }
      setError(requestError instanceof Error ? requestError.message : ui.translationFailed)
      setStage("confirming")
    } finally {
      if (requestAbortControllerRef.current === abortController) {
        requestAbortControllerRef.current = null
      }
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
    if (
      isIMEComposingKeyEvent(
        event.nativeEvent as globalThis.KeyboardEvent & { keyCode?: number },
        isIMEComposingRef.current,
      )
    ) {
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      if (isLoading && cancelCurrentRequest()) {
        return
      }
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
      setError(saveError instanceof Error ? saveError.message : ui.saveSettingsFailed)
    }
  }

  const handleResetPrompt = () => {
    setSettingsDraft((prev) => ({
      ...prev,
      systemPrompt: getDefaultSystemPrompt(resolveLanguage(prev.languagePreference, systemLocale)),
    }))
  }

  const handleLanguagePreferenceChange = (nextPreference: LanguagePreference) => {
    setSettingsDraft((prev) => {
      const currentLanguage = resolveLanguage(prev.languagePreference, systemLocale)
      const nextLanguage = resolveLanguage(nextPreference, systemLocale)
      const currentDefaultPrompt = getDefaultSystemPrompt(currentLanguage)
      const shouldSyncPrompt =
        !prev.systemPrompt.trim() || prev.systemPrompt.trim() === currentDefaultPrompt.trim()

      return {
        ...prev,
        languagePreference: nextPreference,
        systemPrompt: shouldSyncPrompt ? getDefaultSystemPrompt(nextLanguage) : prev.systemPrompt,
      }
    })
  }

  const handleNewSession = useCallback(() => {
    reset()
    setCopiedOriginal(false)
    setCopiedTranslated(false)
  }, [reset, setCopiedOriginal, setCopiedTranslated])

  const handleShortcutCapture = (event: KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const shortcut = getShortcutFromKeyboardEvent(event)
    if (!shortcut) {
      return
    }

    setSettingsDraft((prev) => ({ ...prev, shortcut }))
  }

  const handleGlobalNewSession = useCallback(
    (event: globalThis.KeyboardEvent) => {
      if (showSettings || !isNewSessionShortcut(event)) {
        return
      }

      event.preventDefault()
      handleNewSession()
    },
    [handleNewSession, showSettings],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalNewSession)
    return () => window.removeEventListener("keydown", handleGlobalNewSession)
  }, [handleGlobalNewSession])

  useEffect(() => {
    const handleGlobalEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || showSettings || !isLoading) {
        return
      }

      event.preventDefault()
      cancelCurrentRequest()
    }

    window.addEventListener("keydown", handleGlobalEsc)
    return () => window.removeEventListener("keydown", handleGlobalEsc)
  }, [cancelCurrentRequest, isLoading, showSettings])

  if (!isLoaded) {
    return <LoadingDots />
  }

  return (
    <div className="app-container">
      <div className="tech-grid" aria-hidden="true" />
      <div className="noise-layer" aria-hidden="true" />
      <div className="title-bar">
        <div className="title-bar-title-wrap">
          <span className="status-dot" />
          <div className="title-bar-title-block">
            <div className="title-bar-title">TEXT POLISH AGENT</div>
            <div className="title-bar-subtitle">BLACK.WH/ FUTURE UI</div>
          </div>
        </div>
        <div className="title-bar-buttons">
          <button
            className="title-bar-btn"
            onClick={() => setShowSettings(!showSettings)}
            type="button"
          >
            {ui.setButton}
          </button>
          <button className="title-bar-btn" onClick={() => void handleClose()} type="button">
            {ui.exitButton}
          </button>
        </div>
      </div>

      <div className="content">
        {showSettings ? (
          <div className="settings-panel">
            <div className="settings-section">
              <div className="settings-title">{ui.apiSettings}</div>
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
              <div className="settings-title">{ui.shortcutAndPrompt}</div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="shortcut">
                  {ui.shortcutLabel}
                </label>
                <div className="shortcut-input">
                  <input
                    id="shortcut"
                    className="shortcut-display"
                    value={settingsDraft.shortcut}
                    onKeyDown={handleShortcutCapture}
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                  />
                </div>
                <div className="shortcut-hint">{ui.shortcutHint}</div>
                <div className="shortcut-hint">{ui.newSessionHint}</div>
              </div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="language-preference">
                  {ui.languageLabel}
                </label>
                <select
                  id="language-preference"
                  className="settings-input"
                  value={settingsDraft.languagePreference}
                  onChange={(event) =>
                    handleLanguagePreferenceChange(event.target.value as LanguagePreference)
                  }
                >
                  <option value="system">{ui.languageSystem}</option>
                  <option value="zh-TW">{ui.languageZhTw}</option>
                  <option value="zh-CN">{ui.languageZhCn}</option>
                  <option value="en">{ui.languageEn}</option>
                </select>
              </div>
              <div className="settings-field">
                <label className="toggle-row" htmlFor="auto-open-devtools">
                  <input
                    id="auto-open-devtools"
                    type="checkbox"
                    checked={settingsDraft.autoOpenDevTools}
                    onChange={(event) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        autoOpenDevTools: event.target.checked,
                      }))
                    }
                  />
                  <span>{ui.autoOpenDevTools}</span>
                </label>
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
                  {ui.resetPrompt}
                </button>
                <button
                  className="confirm-btn"
                  onClick={() => void handleSaveSettings()}
                  type="button"
                >
                  {ui.saveSettings}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {error ? <div className="error-message">{error}</div> : null}

            {messages.length === 0 && stage === "input" ? (
              <div className="empty-state">
                <div className="empty-icon">◌</div>
                <div className="empty-title">{ui.emptyTitle}</div>
                <div className="empty-desc">{ui.emptyDescription}</div>
              </div>
            ) : (
              <div className="messages">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                    {message.content}
                  </div>
                ))}

                {optimizedText && stage !== "result" ? (
                  <div className="message assistant">
                    {ui.optimizedPreview}
                    {optimizedText}
                  </div>
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
                  {ui.confirmAndTranslate}
                </button>
              </div>
            ) : null}

            {stage === "result" ? (
              <div className="result-container">
                <div className="result-box">
                  <div className="result-label">{ui.originalText}</div>
                  <div className="result-text">{optimizedText}</div>
                  <div className="result-actions">
                    <button
                      className={`copy-btn ${copiedOriginal ? "copied" : ""}`}
                      onClick={() => void handleCopy(optimizedText, "original")}
                      type="button"
                    >
                      {copiedOriginal ? ui.copied : ui.copyOriginal}
                    </button>
                  </div>
                </div>
                <div className="result-box">
                  <div className="result-label">{ui.translatedText}</div>
                  <div className="result-text">{translatedText}</div>
                  <div className="result-actions">
                    <button
                      className={`copy-btn ${copiedTranslated ? "copied" : ""}`}
                      onClick={() => void handleCopy(translatedText, "translated")}
                      type="button"
                    >
                      {copiedTranslated ? ui.copied : ui.copyTranslated}
                    </button>
                    <button className="confirm-btn" onClick={handleNewSession} type="button">
                      {ui.newSession}
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
                  placeholder={ui.inputPlaceholder}
                  value={currentInput}
                  onChange={(event) => setCurrentInput(event.target.value)}
                  onCompositionStart={() => {
                    isIMEComposingRef.current = true
                  }}
                  onCompositionEnd={() => {
                    isIMEComposingRef.current = false
                  }}
                  onKeyDown={(event) => void handleEsc(event)}
                />
                <button className="send-btn" type="submit" disabled={!canSend}>
                  {ui.send}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
