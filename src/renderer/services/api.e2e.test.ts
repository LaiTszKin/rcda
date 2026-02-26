import { describe, expect, it } from "vitest"
import { parseAgentResponse } from "./api"

describe("text polish flow e2e smoke", () => {
  it("可解析代理回應並得到可顯示內容", () => {
    const parsed = parseAgentResponse(
      '{"analysis":"ok","optimized_text":"done","options":[],"need_more_info":false}',
    )
    expect(parsed.analysis).toBe("ok")
    expect(parsed.optimized_text).toBe("done")
  })
})
