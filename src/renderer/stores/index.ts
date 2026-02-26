import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { AppConfig, DEFAULT_CONFIG, ChatMessage, AgentOption } from "@shared/types.ts"

interface ConfigState {
  config: AppConfig
  isLoaded: boolean
  loadConfig: () => Promise<void>
  saveConfig: (config: Partial<AppConfig>) => Promise<void>
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  isLoaded: false,
  loadConfig: async () => {
    try {
      const config = await window.electronAPI.getConfig()
      set({ config, isLoaded: true })
    } catch (error) {
      console.error("Failed to load config:", error)
      set({ isLoaded: true })
    }
  },
  saveConfig: async (newConfig) => {
    const currentConfig = get().config
    const updatedConfig = { ...currentConfig, ...newConfig }
    const result = await window.electronAPI.saveConfig(updatedConfig)

    if (!result.ok) {
      throw new Error(result.error ?? "儲存設定失敗")
    }

    set({ config: updatedConfig })
  },
}))

type DialogStage = "input" | "refining" | "confirming" | "translating" | "result"

interface DialogState {
  stage: DialogStage
  messages: ChatMessage[]
  currentInput: string
  options: AgentOption[]
  optimizedText: string
  translatedText: string
  isLoading: boolean
  error: string | null

  setCurrentInput: (input: string) => void
  addMessage: (message: ChatMessage) => void
  setOptions: (options: AgentOption[]) => void
  setOptimizedText: (text: string) => void
  setTranslatedText: (text: string) => void
  setStage: (stage: DialogStage) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useDialogStore = create<DialogState>()(
  persist(
    (set) => ({
      stage: "input",
      messages: [],
      currentInput: "",
      options: [],
      optimizedText: "",
      translatedText: "",
      isLoading: false,
      error: null,

      setCurrentInput: (input) => set({ currentInput: input }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setOptions: (options) => set({ options }),
      setOptimizedText: (text) => set({ optimizedText: text }),
      setTranslatedText: (text) => set({ translatedText: text }),
      setStage: (stage) => set({ stage }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () =>
        set({
          stage: "input",
          messages: [],
          currentInput: "",
          options: [],
          optimizedText: "",
          translatedText: "",
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: "dialog-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        stage: state.stage,
        messages: state.messages,
        currentInput: state.currentInput,
        options: state.options,
        optimizedText: state.optimizedText,
        translatedText: state.translatedText,
      }),
    },
  ),
)

interface UIState {
  showSettings: boolean
  copiedOriginal: boolean
  copiedTranslated: boolean
  setShowSettings: (show: boolean) => void
  setCopiedOriginal: (copied: boolean) => void
  setCopiedTranslated: (copied: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      showSettings: false,
      copiedOriginal: false,
      copiedTranslated: false,
      setShowSettings: (show) => set({ showSettings: show }),
      setCopiedOriginal: (copied) => set({ copiedOriginal: copied }),
      setCopiedTranslated: (copied) => set({ copiedTranslated: copied }),
    }),
    {
      name: "ui-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        showSettings: state.showSettings,
      }),
    },
  ),
)
