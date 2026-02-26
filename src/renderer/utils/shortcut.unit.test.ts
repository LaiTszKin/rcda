import { describe, expect, it } from "vitest"
import { getShortcutFromKeyboardEvent, isNewSessionShortcut } from "./shortcut"

describe("getShortcutFromKeyboardEvent", () => {
  it("可將 Command/Control + 字母轉為 Electron accelerator", () => {
    expect(
      getShortcutFromKeyboardEvent({
        key: "n",
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      }),
    ).toBe("CommandOrControl+N")
  })

  it("可組合多個修飾鍵", () => {
    expect(
      getShortcutFromKeyboardEvent({
        key: "p",
        metaKey: false,
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
      }),
    ).toBe("CommandOrControl+Alt+Shift+P")
  })

  it("只按修飾鍵時不應生成快捷鍵", () => {
    expect(
      getShortcutFromKeyboardEvent({
        key: "Shift",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      }),
    ).toBeNull()
  })
})

describe("isNewSessionShortcut", () => {
  it("Command/Ctrl + N 會觸發新會話", () => {
    expect(
      isNewSessionShortcut({
        key: "n",
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      }),
    ).toBe(true)
  })

  it("帶其他修飾鍵時不觸發新會話", () => {
    expect(
      isNewSessionShortcut({
        key: "n",
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      }),
    ).toBe(false)
  })
})
