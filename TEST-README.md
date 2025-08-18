# 🧪 API 測試工具使用說明

## 📋 概述

`test-api.js` 是一個完整的 Yahoo Finance API 測試工具，用於驗證股票研究圖表系統的功能是否正常。

## 🚀 快速開始

### 基本使用
```bash
# 快速測試（預設，測試前3個案例）
node test-api.js

# 或明確指定快速測試
node test-api.js quick
```

### 所有測試模式

#### 1. 快速測試 (Quick)
```bash
node test-api.js quick
```
- 測試前3個案例（AAPL, MSFT, TSLA）
- 適合日常快速驗證
- 執行時間：約1-2分鐘

#### 2. 完整測試 (Full)
```bash
node test-api.js full
```
- 測試所有10個案例
- 包含美股和台股
- 執行時間：約5-10分鐘

#### 3. 單一測試 (Single)
```bash
node test-api.js single US AAPL
node test-api.js single TW 2330
```
- 測試特定股票
- 格式：`single [market] [symbol]`

#### 4. 自訂測試 (Custom)
```bash
node test-api.js custom
```
- 測試不同日期範圍
- 驗證日期篩選功能

#### 5. 效能測試 (Performance)
```bash
node test-api.js performance
```
- 測試回應時間
- 顯示效能統計

## 📊 測試案例

### 美股 (US)
- **AAPL** - Apple Inc.
- **MSFT** - Microsoft Corp.
- **TSLA** - Tesla Inc.
- **GOOGL** - Alphabet Inc.
- **NVDA** - NVIDIA Corp.

### 台股 (TW)
- **2330** - 台積電
- **2317** - 鴻海
- **0050** - 元大台灣50
- **2454** - 聯發科
- **2412** - 中華電

## ✅ 驗證項目

每個測試會驗證：

1. **HTTP 狀態碼** - 確認 API 正常回應
2. **回應時間** - 監控效能
3. **資料來源** - 確認使用 Yahoo Finance
4. **資料筆數** - 確認資料完整性
5. **回應格式** - 驗證 JSON 結構
6. **資料欄位** - 確認 OHLC 資料完整
7. **日期範圍** - 驗證預設30天範圍

## 📈 預期結果

### 成功指標
- ✅ 所有測試通過
- 📊 資料筆數：19-20筆（約30個交易日）
- ⏱️ 回應時間：< 500ms
- 📅 日期範圍：最近30天

### 資料來源
- **主要**：Yahoo Finance
- **備用**：Alpha Vantage（美股）
- **備用**：Mock Data（台股）

## 🔧 故障排除

### 常見問題

#### 1. 連接錯誤
```bash
❌ 測試失敗: connect ECONNREFUSED
```
**解決方案**：確認 Next.js 開發伺服器正在運行
```bash
npm run dev
```

#### 2. 資料為空
```bash
❌ 資料陣列錯誤或為空
```
**解決方案**：檢查 Yahoo Finance API 是否正常

#### 3. 回應時間過長
```bash
✅ 回應時間: 2000ms
```
**解決方案**：檢查網路連接或等待一段時間後重試

### 除錯模式

如果需要更詳細的錯誤資訊，可以修改測試程式中的 `verbose` 參數：

```javascript
const result = await testAPI(market, symbol, name, { verbose: true });
```

## 📝 自訂測試

### 新增測試案例

在 `testCases` 陣列中新增：

```javascript
const testCases = [
  // 新增測試案例
  { market: 'US', symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { market: 'TW', symbol: '1301', name: '台塑' },
];
```

### 修改測試參數

可以調整：
- 請求間隔時間
- 測試案例數量
- 驗證項目

## 🎯 最佳實踐

1. **定期測試**：建議每天執行一次快速測試
2. **部署前測試**：部署前執行完整測試
3. **效能監控**：定期執行效能測試
4. **問題追蹤**：記錄失敗的測試案例

## 📞 支援

如果遇到問題：
1. 檢查伺服器狀態
2. 查看錯誤訊息
3. 確認網路連接
4. 檢查 Yahoo Finance API 狀態

---

**最後更新**：2025-08-18
**版本**：1.0.0
