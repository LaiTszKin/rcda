import { afterEach, describe, expect, it, vi } from "vitest"
import * as fc from "fast-check"
import { parseAgentResponse } from "./api"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("parseAgentResponse property", () => {
  it("任何輸入都不應拋錯，且返回結構完整", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = parseAgentResponse(input)
        expect(typeof result.analysis).toBe("string")
        expect(typeof result.optimized_text).toBe("string")
        expect(Array.isArray(result.options)).toBe(true)
        expect(typeof result.need_more_info).toBe("boolean")
      }),
      { numRuns: 100 },
    )
  })
})
