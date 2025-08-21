# 智能股票資料收集系統

這是一個專門設計用於高效收集大量股票資料的智能系統，解決了 yfinance 在處理 1萬多支股票時可能遇到的問題。

## 🎯 系統目標

- **避免 API 限制**: 通過智能限流和批次處理避免被 yfinance 擋住
- **提高效率**: 只更新需要更新的股票，節省時間和資源
- **智能排程**: 自動化資料收集，減少人工干預
- **錯誤處理**: 完善的重試機制和錯誤恢復
- **可擴展性**: 模組化設計，易於新增市場和股票

## 🏗️ 系統架構

```
lib/data-collection/
├── stock-data-collector.ts      # 智能資料收集器
├── stock-list-manager.ts        # 股票清單管理器
├── data-collection-scheduler.ts # 資料收集排程器
└── README.md                    # 模組說明
```

## 🔧 核心功能

### 1. 智能資料收集器 (StockDataCollector)

#### 防擋機制
- **並發限制**: 預設最多 3 個並發請求
- **請求間隔**: 每次請求間隔 1 秒
- **批次處理**: 每批處理 50 支股票
- **批次間隔**: 批次間隔 5 秒

#### 錯誤處理
- **重試機制**: 失敗時自動重試 3 次
- **遞增延遲**: 重試間隔逐漸增加
- **超時控制**: 30 秒請求超時
- **錯誤記錄**: 詳細記錄失敗原因

#### 優先級排序
```typescript
// 按優先級和更新時間排序
1. 高優先級股票 (priority: 5)
2. 中優先級股票 (priority: 4)
3. 低優先級股票 (priority: 3)
4. 同優先級按最後更新時間排序
```

### 2. 股票清單管理器 (StockListManager)

#### 預設市場配置
```json
{
  "TW": {
    "name": "台灣股市",
    "symbols": ["2330", "2317", "2454", ...],
    "priority": 5,
    "enabled": true
  },
  "US": {
    "name": "美國股市", 
    "symbols": ["AAPL", "MSFT", "GOOGL", ...],
    "priority": 4,
    "enabled": true
  },
  "HK": {
    "name": "香港股市",
    "symbols": ["0700", "0941", "9988", ...],
    "priority": 3,
    "enabled": true
  }
}
```

#### 智能更新檢測
- 只更新超過 24 小時的股票資料
- 支援自定義更新間隔
- 按市場和優先級分類統計

### 3. 資料收集排程器 (DataCollectionScheduler)

#### 排程模式
- **完整收集**: 收集所有股票資料
- **增量更新**: 只更新需要更新的股票
- **市場收集**: 收集特定市場的股票

#### 自動化排程
- **Cron 表達式**: 支援複雜的排程規則
- **預設排程**: 每 4 小時執行一次
- **可配置**: 支援自定義排程時間

## 🚀 使用方式

### 1. 基本配置

```typescript
import { DataCollectionScheduler } from '@/lib/data-collection/data-collection-scheduler';

const scheduler = new DataCollectionScheduler({
  enabled: true,
  interval: '0 */4 * * *', // 每4小時
  markets: ['TW', 'US'],
  updateOnly: true,
  maxAgeHours: 24
});
```

### 2. 啟動排程器

```typescript
// 啟動自動排程
scheduler.start();

// 手動觸發收集
const jobId = await scheduler.triggerCollection('update', ['TW']);
```

### 3. 可調整的時間間隔

#### 全域時間間隔設定
```typescript
// 排程間隔 (Cron 表達式)
scheduleInterval: '0 */4 * * *'  // 每4小時
scheduleInterval: '0 */2 * * *'  // 每2小時
scheduleInterval: '0 */6 * * *'  // 每6小時

// 更新間隔 (小時)
updateInterval: 4  // 4小時
updateInterval: 2  // 2小時
updateInterval: 6  // 6小時
```

#### 個別市場時間間隔
```typescript
markets: {
  TW: {
    enabled: true,
    priority: 5,
    updateInterval: 4,  // 台灣股市每4小時更新
    maxConcurrent: 3
  },
  US: {
    enabled: true,
    priority: 4,
    updateInterval: 6,  // 美國股市每6小時更新
    maxConcurrent: 2
  },
  HK: {
    enabled: true,
    priority: 3,
    updateInterval: 8,  // 香港股市每8小時更新
    maxConcurrent: 2
  }
}
```

#### 時間間隔調整方式

**1. 透過配置頁面調整**
- 訪問 `/data-collection-config`
- 在「時間間隔」標籤頁調整全域間隔
- 在「市場配置」標籤頁調整個別市場間隔

**2. 透過 API 調整**
```bash
# 設定全域時間間隔
POST /api/data-collection
{
  "action": "setInterval",
  "interval": "0 */2 * * *",
  "hours": 2
}

# 設定特定市場時間間隔
POST /api/data-collection
{
  "action": "setMarketInterval",
  "marketCode": "TW",
  "marketHours": 4
}
```

**3. 透過配置檔案調整**
```json
{
  "scheduleInterval": "0 */4 * * *",
  "updateInterval": 4,
  "markets": {
    "TW": {
      "updateInterval": 4
    },
    "US": {
      "updateInterval": 6
    }
  }
}
```

### 4. API 使用

#### 啟動排程器
```bash
POST /api/data-collection
{
  "action": "start"
}
```

#### 手動觸發收集
```bash
POST /api/data-collection
{
  "action": "trigger",
  "type": "update",
  "markets": ["TW", "US"]
}
```

#### 查詢狀態
```bash
GET /api/data-collection?action=status
GET /api/data-collection?action=jobs
GET /api/data-collection?action=stats
```

#### 監控相關 API
```bash
# 取得詳細進度
GET /api/data-collection?action=progress

# 取得監控資料
GET /api/data-collection?action=monitor

# 取得特定工作進度
GET /api/data-collection?action=job&jobId=manual_1234567890
```

#### 配置相關 API
```bash
# 取得完整配置
GET /api/data-collection?action=config

# 取得配置摘要
GET /api/data-collection?action=configSummary

# 驗證配置
GET /api/data-collection?action=validateConfig

# 更新配置
POST /api/data-collection
{
  "action": "updateConfig",
  "configType": "basic",
  "updates": { "enabled": true }
}
```

### 5. 頁面功能

**監控頁面** (`/data-collection-monitor`)
- 系統狀態概覽
- 活躍工作進度
- 已完成工作歷史
- 市場進度分離
- 效能指標統計

**配置頁面** (`/data-collection-config`)
- 基本設定（啟用/停用、自動啟動）
- 時間間隔設定（全域和個別市場）
- 市場配置（優先級、更新間隔）
- 收集器設定（並發數、批次大小等）
- 監控設定（刷新間隔、日誌等級）
- 效能設定（限流、記憶體使用）
- 配置匯入/匯出功能

## 📊 效能優化策略

### 1. 批次處理
```
總股票數: 10,000 支
批次大小: 50 支/批
總批次數: 200 批
批次間隔: 5 秒
總時間: ~17 分鐘
```

### 2. 智能更新
```
需要更新: 500 支 (5%)
批次大小: 50 支/批
總批次數: 10 批
批次間隔: 5 秒
總時間: ~1 分鐘
```

### 3. 並發控制
```
並發數: 3
請求間隔: 1 秒
每分鐘處理: 180 支股票
避免 API 限制: ✅
```

## 🔍 監控與管理

### 1. 即時狀態監控

#### 系統狀態概覽
```typescript
{
  "isCollecting": true,
  "activeJobs": 2,
  "totalJobs": 15,
  "systemHealth": "healthy",
  "lastUpdate": "2025-08-20T10:30:00.000Z",
  "performance": {
    "totalStocksProcessed": 5000,
    "averageSuccessRate": 95.2,
    "averageProcessingTime": 1200
  }
}
```

#### 工作進度追蹤
```typescript
{
  "jobId": "manual_1234567890",
  "type": "update",
  "status": "running",
  "startTime": "2025-08-20T10:30:00.000Z",
  "progress": {
    "total": 500,
    "completed": 150,
    "success": 145,
    "failed": 5,
    "currentBatch": 3,
    "totalBatches": 10,
    "currentStock": "TW/2330",
    "currentMarket": "TW"
  },
  "performance": {
    "averageTimePerStock": 1200,
    "estimatedTimeRemaining": 420000,
    "successRate": 96.7,
    "throughput": 50
  },
  "errors": ["TW/1234: 網路超時", "US/AAPL: API 限制"]
}
```

#### 市場進度監控
```typescript
{
  "market": "TW",
  "total": 500,
  "completed": 300,
  "success": 285,
  "failed": 15,
  "inProgress": 50,
  "pending": 150,
  "progress": 60.0
}
```

### 2. 詳細統計資訊
```typescript
{
  "jobs": {
    "active": 2,
    "completed": 13,
    "failed": 1,
    "total": 16
  },
  "stocks": {
    "total": 10000,
    "success": 9500,
    "failed": 500,
    "successRate": 95.0
  },
  "performance": {
    "averageProcessingTime": 1200,
    "averageThroughput": 50,
    "bestPerformance": 800,
    "worstPerformance": 3000
  },
  "markets": {
    "TW": {
      "total": 500,
      "success": 475,
      "failed": 25,
      "successRate": 95.0
    }
  }
}
```

### 3. 監控頁面功能
- **即時進度條**: 顯示當前工作進度
- **系統健康度**: 綠色/黃色/紅色狀態指示
- **效能指標**: 平均處理時間、成功率、吞吐量
- **錯誤追蹤**: 即時顯示錯誤訊息
- **預估時間**: 計算剩餘完成時間
- **市場分離**: 按市場顯示進度
- **自動刷新**: 每5秒自動更新狀態

### 4. 錯誤處理與警報
- 詳細的錯誤日誌記錄
- 失敗股票清單和原因
- 自動重試機制
- 錯誤統計報告
- 系統健康度監控
- 效能異常警報

## 🛡️ 防護機制

### 1. API 限制防護
- **請求頻率限制**: 每秒最多 1 個請求
- **並發數限制**: 最多 3 個並發請求
- **批次間隔**: 批次間隔 5 秒
- **指數退避**: 失敗時延遲時間遞增

### 2. 錯誤恢復
- **自動重試**: 失敗時自動重試 3 次
- **部分成功**: 部分失敗不影響整體進度
- **狀態保存**: 保存收集進度，支援斷點續傳
- **錯誤隔離**: 單支股票失敗不影響其他股票

### 3. 資源管理
- **記憶體控制**: 批次處理避免記憶體溢出
- **磁碟空間**: 定期清理舊資料
- **網路超時**: 30 秒請求超時
- **進程管理**: 支援優雅停止和重啟

## 📈 擴展性設計

### 1. 新增市場
```typescript
// 在 markets.json 中新增
{
  "JP": {
    "name": "日本股市",
    "symbols": ["7203", "6758", "9984"],
    "priority": 2,
    "enabled": true
  }
}
```

### 2. 自定義收集器
```typescript
class CustomCollector extends StockDataCollector {
  async collectSingleStock(stock: StockInfo): Promise<void> {
    // 實作自定義收集邏輯
  }
}
```

### 3. 多資料源支援
```typescript
// 支援多個資料源
const collectors = {
  yahoo: new YahooFinanceCollector(),
  alpha: new AlphaVantageCollector(),
  quandl: new QuandlCollector()
};
```

## 🚀 部署建議

### 1. 生產環境配置
```typescript
const productionConfig = {
  maxConcurrent: 2,        // 降低並發數
  delayBetweenRequests: 2000, // 增加間隔
  retryAttempts: 5,        // 增加重試次數
  batchSize: 30,           // 減少批次大小
  timeout: 60000           // 增加超時時間
};
```

### 2. 監控設定
- **日誌監控**: 監控收集日誌
- **效能監控**: 監控收集速度和成功率
- **錯誤警報**: 失敗率過高時發送警報
- **資源監控**: 監控 CPU 和記憶體使用

### 3. 備份策略
- **資料備份**: 定期備份股票資料
- **配置備份**: 備份市場配置
- **日誌備份**: 保留收集日誌
- **災難恢復**: 制定恢復計劃

## ⚠️ 注意事項

1. **API 限制**: 遵守 yfinance 的使用條款
2. **網路穩定性**: 確保網路連接穩定
3. **磁碟空間**: 定期清理舊資料
4. **監控告警**: 設定適當的監控和告警
5. **備份策略**: 實施資料備份策略

## 🔮 未來發展

### 短期目標
- [ ] 支援更多資料源
- [ ] 實作資料驗證
- [ ] 增加資料壓縮
- [ ] 優化記憶體使用

### 中期目標
- [ ] 實作分散式收集
- [ ] 增加機器學習預測
- [ ] 支援即時資料流
- [ ] 開發 Web UI

### 長期目標
- [ ] 實作雲端部署
- [ ] 支援全球市場
- [ ] 開發移動應用
- [ ] 實作自動交易

---

*更新日期: 2025-08-20*  
*版本: v1.0.0*
