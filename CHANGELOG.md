# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- 完整的全市場掃描功能（支援全部11,000+支股票）
- 進階技術指標分析
- 機器學習預測模型
- 即時市場監控儀表板

## [0.4.0] - 2025-08-26

### Added
- **靈活資料收集系統**
  - 新增 `scripts/collect-full-market-data-flexible.ts`
  - 支援四種收集模式：test/quick/full/custom
  - 可自定義美股和台股收集數量
  - 新增 npm 腳本：`collect:test`, `collect:quick`, `collect:full`, `collect:custom`

- **保守模式掃描器**
  - 新增 `scripts/test-full-market-screener-conservative.ts`
  - 用於測試和驗證掃描功能
  - 避免API限制問題

- **改進的檔案管理系統**
  - 檔案備份機制
  - 錯誤恢復功能
  - 檔案完整性檢查

### Changed
- **全市場掃描器優化**
  - 股票數量從200支提升到1000支
  - 調整批次大小：10 → 5
  - 增加延遲時間：500ms → 2000ms
  - 添加單個請求延遲：100ms

- **API速率限制改進**
  - 優化批次處理邏輯
  - 改進並行處理機制
  - 增強錯誤重試機制

### Fixed
- **JSON檔案損壞問題**
  - 修復 `US-stocks-latest.json` 重複時間戳問題
  - 修復 `TW-stocks-latest.json` 多餘括號問題
  - 改進 `updateStockIndustryInfo` 方法錯誤處理

- **產業信息更新機制**
  - 添加完整的錯誤處理鏈
  - 實作備份和恢復機制
  - 增強檔案操作安全性

### Performance
- **資料收集效率提升**
  - 批次處理優化
  - 並行處理改進
  - 記憶體使用優化

- **API調用優化**
  - 速率限制調整
  - 連接池管理
  - 錯誤處理改進

### Documentation
- 更新 README.md 使用指南
- 新增資料收集腳本說明
- 添加故障排除指南

## [0.3.0] - 2025-08-25

### Added
- 全市場掃描器基礎功能
- 技術指標計算系統
- 股票評分算法
- 產業分類系統

### Changed
- 改進股票資料收集機制
- 優化API響應時間
- 增強錯誤處理

### Fixed
- 修復多個API端點問題
- 解決資料格式不一致問題

## [0.2.0] - 2025-08-24

### Added
- Yahoo Finance API 整合
- 股票搜尋功能
- 基本圖表顯示
- 技術指標支援

### Changed
- 重構資料收集系統
- 改進UI/UX設計

## [0.1.0] - 2025-08-23

### Added
- 初始專案架構
- 基本股票資料顯示
- Next.js 應用框架
- TypeScript 支援

---

## 版本號說明

- **MAJOR**: 不相容的API變更
- **MINOR**: 向後相容的新功能
- **PATCH**: 向後相容的錯誤修復

## 貢獻指南

請遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式提交變更：

- `feat:` 新功能
- `fix:` 錯誤修復
- `docs:` 文件更新
- `style:` 程式碼格式調整
- `refactor:` 重構
- `test:` 測試相關
- `chore:` 建置過程或輔助工具的變動
