import { describe, expect, it } from "vitest"
import { getDefaultSystemPrompt, getMainStrings, getUIStrings, resolveLanguage } from "./i18n"

describe("resolveLanguage", () => {
  it("follows manual preference when set", () => {
    expect(resolveLanguage("en", "zh-TW")).toBe("en")
    expect(resolveLanguage("zh-CN", "en-US")).toBe("zh-CN")
  })

  it("maps system locales to supported languages", () => {
    expect(resolveLanguage("system", "zh-TW")).toBe("zh-TW")
    expect(resolveLanguage("system", "zh-Hant-HK")).toBe("zh-TW")
    expect(resolveLanguage("system", "zh-CN")).toBe("zh-CN")
    expect(resolveLanguage("system", "en-US")).toBe("en")
  })
})

describe("localized resources", () => {
  it("returns non-empty default prompts", () => {
    expect(getDefaultSystemPrompt("zh-TW")).toContain("文字優化助手")
    expect(getDefaultSystemPrompt("zh-CN")).toContain("文字优化助手")
    expect(getDefaultSystemPrompt("en")).toContain("text polishing assistant")
  })

  it("returns localized UI copy", () => {
    expect(getUIStrings("zh-TW").languageLabel).toBe("介面語言")
    expect(getUIStrings("zh-CN").languageLabel).toBe("界面语言")
    expect(getUIStrings("en").languageLabel).toBe("Interface Language")
  })

  it("returns localized tray copy", () => {
    expect(getMainStrings("zh-TW").traySettings).toBe("設定")
    expect(getMainStrings("zh-CN").traySettings).toBe("设置")
    expect(getMainStrings("en").traySettings).toBe("Settings")
  })
})
