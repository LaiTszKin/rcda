import { describe, expect, it } from "vitest"
import * as fc from "fast-check"
import { getShortcutFromKeyboardEvent } from "./shortcut"

describe("getShortcutFromKeyboardEvent property", () => {
  it("任意鍵盤輸入都應可安全處理", () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.string(),
          metaKey: fc.boolean(),
          ctrlKey: fc.boolean(),
          altKey: fc.boolean(),
          shiftKey: fc.boolean(),
        }),
        (eventLike) => {
          const result = getShortcutFromKeyboardEvent(eventLike)
          expect(result === null || typeof result === "string").toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })
})
