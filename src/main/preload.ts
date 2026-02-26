import { contextBridge, ipcRenderer } from "electron"
import type { AppConfig, SaveConfigResult } from "../shared/types"

const api = {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke("get-config"),
  saveConfig: (config: Partial<AppConfig>): Promise<SaveConfigResult> =>
    ipcRenderer.invoke("save-config", config),
  hideWindow: (): Promise<void> => ipcRenderer.invoke("hide-window"),
  showWindow: (): Promise<void> => ipcRenderer.invoke("show-window"),
  copyToClipboard: (text: string): Promise<boolean> =>
    ipcRenderer.invoke("copy-to-clipboard", text),
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke("open-external", url),

  onWindowShown: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on("window-shown", listener)
    return () => ipcRenderer.removeListener("window-shown", listener)
  },
  onOpenSettings: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on("open-settings", listener)
    return () => ipcRenderer.removeListener("open-settings", listener)
  },
}

contextBridge.exposeInMainWorld("electronAPI", api)
