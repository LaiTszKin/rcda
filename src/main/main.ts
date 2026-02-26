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

interface StoredConfig {
  apiEndpoint: string
  model: string
  shortcut: string
  systemPrompt: string
  autoOpenDevTools: boolean
  encryptedApiKey?: string
  apiKey?: string
}

const DEFAULT_CONFIG: AppConfig = {
  apiEndpoint: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  shortcut: "CommandOrControl+Shift+P",
  autoOpenDevTools: false,
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

  return {
    apiEndpoint: savedConfig.apiEndpoint ?? DEFAULT_CONFIG.apiEndpoint,
    apiKey: decryptApiKey(savedConfig.encryptedApiKey, savedConfig.apiKey),
    model: savedConfig.model ?? DEFAULT_CONFIG.model,
    shortcut: savedConfig.shortcut ?? DEFAULT_CONFIG.shortcut,
    autoOpenDevTools: savedConfig.autoOpenDevTools ?? DEFAULT_CONFIG.autoOpenDevTools,
    systemPrompt: savedConfig.systemPrompt ?? DEFAULT_CONFIG.systemPrompt,
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

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "顯示視窗",
      click: showWindow,
    },
    {
      label: "設置",
      click: () => {
        showWindow()
        mainWindow?.webContents.send("open-settings")
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip("Text Polish Agent")
  tray.setContextMenu(contextMenu)
  tray.on("click", showWindow)
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
