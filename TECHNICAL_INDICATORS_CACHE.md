# 技術指標快取系統

這個系統可以將計算好的技術指標資料儲存起來，避免重複計算，提高效能，並方便後續分析使用。

## 📁 快取儲存結構

```
data/
└── indicators/                    # 技術指標快取目錄
    ├── TW/                       # 台股市場
    │   ├── 2330/                # 台積電
    │   │   ├── 1d_indicators.json    # 日K技術指標
    │   │   ├── 1w_indicators.json    # 週K技術指標
    │   │   └── 1M_indicators.json    # 月K技術指標
    │   └── 0050/                # 元大台灣50
    │       └── 1d_indicators.json
    └── US/                       # 美股市場
        └── AAPL/                # 蘋果
            └── 1d_indicators.json
```

## 📊 支援的技術指標

### 趨勢指標
- **MA** (移動平均線): MA5, MA10, MA20
- **EMA** (指數移動平均線): EMA12, EMA26
- **BOLL** (布林通道): 上軌、中軌、下軌
- **ADX** (平均趨向指標)

### 動量指標
- **MACD**: MACD線、信號線、柱狀圖
- **RSI** (相對強弱指標)
- **STOCH** (隨機指標): K線、D線
- **KDJ**: K線、D線、J線
- **CCI** (順勢指標)

### 波動指標
- **ATR** (平均真實波幅)

### 成交量指標
- **VOL** (成交量)
- **OBV** (能量潮)

## 🚀 API 端點

### 1. 計算並快取技術指標

**POST** `/api/indicators`

```json
{
  "market": "TW",
  "symbol": "2330",
  "interval": "1d",
  "data": [...],
  "forceRecalculate": false
}
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "market": "TW",
    "symbol": "2330",
    "interval": "1d",
    "indicators": {
      "ma5": [null, null, null, null, 109.6, 112.6, ...],
      "ma10": [null, null, null, null, null, null, ...],
      "rsi": [null, null, null, null, null, null, ...],
      ...
    },
    "cached": true
  }
}
```

### 2. 取得快取統計資訊

**GET** `/api/indicators?action=stats`

**回應範例：**
```json
{
  "success": true,
  "data": {
    "totalFiles": 15,
    "totalSize": 245760,
    "markets": {
      "TW": 10,
      "US": 5
    }
  }
}
```

### 3. 清除快取

**GET** `/api/indicators?action=clear&market=TW&symbol=2330`

**回應範例：**
```json
{
  "success": true,
  "message": "已清除 TW/2330 的技術指標快取"
}
```

## 💾 快取檔案格式

每個快取檔案包含以下資訊：

```json
{
  "market": "TW",
  "symbol": "2330",
  "interval": "1d",
  "lastUpdated": "2025-08-20T05:33:28.286Z",
  "dataHash": "59c8bc34",
  "indicators": {
    "ma5": [null, null, null, null, 109.6, 112.6, 115.4, 118, 120.4, 122.8],
    "ma10": [null, null, null, null, null, null, null, null, null, 116.2],
    "ma20": [null, null, null, null, null, null, null, null, null, null],
    "ema12": [...],
    "ema26": [...],
    "macd": {
      "macd": [...],
      "signal": [...],
      "histogram": [...]
    },
    "rsi": [...],
    "bollinger": {
      "upper": [...],
      "middle": [...],
      "lower": [...]
    },
    "kdj": {
      "k": [...],
      "d": [...],
      "j": [...]
    },
    "stochastic": {
      "k": [...],
      "d": [...]
    },
    "cci": [...],
    "atr": [...],
    "adx": [...],
    "obv": [...],
    "volume": [...]
  }
}
```

## 🔧 快取機制

### 資料雜湊檢查
- 使用最後 10 筆資料的關鍵資訊生成雜湊值
- 當原始資料變更時，會自動重新計算指標
- 確保快取資料與原始資料的一致性

### 過期機制
- 快取過期時間：24 小時
- 過期後會自動重新計算並更新快取
- 可手動清除特定股票或所有快取

### 效能優化
- 按市場/股票代碼/時間週期分別快取
- 避免重複計算相同指標
- 支援增量更新（只計算新增資料）

## 📈 使用場景

### 1. 圖表顯示
- 快速載入技術指標，提升圖表渲染速度
- 減少前端計算負擔
- 支援多種指標同時顯示

### 2. 技術分析
- 儲存歷史指標資料，方便回測分析
- 支援批量指標計算
- 可用於策略開發和驗證

### 3. 資料導出
- 將技術指標資料匯出為 CSV/JSON 格式
- 支援第三方分析工具整合
- 可用於機器學習模型訓練

## 🛠️ 管理工具

### 網頁管理介面
訪問 `/indicators-cache` 可以：
- 查看快取統計資訊
- 清除特定市場或所有快取
- 監控快取使用情況

### 程式化管理
```typescript
import { TechnicalIndicatorsCache } from '@/lib/technical-indicators-cache';

const cache = new TechnicalIndicatorsCache();

// 計算並快取指標
const indicators = await cache.calculateAndCacheIndicators('TW', '2330', '1d', data);

// 清除快取
await cache.clearIndicatorsCache('TW', '2330');

// 取得統計資訊
const stats = await cache.getCacheStats();
```

## ⚙️ 設定選項

### 快取過期時間
在 `lib/technical-indicators-cache.ts` 中調整：
```typescript
private readonly CACHE_EXPIRY_HOURS = 24; // 快取過期時間（小時）
```

### 資料雜湊長度
```typescript
const lastData = data.slice(-10); // 取最後10筆資料生成雜湊
```

## 📊 效能監控

### 快取命中率
- 監控快取命中/未命中比例
- 優化快取策略
- 調整過期時間

### 儲存空間
- 定期清理過期快取
- 監控磁碟使用量
- 設定最大快取大小限制

## 🔄 更新機制

### 自動更新
- 當原始 K 線資料更新時，自動重新計算指標
- 支援增量更新，只計算新增的資料點
- 保持快取資料的時效性

### 手動更新
- 可強制重新計算特定股票的指標
- 支援批量更新多個股票
- 提供更新進度回饋

---

*更新日期: 2025-08-20*  
*版本: v1.0.0*
