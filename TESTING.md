# 測試文檔

## 概述

本專案採用完整的測試策略，包括單元測試、效能測試和覆蓋率測試。所有功能都必須通過測試才能被認為是完整的。

## 測試架構

### 1. 測試框架
- **Jest**: 主要測試框架
- **React Testing Library**: React 組件測試
- **效能監控**: 自定義效能監控工具

### 2. 測試類型

#### 單元測試
- 功能邏輯測試
- 數據格式驗證
- 錯誤處理測試
- 邊界情況測試

#### 效能測試
- 執行時間測量
- 記憶體使用監控
- 效能閾值檢查

#### 覆蓋率測試
- 代碼覆蓋率要求：80%
- 分支覆蓋率要求：80%
- 函數覆蓋率要求：80%

## 測試文件結構

```
__tests__/
├── watchlist.test.ts      # 關注股票功能測試
├── hot-stocks.test.ts     # 熱門股票功能測試
└── api.test.ts           # API 端點測試

lib/
├── performance-monitor.ts # 效能監控工具
└── test-utils.ts         # 測試工具函數

scripts/
└── run-tests.js          # 測試運行腳本
```

## 運行測試

### 基本測試命令

```bash
# 運行所有測試
npm test

# 運行特定測試
npm run test:watchlist
npm run test:hot-stocks
npm run test:api

# 運行效能測試
npm run test:performance

# 運行覆蓋率測試
npm run test:coverage

# 運行完整測試套件
npm run test:run
```

### 測試模式

```bash
# 監視模式（開發時使用）
npm run test:watch

# 詳細輸出
npm run test:all
```

## 測試案例詳解

### 1. 關注股票功能測試 (`watchlist.test.ts`)

#### 基本功能測試
- ✅ 添加股票到關注列表
- ✅ 從關注列表移除股票
- ✅ 檢查股票是否在關注列表中
- ✅ 防止重複添加相同股票

#### 數據格式測試
- ✅ 關注列表數據格式驗證
- ✅ 必要字段檢查
- ✅ 數據類型驗證

#### 統計功能測試
- ✅ 獲取關注列表統計
- ✅ 按市場分類統計
- ✅ 按類別分類統計

#### 效能測試
- ✅ 大量數據操作效能
- ✅ 查詢操作效能
- ✅ 記憶體使用監控

#### 錯誤處理測試
- ✅ localStorage 錯誤處理
- ✅ 無效 JSON 數據處理
- ✅ 邊界情況處理

### 2. 熱門股票功能測試 (`hot-stocks.test.ts`)

#### 基本功能測試
- ✅ 獲取所有熱門股票
- ✅ 按市場篩選熱門股票
- ✅ 檢查股票是否為熱門股票
- ✅ 獲取熱門股票原因

#### 數據完整性測試
- ✅ 股票數據格式驗證
- ✅ 主要股票包含檢查
- ✅ 分類完整性檢查
- ✅ 唯一性驗證

#### 效能測試
- ✅ 查詢效能測試
- ✅ 列表獲取效能測試
- ✅ 大量數據處理效能

#### 邊界情況測試
- ✅ 無效參數處理
- ✅ 空參數處理
- ✅ null/undefined 處理

### 3. API 端點測試 (`api.test.ts`)

#### 關注股票 API 測試
- ✅ GET /api/watchlist
- ✅ POST /api/watchlist (添加)
- ✅ POST /api/watchlist (移除)
- ✅ POST /api/watchlist (清空)

#### 股票列表 API 測試
- ✅ GET /api/symbols
- ✅ 市場篩選測試
- ✅ 類別篩選測試
- ✅ 搜尋功能測試

#### 搜尋 API 測試
- ✅ GET /api/search-stocks
- ✅ POST /api/search-stocks

#### 錯誤處理測試
- ✅ 無效請求處理
- ✅ 缺少參數處理
- ✅ 重複操作處理

## 效能監控

### 效能指標

1. **執行時間**
   - 單元測試：< 100ms
   - API 調用：< 2000ms
   - 組件渲染：< 500ms

2. **記憶體使用**
   - 關注列表操作：< 10MB
   - 股票數據處理：< 50MB

3. **覆蓋率要求**
   - 總覆蓋率：≥ 80%
   - 分支覆蓋率：≥ 80%
   - 函數覆蓋率：≥ 80%

### 效能監控工具

```typescript
import { measurePerformanceSync, getPerformanceReport } from '@/lib/performance-monitor';

// 測量同步操作
const result = measurePerformanceSync('operation-name', () => {
  // 要測量的操作
  return someOperation();
});

// 測量異步操作
const result = await measurePerformance('async-operation', async () => {
  return await someAsyncOperation();
});

// 獲取效能報告
const report = getPerformanceReport();
console.log(report.summary);
```

## 測試數據

### 模擬數據生成

```typescript
import { TestDataGenerator } from '@/lib/test-utils';

// 生成隨機股票代碼
const symbol = TestDataGenerator.generateStockSymbol('TW');

// 生成隨機股票名稱
const name = TestDataGenerator.generateStockName();

// 生成隨機價格數據
const price = TestDataGenerator.generatePriceData(100, 0.1);

// 生成隨機成交量
const volume = TestDataGenerator.generateVolume(100000, 10000000);
```

### 測試數據驗證

```typescript
import { TestAssertions } from '@/lib/test-utils';

// 驗證股票數據格式
TestAssertions.validateStockData(stock);

// 驗證 OHLC 數據格式
TestAssertions.validateOHLCData(data);

// 驗證關注列表數據格式
TestAssertions.validateWatchlistData(watchlist);
```

## 持續整合

### 測試流程

1. **開發階段**
   - 編寫測試案例
   - 運行單元測試
   - 檢查覆蓋率

2. **提交前**
   - 運行完整測試套件
   - 效能測試驗證
   - 覆蓋率檢查

3. **部署前**
   - 端到端測試
   - 效能基準測試
   - 安全性測試

### 測試報告

每次測試運行都會生成詳細的報告，包括：

- 測試結果摘要
- 效能指標
- 覆蓋率報告
- 失敗測試詳情
- 效能警告

## 最佳實踐

### 1. 測試編寫原則

- **AAA 模式**: Arrange, Act, Assert
- **單一職責**: 每個測試只測試一個功能
- **可讀性**: 測試名稱清楚描述測試內容
- **獨立性**: 測試之間不依賴

### 2. 效能測試原則

- **基準測試**: 建立效能基準
- **回歸測試**: 防止效能退化
- **負載測試**: 測試極限情況
- **監控告警**: 設置效能閾值

### 3. 覆蓋率原則

- **關鍵路徑**: 100% 覆蓋
- **錯誤處理**: 100% 覆蓋
- **邊界情況**: 100% 覆蓋
- **業務邏輯**: ≥ 90% 覆蓋

## 故障排除

### 常見問題

1. **測試失敗**
   - 檢查測試環境
   - 驗證模擬數據
   - 檢查依賴關係

2. **效能問題**
   - 分析效能報告
   - 檢查記憶體洩漏
   - 優化算法

3. **覆蓋率不足**
   - 添加缺失測試
   - 檢查分支覆蓋
   - 補充邊界測試

### 調試技巧

```bash
# 運行單個測試
npm test -- --testNamePattern="測試名稱"

# 詳細輸出
npm test -- --verbose

# 只運行失敗的測試
npm test -- --onlyFailures
```

## 更新日誌

### v1.0.0 (2025-01-XX)
- ✅ 建立完整測試架構
- ✅ 實現關注股票功能測試
- ✅ 實現熱門股票功能測試
- ✅ 實現 API 端點測試
- ✅ 建立效能監控系統
- ✅ 達到 80% 覆蓋率目標
