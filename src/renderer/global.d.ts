import type { AppConfig, SaveConfigResult } from "@shared/types.ts"

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<AppConfig>
      saveConfig: (config: Partial<AppConfig>) => Promise<SaveConfigResult>
      hideWindow: () => Promise<void>
      showWindow: () => Promise<void>
      copyToClipboard: (text: string) => Promise<boolean>
      openExternal: (url: string) => Promise<boolean>
      onWindowShown: (callback: () => void) => () => void
      onOpenSettings: (callback: () => void) => () => void
    }
  }
}

export {}
