import {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  shell,
  clipboard,
  safeStorage,
} from "electron"
import * as path from "path"
import Store from "electron-store"
import type { AppConfig, SaveConfigResult } from "../shared/types"
import { DEFAULT_CONFIG } from "../shared/types"
import { getDefaultSystemPrompt, getMainStrings, resolveLanguage } from "../shared/i18n"

interface StoredConfig {
  apiEndpoint: string
  model: string
  shortcut: string
  systemPrompt: string
  autoOpenDevTools: boolean
  languagePreference: AppConfig["languagePreference"]
  encryptedApiKey?: string
  apiKey?: string
}

const store = new Store<{ config: Partial<StoredConfig> }>()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let currentShortcut = DEFAULT_CONFIG.shortcut

function encryptApiKey(apiKey: string): string | undefined {
  if (!apiKey) {
    return undefined
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return undefined
  }

  return safeStorage.encryptString(apiKey).toString("base64")
}

function decryptApiKey(encryptedApiKey?: string, fallbackPlain?: string): string {
  if (!encryptedApiKey) {
    return fallbackPlain ?? ""
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return fallbackPlain ?? ""
  }

  try {
    return safeStorage.decryptString(Buffer.from(encryptedApiKey, "base64"))
  } catch {
    return fallbackPlain ?? ""
  }
}

function getConfig(): AppConfig {
  const savedConfig = store.get("config") ?? {}
  const languagePreference = savedConfig.languagePreference ?? DEFAULT_CONFIG.languagePreference
  const resolvedLanguage = resolveLanguage(languagePreference, app.getLocale())

  return {
    apiEndpoint: savedConfig.apiEndpoint ?? DEFAULT_CONFIG.apiEndpoint,
    apiKey: decryptApiKey(savedConfig.encryptedApiKey, savedConfig.apiKey),
    model: savedConfig.model ?? DEFAULT_CONFIG.model,
    shortcut: savedConfig.shortcut ?? DEFAULT_CONFIG.shortcut,
    autoOpenDevTools: savedConfig.autoOpenDevTools ?? DEFAULT_CONFIG.autoOpenDevTools,
    systemPrompt: savedConfig.systemPrompt ?? getDefaultSystemPrompt(resolvedLanguage),
    languagePreference,
  }
}

function saveConfig(config: AppConfig): void {
  const encryptedApiKey = encryptApiKey(config.apiKey)

  const nextConfig: StoredConfig = {
    apiEndpoint: config.apiEndpoint,
    model: config.model,
    shortcut: config.shortcut,
    autoOpenDevTools: config.autoOpenDevTools,
    systemPrompt: config.systemPrompt,
    languagePreference: config.languagePreference,
    encryptedApiKey,
  }

  if (!encryptedApiKey && config.apiKey) {
    nextConfig.apiKey = config.apiKey
  }

  store.set("config", nextConfig)
}

function createWindow() {
  const isMac = process.platform === "darwin"
  const config = getConfig()

  mainWindow = new BrowserWindow({
    width: 500,
    height: 600,
    minWidth: 400,
    minHeight: 400,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    ...(isMac ? { type: "panel" as const } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true,
  })
  mainWindow.setAlwaysOnTop(true, "floating")

  if (!app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173")
    if (config.autoOpenDevTools) {
      mainWindow.webContents.openDevTools({ mode: "detach" })
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))
  }

  mainWindow.on("blur", () => {
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide()
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function showWindow() {
  if (!mainWindow) {
    createWindow()
  }

  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send("window-shown")
  }
}

function hideWindow() {
  if (mainWindow) {
    mainWindow.hide()
  }
}

function registerShortcut(shortcut: string): SaveConfigResult {
  const callback = () => {
    if (mainWindow?.isVisible()) {
      hideWindow()
      return
    }

    showWindow()
  }

  globalShortcut.unregisterAll()
  const registered = globalShortcut.register(shortcut, callback)

  if (!registered) {
    return { ok: false, error: "快捷鍵註冊失敗，可能與其他應用衝突" }
  }

  currentShortcut = shortcut
  return { ok: true }
}

function updateShortcut(nextShortcut: string): SaveConfigResult {
  if (nextShortcut === currentShortcut) {
    return { ok: true }
  }

  globalShortcut.unregisterAll()
  const registered = globalShortcut.register(nextShortcut, () => {
    if (mainWindow?.isVisible()) {
      hideWindow()
      return
    }

    showWindow()
  })

  if (!registered) {
    registerShortcut(currentShortcut)
    return { ok: false, error: "快捷鍵衝突，請更換組合鍵" }
  }

  currentShortcut = nextShortcut
  return { ok: true }
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAE7SURBVDiNpZMxSwNBFIX/ae+k0iRNW1I0+he0hYKCU0ELG0EQRBsRwQIQb0D8AboIDiJiL6KVoJUL0UQQBBvBIrgY9Sj6Agp+gIigYOFTRGy0s7NLVZzL7vxJNzO7WfkeeGHmvDMz94KFAnhoRkYA3wDzN14iqYQfwBAwB6wBa5v6VOAqsAZYAl1gPzO/CfQBK8AmsANsARvANrAFXAPNbe4T6q4k0AUYAWaAHWABWAXWgLHMSJFdx4E68JHlAXwE5rPYB9QHegCdQC/QG5jPoNtJq5DKAVWjWU4dgEpgLQZ4A2wAS8A2cARmqFFHhzpB/wA6s0xLzAGsQ8MAiM6S/MB2ImWZO4AlqRYSwfw+4CJ1YRgDQiVSTuN14BNYC4G2AIGYzI6zDNxu5QCsAgvAZhWY3t0J+AJcBg7AbiC/VKJP4CPwCrJ9AI9gKbAfWAIG4rdL5/AbcAg4DXaA/dCj/wBz0B8YBFaALWAD2AI2g01gB5gH/gC3wWqVXAUK8QAAAABJRU5ErkJggg==",
  )

  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  refreshTrayMenu()
  tray.on("click", showWindow)
}

function refreshTrayMenu() {
  if (!tray) {
    return
  }

  const config = getConfig()
  const language = resolveLanguage(config.languagePreference, app.getLocale())
  const mainStrings = getMainStrings(language)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainStrings.trayShowWindow,
      click: showWindow,
    },
    {
      label: mainStrings.traySettings,
      click: () => {
        showWindow()
        mainWindow?.webContents.send("open-settings")
      },
    },
    { type: "separator" },
    {
      label: mainStrings.trayQuit,
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip(mainStrings.trayTooltip)
  tray.setContextMenu(contextMenu)
}

app.whenReady().then(() => {
  createWindow()
  createTray()

  const config = getConfig()
  currentShortcut = config.shortcut
  registerShortcut(currentShortcut)

  app.dock?.hide()
})

app.on("window-all-closed", () => {
  // Keep tray app alive when all windows are hidden/closed.
})

app.on("before-quit", () => {
  globalShortcut.unregisterAll()
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})

ipcMain.handle("get-config", (): AppConfig => {
  return getConfig()
})

ipcMain.handle("save-config", (_, partial: Partial<AppConfig>): SaveConfigResult => {
  const currentConfig = getConfig()
  const nextConfig = { ...currentConfig, ...partial }

  if (partial.shortcut && partial.shortcut !== currentConfig.shortcut) {
    const shortcutResult = updateShortcut(partial.shortcut)
    if (!shortcutResult.ok) {
      return shortcutResult
    }
  }

  saveConfig(nextConfig)
  refreshTrayMenu()
  return { ok: true }
})

ipcMain.handle("hide-window", () => {
  hideWindow()
})

ipcMain.handle("show-window", () => {
  showWindow()
})

ipcMain.handle("copy-to-clipboard", (_, text: string) => {
  clipboard.writeText(text)
  return true
})

ipcMain.handle("open-external", (_, url: string) => {
  shell.openExternal(url)
  return true
})
