# Spec: Text Polish Agent Desktop App

- Date: 2026-02-26
- Feature: Text Polish Agent Desktop App
- Owner: User

## Goal

建立一個桌面應用程式，讓使用者能夠通過自定義快捷鍵快速呼出，利用 AI Agent 協助優化和翻譯文字，提升寫作效率。

## Scope

- In scope:
  - 桌面應用程式開發 (Electron + React)
  - 全局快捷鍵設置功能
  - API Key 配置 (OpenAI 格式兼容)
  - 系統托盤駐留
  - 彈窗式對話界面
  - AI Agent 互動式文字優化
  - System Prompt 自定義功能
  - 文字翻譯功能
  - 複製到剪貼板功能
  - 配置持久化存儲
- Out of scope:
  - 多語言界面 (僅支援繁體中文)
  - 用戶賬戶系統
  - 雲端同步功能
  - 歷史記錄管理

## Functional Behaviors (BDD)

### Requirement 1: 全局快捷鍵呼出

**GIVEN** 應用程式正在後台運行
**AND** 使用者已設置快捷鍵組合
**WHEN** 使用者按下設置的快捷鍵
**THEN** 對話彈窗立即顯示在桌面
**AND** 輸入框自動獲得焦點

**Requirements**:

- [ ] R1.1 支持自定義快捷鍵組合設置
- [ ] R1.2 快捷鍵在系統範圍內生效（全局熱鍵）
- [ ] R1.3 彈窗顯示時自動聚焦輸入框
- [ ] R1.4 可通過 ESC 鍵或點擊外部關閉彈窗
- [ ] R1.5 彈窗以浮動窗口形式顯示，可在全螢幕應用上疊加顯示
- [ ] R1.6 在全螢幕應用中呼出時，不會導致原應用退出全螢幕模式

### Requirement 2: API 配置

**GIVEN** 使用者首次使用或需要修改配置
**WHEN** 使用者打開設置界面
**THEN** 可以配置 API Endpoint 和 API Key
**AND** 配置被安全地保存到本地

**Requirements**:

- [ ] R2.1 支持配置 OpenAI 格式的 API Endpoint URL
- [ ] R2.2 支持配置 API Key（密碼類型輸入）
- [ ] R2.3 配置信息持久化存儲到本地文件
- [ ] R2.4 API Key 不以明文顯示

### Requirement 3: 互動式文字優化

**GIVEN** 使用者在輸入框輸入一段文字
**WHEN** 使用者發送文字給 AI Agent
**THEN** AI Agent 分析文字並提供互動式選項
**AND** 使用者可以選擇選項或自行補充說明

**Requirements**:

- [ ] R3.1 AI Agent 接收用戶輸入的文字
- [ ] R3.2 AI Agent 返回多個優化方向選項供用戶選擇
- [ ] R3.3 提供 "Other" 選項讓用戶自行補充說明
- [ ] R3.4 根據用戶選擇迭代優化文字
- [ ] R3.5 顯示優化後的文字預覽

### Requirement 4: 自定義 System Prompt

**GIVEN** 使用者希望自定義 AI 行為
**WHEN** 使用者在設置中編輯 System Prompt
**THEN** System Prompt 被保存並應用於後續對話
**AND** 可以恢復為默認 Prompt

**Requirements**:

- [ ] R4.1 提供默認 System Prompt
- [ ] R4.2 支持自定義編輯 System Prompt
- [ ] R4.3 支持重置為默認值
- [ ] R4.4 System Prompt 持久化存儲

### Requirement 5: 翻譯與複製

**GIVEN** 用戶確認了 AI 優化後的文字版本
**WHEN** 用戶點擊確認按鈕
**THEN** AI 將優化後的文字翻譯為英文
**AND** 顯示翻譯結果並提供複製按鈕

**Requirements**:

- [ ] R5.1 確認按鈕觸發翻譯流程
- [ ] R5.2 AI 將文字翻譯為英文
- [ ] R5.3 顯示原文和譯文對照
- [ ] R5.4 提供一鍵複製功能
- [ ] R5.5 複製成功後顯示提示

### Requirement 6: 系統托盤駐留

**GIVEN** 應用程式啟動後
**WHEN** 主窗口關閉
**THEN** 應用程式繼續在系統托盤運行
**AND** 可以通過托盤圖標重新打開或退出

**Requirements**:

- [ ] R6.1 應用啟動後駐留系統托盤
- [ ] R6.2 關閉窗口時不退出應用
- [ ] R6.3 托盤菜單包含：顯示窗口、設置、退出
- [ ] R6.4 點擊托盤圖標顯示主窗口

## Error and Edge Cases

- [ ] E1 API Key 未配置時顯示提示並引導設置
- [ ] E2 API 調用失敗時顯示錯誤信息
- [ ] E3 網絡連接失敗時顯示友好錯誤提示
- [ ] E4 輸入為空時禁用發送按鈕
- [ ] E5 快捷鍵衝突時提示用戶更換
- [ ] E6 API 返回格式異常時的處理

## Clarification Questions

None

## References

- Official docs:
  - Electron Documentation: https://www.electronjs.org/docs
  - React Documentation: https://react.dev
  - OpenAI API Reference: https://platform.openai.com/docs/api-reference
- Related code files:
  - N/A (新項目)
