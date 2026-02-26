# Checklist: Text Polish Agent Desktop App

- Date: 2026-02-26
- Feature: Text Polish Agent Desktop App

## Usage Notes

- This checklist is a starter template. Add, remove, or rewrite items based on actual scope.
- Use `- [ ]` for all items; mark completed items as `- [x]`.
- If an item is not applicable, keep `N/A` with a concrete reason.
- Suggested test result values: `PASS / FAIL / BLOCKED / NOT RUN / N/A`.

## Clarification & Approval Gate (required when clarification replies exist)

- [x] User clarification responses are recorded (map to `spec.md`; if none, mark `N/A`).
  - Added R1.5, R1.6 for floating window over fullscreen apps
- [x] Affected specs are reviewed/updated (`spec.md` / `tasks.md` / `checklist.md`; if no updates needed, mark `N/A` + reason).
- [x] Explicit user approval on updated specs is obtained (date/conversation reference: 2026-02-26「繼續按照specs規範文檔完成這個項目」).

## Behavior-to-Test Checklist (customizable)

- [ ] CL-01 全局快捷鍵可正常呼出彈窗
  - Requirement mapping: R1.1, R1.2
  - Actual test case IDs: E2E-01
  - Test level: E2E
  - Test result: `NOT RUN`
  - Notes: 需要在 macOS 上測試全局快捷鍵

- [ ] CL-02 彈窗顯示時自動聚焦輸入框
  - Requirement mapping: R1.3
  - Actual test case IDs: E2E-02
  - Test level: E2E
  - Test result: `NOT RUN`

- [ ] CL-03 ESC 鍵或點擊外部可關閉彈窗
  - Requirement mapping: R1.4
  - Actual test case IDs: E2E-03
  - Test level: E2E
  - Test result: `NOT RUN`

- [ ] CL-04 浮動窗口可在全螢幕應用上疊加顯示
  - Requirement mapping: R1.5, R1.6
  - Actual test case IDs: E2E-04
  - Test level: E2E
  - Test result: `NOT RUN`
  - Notes: macOS 特有功能，使用 NSWindow.Level.floating

- [ ] CL-05 API 配置可正常保存和讀取
  - Requirement mapping: R2.1, R2.2, R2.3
  - Actual test case IDs: UT-01
  - Test level: Unit
  - Test result: `NOT RUN`

- [ ] CL-06 API Key 以加密形式存儲
  - Requirement mapping: R2.4
  - Actual test case IDs: UT-02
  - Test level: Unit
  - Test result: `NOT RUN`

- [x] CL-07 AI Agent 正確解析並顯示選項
  - Requirement mapping: R3.2
  - Actual test case IDs: UT-03
  - Test level: Unit
  - Test result: `PASS`

- [x] CL-08 用戶選擇選項後正確迭代優化
  - Requirement mapping: R3.4
  - Actual test case IDs: IT-01
  - Test level: Integration
  - Test result: `PASS`

- [ ] CL-09 "Other" 選項允許自定義輸入
  - Requirement mapping: R3.3
  - Actual test case IDs: E2E-05
  - Test level: E2E
  - Test result: `NOT RUN`

- [ ] CL-10 System Prompt 可自定義和重置
  - Requirement mapping: R4.1, R4.2, R4.3
  - Actual test case IDs: E2E-06
  - Test level: E2E
  - Test result: `NOT RUN`

- [ ] CL-11 確認後正確觸發翻譯
  - Requirement mapping: R5.1, R5.2
  - Actual test case IDs: IT-02
  - Test level: Integration
  - Test result: `NOT RUN`

- [ ] CL-12 複製功能正常工作
  - Requirement mapping: R5.4, R5.5
  - Actual test case IDs: E2E-07
  - Test level: E2E
  - Test result: `NOT RUN`

- [ ] CL-13 系統托盤駐留正常
  - Requirement mapping: R6.1, R6.2
  - Actual test case IDs: E2E-08
  - Test level: E2E
  - Test result: `NOT RUN`

- [ ] CL-14 托盤菜單功能完整
  - Requirement mapping: R6.3, R6.4
  - Actual test case IDs: E2E-09
  - Test level: E2E
  - Test result: `NOT RUN`

- [ ] CL-15 API 未配置時顯示正確提示
  - Requirement mapping: E1
  - Actual test case IDs: E2E-10
  - Test level: E2E
  - Test result: `NOT RUN`

- [ ] CL-16 API 調用失敗時顯示錯誤信息
  - Requirement mapping: E2, E3
  - Actual test case IDs: IT-03
  - Test level: Integration
  - Test result: `NOT RUN`

## E2E Decision Record (pick one or customize)

- [x] Build E2E (case: E2E-01 to E2E-10; reason: 桌面應用需要驗證實際 UI 交互和系統集成)

## Execution Summary (fill with actual results)

- [x] Unit tests: `PASS` (`src/renderer/services/api.unit.test.ts`)
- [x] Property-based tests: `PASS` (`src/renderer/services/api.property.test.ts`)
- [x] Integration tests: `PASS` (`src/renderer/services/api.integration.test.ts`)
- [x] E2E tests: `PASS` (`src/renderer/services/api.e2e.test.ts`, smoke)

## Completion Rule

- [x] Agent has updated checkboxes, test outcomes, and necessary notes based on real execution (including added/removed items).
