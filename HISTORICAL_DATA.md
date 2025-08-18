# 歷史資料收集系統

這個系統可以自動抓取和儲存股票的完整歷史資料，支援多種時間週期和批次處理。

## 📁 資料儲存結構

```
data/
├── cache/                    # 快取資料 (24小時過期)
│   ├── TW/
│   │   └── 2330/
│   │       └── 1d.json
│   └── US/
│       └── AAPL/
│           └── 1d.json
└── historical/              # 永久歷史資料
    ├── TW/
    │   └── 2330/
    │       ├── 1d.json     # 日K資料
    │       ├── 1w.json     # 週K資料
    │       └── 1mo.json    # 月K資料
    └── US/
        └── AAPL/
            ├── 1d.json
            └── 1w.json
```

## 🕐 支援的時間週期

| 週期 | 說明 | 範例 |
|------|------|------|
| `1d` | 日K線 | 每日收盤價 |
| `1w` | 週K線 | 每週收盤價 |
| `1mo` | 月K線 | 每月收盤價 |
| `3mo` | 季K線 | 每季收盤價 |
| `6mo` | 半年K線 | 每半年收盤價 |
| `1y` | 年K線 | 每年收盤價 |

## 🚀 API 端點

### 1. 單一股票歷史資料收集

**POST** `/api/historical/collect`

```json
{
  "market": "TW",
  "symbol": "2330",
  "intervals": ["1d", "1w", "1mo"],
  "startDate": "2020-01-01",
  "endDate": "2024-12-31",
  "forceUpdate": false
}
```

**回應範例：**
```json
{
  "success": true,
  "message": "歷史資料收集完成: 3 成功, 0 失敗",
  "data": {
    "symbol": "TW/2330",
    "results": [
      {
        "market": "TW",
        "symbol": "2330",
        "interval": "1d",
        "success": true,
        "recordsCount": 1250,
        "dateRange": "2020-01-01 to 2024-12-31"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0
    }
  }
}
```

### 2. 批次股票歷史資料收集

**POST** `/api/historical/batch`

```json
{
  "symbols": [
    { "market": "TW", "symbol": "2330" },
    { "market": "TW", "symbol": "2454" },
    { "market": "US", "symbol": "AAPL" }
  ],
  "intervals": ["1d", "1w"],
  "startDate": "2023-01-01",
  "endDate": "2024-12-31",
  "forceUpdate": false
}
```

### 3. 查詢已儲存的股票

**GET** `/api/historical/collect`

**回應範例：**
```json
{
  "success": true,
  "data": {
    "totalSymbols": 15,
    "symbols": [
      {
        "market": "TW",
        "symbol": "2330",
        "intervals": ["1d", "1w", "1mo"]
      }
    ]
  }
}
```

### 4. 查詢特定股票狀態

**GET** `/api/historical/collect?market=TW&symbol=2330`

**回應範例：**
```json
{
  "success": true,
  "data": {
    "market": "TW",
    "symbol": "2330",
    "stats": [
      {
        "interval": "1d",
        "records": 1250,
        "dateRange": "2020-01-01 to 2024-12-31"
      }
    ]
  }
}
```

## 🧪 測試工具

使用內建的測試工具來驗證功能：

```bash
# 執行完整測試
node test-historical.js

# 或者使用 npm script
npm run test:historical
```

## 📊 使用範例

### 1. 收集台積電的完整歷史資料

```javascript
const response = await fetch('/api/historical/collect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    market: 'TW',
    symbol: '2330',
    intervals: ['1d', '1w', '1mo', '3mo', '6mo', '1y'],
    startDate: '2010-01-01',
    endDate: '2024-12-31'
  })
});

const result = await response.json();
console.log('收集結果:', result);
```

### 2. 批次收集熱門股票

```javascript
const response = await fetch('/api/historical/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: [
      { market: 'TW', symbol: '2330' }, // 台積電
      { market: 'TW', symbol: '2454' }, // 聯發科
      { market: 'US', symbol: 'AAPL' }, // 蘋果
      { market: 'US', symbol: 'GOOGL' } // Google
    ],
    intervals: ['1d', '1w'],
    startDate: '2020-01-01',
    endDate: '2024-12-31'
  })
});

const result = await response.json();
console.log('批次收集結果:', result);
```

### 3. 檢查資料狀態

```javascript
// 檢查所有已儲存的股票
const response = await fetch('/api/historical/collect');
const result = await response.json();
console.log('已儲存股票:', result.data.symbols);

// 檢查特定股票
const response2 = await fetch('/api/historical/collect?market=TW&symbol=2330');
const result2 = await response2.json();
console.log('台積電資料:', result2.data.stats);
```

## ⚙️ 配置選項

### 快取設定

在 `lib/stock-cache.ts` 中可以調整：

```typescript
private readonly CACHE_EXPIRY_HOURS = 24; // 快取過期時間
private readonly MAX_CACHE_SIZE_MB = 100;  // 最大快取大小
```

### 請求延遲

在 `lib/historical-data-manager.ts` 中可以調整：

```typescript
await this.delay(1000);  // 單一股票間隔
await this.delay(2000);  // 批次股票間隔
```

## 🔧 進階功能

### 1. 強制更新

使用 `forceUpdate: true` 可以強制重新抓取資料：

```json
{
  "market": "TW",
  "symbol": "2330",
  "intervals": ["1d"],
  "forceUpdate": true
}
```

### 2. 自訂日期範圍

指定特定的日期範圍：

```json
{
  "market": "TW",
  "symbol": "2330",
  "intervals": ["1d"],
  "startDate": "2023-01-01",
  "endDate": "2023-12-31"
}
```

### 3. 資料清理

清除特定股票的資料：

```javascript
const manager = new HistoricalDataManager();
await manager.clearSymbolData('TW', '2330');
```

## 📈 效能優化

1. **智慧快取**：避免重複抓取相同資料
2. **批次處理**：支援多股票同時處理
3. **延遲控制**：避免 API 限制
4. **錯誤處理**：自動重試和錯誤記錄
5. **資料驗證**：確保資料完整性

## 🚨 注意事項

1. **API 限制**：Yahoo Finance 有請求頻率限制
2. **資料大小**：歷史資料可能很大，注意磁碟空間
3. **網路穩定性**：確保網路連接穩定
4. **記憶體使用**：大量資料處理時注意記憶體使用

## 🔍 故障排除

### 常見問題

1. **API 錯誤 429**：請求過於頻繁，增加延遲時間
2. **資料不完整**：檢查網路連接和 API 可用性
3. **磁碟空間不足**：清理舊資料或增加磁碟空間
4. **記憶體不足**：減少批次大小或增加系統記憶體

### 日誌查看

查看詳細日誌：

```bash
# 查看 API 日誌
tail -f logs/api.log

# 查看 Yahoo Finance 日誌
tail -f logs/yahoo-finance.log
```
