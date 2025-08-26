# 測試修復待辦事項

## 📊 測試失敗統計 (v0.3.0)
- **總測試數**: 398
- **通過**: 296 (74%)
- **失敗**: 102 (26%)
- **測試套件**: 22個
- **通過套件**: 13個
- **失敗套件**: 9個

## ❌ 失敗的測試類別

### 1. AI 分析測試 (1個失敗)
**文件**: `__tests__/ai-analysis/trend-analyzer.test.ts`
- **問題**: 趨勢分析器評分計算錯誤
- **錯誤**: `expect(result.score).toBeLessThan(30)` 失敗
- **狀態**: 🔴 待修復

### 2. API 端點測試 (15個失敗)
**文件**: `__tests__/api-endpoints.test.ts`

#### 主要問題:
- **OHLC API**: 返回 500 錯誤而不是 200
- **技術指標 API**: 返回 400 錯誤
- **AI 分析 API**: 返回 400 錯誤
- **回應格式**: `success` 字段缺失

#### 具體失敗項目:
1. `應該能夠處理 GET 請求` - 期望 200，實際 500
2. `應該能夠處理缺少參數的請求` - success 字段缺失
3. `應該能夠處理無效的市場參數` - success 字段缺失
4. `應該能夠處理 GET 請求` (技術指標) - 期望 200，實際 400
5. `應該能夠處理 POST 請求` (技術指標) - 期望 200，實際 400
6. `應該能夠處理 POST 請求` (AI 分析) - 期望 200，實際 400
7. `應該處理不支援的 HTTP 方法` - 期望 405，實際 400
8. `應該在合理時間內處理 OHLC 請求` - 期望 200，實際 500
9. `應該在合理時間內處理技術指標請求` - 期望 200，實際 400
10. `應該在合理時間內處理 AI 分析請求` - 期望 200，實際 400
11. `應該驗證時間間隔參數` - 期望 400，實際 500
12. `應該驗證股票代碼格式` - 期望 400，實際 500
13. `應該返回正確的 OHLC 回應格式` - success 屬性缺失
14. `應該返回正確的技術指標回應格式` - indicators 屬性缺失
15. `應該返回正確的 AI 分析回應格式` - result 屬性缺失

**狀態**: 🔴 待修復

### 3. 前端組件測試 (12個失敗)
**文件**: `__tests__/frontend-components.test.tsx`

#### 主要問題:
- `MultiChartLayout` 組件中 `data.length` 錯誤 (data 為 undefined)
- `TradingViewIndicatorSelector` 組件文字不匹配 ("指標" vs "技術指標")
- `selectedIndicators.includes` 錯誤 (selectedIndicators 不是陣列)

#### 具體失敗項目:
1. `應該正確渲染組件` (MultiChartLayout) - data.length 錯誤
2. `應該顯示載入狀態` (MultiChartLayout) - data.length 錯誤
3. `應該根據選擇的指標創建對應的圖表` (MultiChartLayout) - data.length 錯誤
4. `應該正確渲染組件` (TradingViewIndicatorSelector) - 文字不匹配
5. `應該能夠切換指標選擇` (TradingViewIndicatorSelector) - 文字不匹配
6. `應該顯示已選擇的指標數量` (TradingViewIndicatorSelector) - 找不到數字
7. `應該同步多個圖表的時間軸` - selectedIndicators.includes 錯誤
8. `應該將趨勢指標放在主圖表` - selectedIndicators.includes 錯誤
9. `應該將震盪指標放在專用圖表` - selectedIndicators.includes 錯誤
10. `應該在不同螢幕尺寸下正確顯示` - selectedIndicators.includes 錯誤
11. `應該在合理時間內渲染` - selectedIndicators.includes 錯誤
12. `應該在合理時間內處理指標選擇` - 文字不匹配

**狀態**: 🔴 待修復

### 4. 資料收集系統測試 (16個失敗)
**文件**: `__tests__/data-collection-system.test.ts`

#### 主要問題:
- 測試超時 (10秒限制)
- 方法不存在 (`runNow`, `getActiveJobs`, `addStock`)
- 配置驗證錯誤
- 股票清單管理器初始化問題

#### 具體失敗項目:
1. `應該正確處理批次大小` - 測試超時
2. `應該正確回報狀態` - nextScheduledRun 屬性缺失
3. `應該能夠立即執行收集` - runNow 方法不存在
4. `應該能夠管理工作` - getActiveJobs 方法不存在
5. `應該能夠重置為預設配置` - enabled 為 false
6. `應該能夠驗證配置` - 返回類型錯誤
7. `應該正確初始化股票清單管理器` - getStockList 未定義
8. `應該能夠取得股票清單` - markets 不可迭代
9. `應該能夠按市場取得股票清單` - markets.find 不是函數
10. `應該能夠新增股票` - addStock 方法不存在
11. `應該能夠移除股票` - addStock 方法不存在
12. `應該能夠更新股票資訊` - addStock 方法不存在
13. `應該能夠按優先級排序` - addStock 方法不存在
14. `應該能夠處理排程器和收集器的協作` - runNow 方法不存在
15. `應該能夠處理配置變更對系統的影響` - enabled 為 false
16. `應該能夠處理大量股票清單` - addStock 方法不存在

**狀態**: 🔴 待修復

## 🔧 修復優先級

### 高優先級 (影響核心功能)
1. **API 端點測試** - 影響 API 功能驗證
2. **前端組件測試** - 影響 UI 功能驗證

### 中優先級 (影響系統完整性)
3. **AI 分析測試** - 影響分析功能

### 低優先級 (新功能)
4. **資料收集系統測試** - 新功能，可以延後修復

## 📝 修復計劃

### 階段 1: API 端點修復
- [ ] 檢查 OHLC API 內部錯誤
- [ ] 修復技術指標 API 參數驗證
- [ ] 修復 AI 分析 API 參數驗證
- [ ] 統一 API 回應格式

### 階段 2: 前端組件修復
- [ ] 修復 MultiChartLayout 組件的 data 處理
- [ ] 更新 TradingViewIndicatorSelector 測試文字
- [ ] 修復 selectedIndicators 類型問題

### 階段 3: AI 分析修復
- [ ] 檢查趨勢分析器評分計算邏輯

### 階段 4: 資料收集系統修復
- [ ] 實作缺失的方法
- [ ] 修復配置管理問題
- [ ] 增加測試超時時間

## 🎯 目標
- 將測試通過率從 74% 提升到 90% 以上
- 確保核心功能測試全部通過
- 改善測試穩定性和可靠性

---
**建立日期**: 2025-01-21
**版本**: v0.3.0
**狀態**: 進行中
