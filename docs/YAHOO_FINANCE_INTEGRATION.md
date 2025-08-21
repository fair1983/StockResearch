# Yahoo Finance 數據整合文檔

## 📋 概述

本系統已成功整合 Yahoo Finance API，實現了真實股票數據的收集、存儲和分析功能。系統支持多個市場（美股、台股、港股、日股、中股）的數據收集，並按照市場和股票代碼分類存儲。

## 🏗️ 系統架構

### 核心模組

1. **YahooFinanceCollector** (`lib/data/yahoo-finance-collector.ts`)
   - 負責從 Yahoo Finance API 獲取數據
   - 支持報價數據和歷史數據收集
   - 自動數據分類存儲

2. **MarketConfig** (`lib/data/market-config.ts`)
   - 定義各市場的股票列表
   - 配置市場信息（貨幣、時區等）

3. **DataConverter** (`lib/data/data-converter.ts`)
   - 將 Yahoo Finance 數據轉換為應用程序格式
   - 計算技術指標和評分

4. **API Routes** (`app/api/yahoo-finance/route.ts`)
   - 提供 RESTful API 接口
   - 支持單個和批量數據獲取

## 📊 數據存儲結構

```
data/yahoo-finance/
├── US/                    # 美國股市
│   ├── quotes/           # 報價數據
│   │   ├── AAPL.json
│   │   ├── MSFT.json
│   │   └── ...
│   ├── historical/       # 歷史數據
│   │   ├── AAPL.json
│   │   ├── MSFT.json
│   │   └── ...
│   └── metadata/         # 市場元數據
│       └── market-info.json
├── TW/                    # 台灣股市
│   ├── quotes/
│   ├── historical/
│   └── metadata/
├── HK/                    # 香港股市
├── JP/                    # 日本股市
└── CN/                    # 中國股市
```

## 🚀 使用方法

### 1. 數據收集腳本

```bash
# 收集所有市場數據
npx tsx scripts/collect-yahoo-finance-data.ts all

# 收集特定市場數據
npx tsx scripts/collect-yahoo-finance-data.ts market US
npx tsx scripts/collect-yahoo-finance-data.ts market TW

# 收集單個股票數據
npx tsx scripts/collect-yahoo-finance-data.ts stock AAPL US
npx tsx scripts/collect-yahoo-finance-data.ts stock 2330.TW TW

# 檢查數據狀態
npx tsx scripts/collect-yahoo-finance-data.ts status
```

### 2. API 使用

#### 獲取市場列表
```bash
GET /api/yahoo-finance?type=markets
```

#### 獲取單個股票報價
```bash
GET /api/yahoo-finance?symbol=AAPL&market=US&type=quote
```

#### 獲取單個股票歷史數據
```bash
GET /api/yahoo-finance?symbol=AAPL&market=US&type=historical
```

#### 批量獲取股票數據
```bash
POST /api/yahoo-finance
Content-Type: application/json

{
  "symbols": ["AAPL", "MSFT", "GOOGL"],
  "market": "US",
  "type": "quote"
}
```

## 📈 支持的市場和股票

### 美國股市 (US)
- **科技股**: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX, ADBE, CRM, ORCL, INTC, AMD, QCOM, AVGO, TXN, MU, AMAT, KLAC, LRCX, ASML, TSM, SMCI, PLTR, SNOW, CRWD, ZS, OKTA, TEAM
- **金融股**: JPM, BAC, WFC, GS, MS, C, USB, PNC, TFC, COF, AXP, BLK, SCHW, ICE, CME, SPGI, MCO, FICO, V, MA
- **醫療保健**: JNJ, PFE, UNH, ABBV, MRK, TMO, ABT, DHR, BMY, AMGN, GILD, CVS, ANTM, CI, HUM, ELV, ISRG, REGN, VRTX, BIIB
- **消費品**: PG, KO, PEP, WMT, HD, MCD, SBUX, NKE, DIS, CMCSA, VZ, T, TMUS, CHTR, CMG, YUM, TGT, COST, LOW, TJX
- **能源和工業**: XOM, CVX, COP, EOG, SLB, BA, CAT, GE, MMM, HON, UPS, FDX, RTX, LMT, NOC, GD, DE, EMR, ETN, ITW

### 台灣股市 (TW)
- **半導體**: 2330.TW, 2317.TW, 2454.TW, 2308.TW, 2379.TW, 2449.TW, 3034.TW, 3008.TW, 2303.TW, 2408.TW, 2481.TW, 2458.TW, 2439.TW, 2441.TW, 2451.TW, 2376.TW
- **電子零組件**: 2327.TW, 2354.TW, 2357.TW, 2382.TW, 2392.TW, 2409.TW, 2412.TW, 2421.TW, 2436.TW, 2442.TW, 2450.TW, 2474.TW, 2480.TW, 2498.TW, 3005.TW, 3019.TW
- **金融業**: 2881.TW, 2882.TW, 2884.TW, 2885.TW, 2886.TW, 2887.TW, 2888.TW, 2889.TW, 2890.TW, 2891.TW, 2892.TW, 5871.TW, 5880.TW, 2880.TW, 2883.TW, 2801.TW
- **傳產**: 1301.TW, 1303.TW, 1326.TW, 1402.TW, 1419.TW, 1434.TW, 1440.TW, 1455.TW, 1476.TW, 1504.TW, 1513.TW, 1522.TW, 1536.TW, 1605.TW, 1702.TW, 1710.TW
- **其他科技**: 2002.TW, 2207.TW, 2301.TW, 2302.TW, 2313.TW, 2324.TW, 2337.TW, 2347.TW, 2353.TW, 2356.TW, 2360.TW, 2377.TW, 2383.TW, 2393.TW, 2404.TW, 2417.TW

### 香港股市 (HK)
- **主要股票**: 0700.HK, 0941.HK, 0005.HK, 1299.HK, 0388.HK, 0939.HK, 1398.HK, 3988.HK, 2318.HK, 2628.HK, 3328.HK, 3968.HK, 6862.HK, 9618.HK, 9988.HK, 3690.HK

### 日本股市 (JP)
- **主要股票**: 7203.T, 6758.T, 6861.T, 9984.T, 7974.T, 6954.T, 8306.T, 9433.T, 9432.T, 9434.T, 4502.T, 4519.T, 4523.T, 4568.T, 4578.T, 6501.T

### 中國股市 (CN)
- **主要股票**: 000001.SZ, 000002.SZ, 000858.SZ, 002415.SZ, 002594.SZ, 300059.SZ, 600000.SS, 600036.SS, 600519.SS, 600887.SS, 601318.SS, 601398.SS

## 🔧 數據格式

### 報價數據格式
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "market": "US",
  "currency": "USD",
  "exchange": "NMS",
  "timestamp": 1755720001,
  "regularMarketPrice": 226.01,
  "regularMarketChange": -4.55,
  "regularMarketChangePercent": -1.97,
  "regularMarketVolume": 42145912,
  "fiftyTwoWeekHigh": 260.1,
  "fiftyTwoWeekLow": 169.21,
  "lastUpdated": "2025-08-21T06:14:02.763Z"
}
```

### 歷史數據格式
```json
{
  "symbol": "AAPL",
  "market": "US",
  "data": [
    {
      "date": "2024-08-21",
      "open": 226.52,
      "high": 227.98,
      "low": 225.05,
      "close": 226.40,
      "volume": 34765500,
      "adjClose": 226.40
    }
  ],
  "lastUpdated": "2025-08-21T06:14:02.763Z"
}
```

## ⚙️ 配置選項

### 數據存儲配置
```typescript
const config = {
  baseDir: './data/yahoo-finance',
  markets: {
    US: {
      name: '美國股市',
      currency: 'USD',
      timezone: 'America/New_York',
      symbols: ['AAPL', 'MSFT', ...]
    },
    TW: {
      name: '台灣股市',
      currency: 'TWD',
      timezone: 'Asia/Taipei',
      symbols: ['2330.TW', '2317.TW', ...]
    }
  }
};
```

## 🔄 數據更新機制

1. **自動檢查**: 系統會檢查數據是否超過 24 小時
2. **智能更新**: 只有過期數據才會重新獲取
3. **錯誤處理**: 獲取失敗時使用本地緩存數據
4. **批量處理**: 支持批量更新多個股票

## 📊 性能優化

1. **延遲控制**: 請求間添加延遲避免 API 限制
2. **數據緩存**: 本地存儲減少重複請求
3. **批量處理**: 支持批量數據獲取
4. **錯誤重試**: 自動重試失敗的請求

## 🛠️ 故障排除

### 常見問題

1. **API 限制**: 添加更多延遲或減少批量請求數量
2. **數據格式變化**: 檢查 Yahoo Finance API 文檔更新
3. **網絡問題**: 檢查網絡連接和代理設置
4. **存儲空間**: 確保有足夠的磁盤空間

### 日誌檢查
```bash
# 檢查數據收集日誌
tail -f logs/yahoo-finance.log

# 檢查 API 錯誤
grep "ERROR" logs/yahoo-finance.log
```

## 🔮 未來改進

1. **實時數據**: 實現 WebSocket 連接獲取實時數據
2. **更多指標**: 添加更多技術指標和基本面數據
3. **數據庫存儲**: 遷移到 PostgreSQL 或 MongoDB
4. **機器學習**: 整合 AI 模型進行預測分析
5. **回測系統**: 實現策略回測功能

## 📞 支持

如有問題，請檢查：
1. 網絡連接是否正常
2. Yahoo Finance API 是否可訪問
3. 存儲權限是否正確
4. 配置參數是否正確
