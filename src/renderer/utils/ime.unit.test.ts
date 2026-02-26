import { describe, expect, it } from "vitest"
import { isIMEComposingKeyEvent } from "./ime"

describe("isIMEComposingKeyEvent", () => {
  it("fallback 為 true 時應視為組字中", () => {
    expect(isIMEComposingKeyEvent(undefined, true)).toBe(true)
    expect(isIMEComposingKeyEvent({ isComposing: false, keyCode: 13 }, true)).toBe(true)
  })

  it("native isComposing 為 true 時應視為組字中", () => {
    expect(isIMEComposingKeyEvent({ isComposing: true }, false)).toBe(true)
  })

  it("keyCode=229 時應視為組字中", () => {
    expect(isIMEComposingKeyEvent({ keyCode: 229 }, false)).toBe(true)
  })

  it("非組字狀態應返回 false", () => {
    expect(isIMEComposingKeyEvent(undefined, false)).toBe(false)
    expect(isIMEComposingKeyEvent({ isComposing: false, keyCode: 13 }, false)).toBe(false)
  })
})
