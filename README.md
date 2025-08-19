# 股票研究圖表系統 (Stock Research Chart System)

一個基於 Next.js 的專業股票研究圖表系統，提供美股和台股的完整分析功能，包含即時圖表、技術指標、歷史資料收集和公司資訊等功能。

## 📋 版本資訊

**當前版本**: v0.2.0  
**更新日期**: 2025-01-19  
**Node.js 需求**: 18.0.0+  
**Next.js 版本**: 14.2.31

### 🆕 v0.2.0 更新內容 (2025-01-19)

#### ✨ 新功能
- **關注股票功能**: 用戶可以添加/移除股票到個人關注列表
- **熱門股票系統**: 預設熱門股票列表，包含台股和美股主要股票
- **技術指標重新設計**: 收縮式勾選框設計，滑鼠懸停顯示說明視窗
- **圖表佈局優化**: TradingView 風格的雙圖表佈局，支援可調整分割
- **股票列表頁面**: 完整的股票列表展示，支援篩選和搜尋
- **測試系統**: 完整的單元測試、效能測試和覆蓋率測試

#### 🔧 功能改進
- **搜尋功能優化**: 修復台股搜尋問題，支援 TW/US 交易所代碼
- **路由結構重構**: 從 `[market]/[symbol]` 改為 `[exchange]/[symbol]` 支援 TW/US
- **資料庫系統**: 本地股票資料庫，支援 16,000+ 股票資料
- **效能監控**: 自建效能監控系統，追蹤 API 調用和渲染效能
- **錯誤處理**: 完善的錯誤處理和用戶友好的錯誤提示

#### 🐛 Bug 修復
- **PriceChart 錯誤**: 修復 `getVisibleLogicalRange` 方法不存在的錯誤
- **搜尋功能**: 修復首頁快速搜尋無法找到台積電 (2330) 的問題
- **技術指標**: 修復技術指標組件 props 名稱不匹配問題
- **路由 API**: 修復新路由結構的 API 調用問題
- **測試錯誤**: 修復測試中的 console.error 輸出問題

#### 🧪 測試覆蓋
- **單元測試**: 57 個測試案例，覆蓋核心功能
- **效能測試**: 效能閾值檢查和監控
- **覆蓋率測試**: 59.52% 整體覆蓋率
- **自動化測試**: 完整的測試腳本和 CI/CD 準備

#### 📊 技術改進
- **TypeScript 優化**: 完善的類型定義和錯誤檢查
- **組件重構**: 模組化組件設計，提高可維護性
- **API 優化**: 統一的 API 響應格式和錯誤處理
- **資料驗證**: 嚴格的資料驗證和過濾機制

## 🎯 功能特色

### 📊 圖表分析
- **多市場支援**: 美股 (US) 和台股 (TW) 完整支援
- **多時間週期**: 日K、週K、月K、季K、年K 線圖
- **技術指標**: MACD、RSI、布林通道、移動平均線等 10+ 種指標
- **互動功能**: 縮放、平移、十字游標、工具提示
- **響應式設計**: 支援各種螢幕尺寸和裝置
- **雙圖表佈局**: TradingView 風格的可調整分割圖表
- **技術指標面板**: 收縮式設計，滑鼠懸停說明視窗

### 🔍 股票搜尋與管理
- **即時搜尋**: 支援股票代碼和名稱搜尋
- **分類管理**: 股票、ETF、指數自動分類
- **自動更新**: 從 API 自動更新股票列表
- **多市場**: 台股、美股、港股完整支援
- **關注列表**: 個人化股票關注功能
- **熱門股票**: 預設熱門股票快速訪問
- **本地資料庫**: 16,000+ 股票資料本地存儲

### 📈 歷史資料系統
- **自動化收集**: 批次處理多股票歷史資料
- **智慧快取**: 24小時快取機制，避免重複請求
- **資料驗證**: 確保資料完整性和準確性
- **批次處理**: 支援大量股票同時處理

### 🛠️ 後台管理
- **日誌監控**: 即時查看系統日誌和效能
- **配置管理**: 調整各種系統設定和參數
- **資料管理**: 股票列表更新和維護
- **效能監控**: 系統狀態和資源使用監控
- **測試系統**: 完整的單元測試和效能測試
- **品質保證**: 59.52% 測試覆蓋率

## 🏗️ 技術架構

### 前端技術棧
- **框架**: Next.js 14 + React 18 + TypeScript
- **樣式**: Tailwind CSS
- **圖表**: Lightweight Charts (專業級金融圖表)
- **狀態管理**: React Hooks + Context API

### 後端技術棧
- **API**: Next.js API Routes
- **資料來源**: Yahoo Finance API
- **快取**: 自建快取系統
- **日誌**: 自建日誌管理系統

### 核心依賴
```json
{
  "lightweight-charts": "^4.1.3",    // 專業級金融圖表
  "yahoo-finance2": "^2.13.3",       // 股票資料 API
  "axios": "^1.6.0",                 // HTTP 請求處理
  "next": "14.2.31",                 // React 框架
  "react": "^18",                    // UI 框架
  "tailwindcss": "^3.3.0"           // CSS 框架
}
```

## 🚀 快速開始

### 環境需求
- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **記憶體**: 建議 4GB 以上
- **磁碟空間**: 建議 10GB 以上可用空間

### 安裝步驟

1. **克隆專案**
```bash
git clone https://github.com/fair1983/StockResearch.git
cd StockResearch
```

2. **安裝依賴**
```bash
npm install
```

3. **環境設定** (可選)
```bash
cp env.example .env.local
# 編輯 .env.local 檔案，設定 API 金鑰等
```

4. **啟動開發伺服器**
```bash
npm run dev
```

5. **開啟瀏覽器**
訪問 `http://localhost:3000`

## 📖 使用指南

### 查看股票圖表
- **美股**: `http://localhost:3000/US/AAPL` (蘋果)
- **台股**: `http://localhost:3000/TW/2330` (台積電)

### 股票搜尋
- 在首頁搜尋框輸入股票代碼或名稱
- 支援模糊搜尋和自動完成
- 可依市場和分類篩選

### 關注股票功能
- 在股票詳情頁面點擊「關注股票」按鈕
- 在股票列表頁面 (`/symbols`) 管理關注列表
- 支援台股和美股混合關注

### 熱門股票
- 在股票列表頁面查看預設熱門股票
- 包含台股和美股主要股票
- 顯示熱門原因和分類

### 技術分析
- 在圖表頁面選擇不同的技術指標
- 調整指標參數和顯示設定
- 查看多時間週期的分析結果
- 使用收縮式技術指標選擇器
- 滑鼠懸停查看指標說明
- 支援雙圖表佈局，可調整分割比例

### 歷史資料收集
```bash
# 收集單一股票歷史資料
curl -X POST http://localhost:3000/api/historical/collect \
  -H "Content-Type: application/json" \
  -d '{
    "market": "TW",
    "symbol": "2330",
    "intervals": ["1d", "1w", "1mo"],
    "startDate": "2020-01-01",
    "endDate": "2024-12-31"
  }'

# 批次收集多股票資料
curl -X POST http://localhost:3000/api/historical/batch \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": [
      {"market": "TW", "symbol": "2330"},
      {"market": "US", "symbol": "AAPL"}
    ],
    "intervals": ["1d", "1w"],
    "startDate": "2023-01-01",
    "endDate": "2024-12-31"
  }'
```

### 後台管理
- **管理面板**: `http://localhost:3000/admin`
- 日誌管理：控制各種日誌開關
- 即時監控系統日誌
- 股票列表更新和管理

## 📁 專案結構

```
SideProject/
├── app/                    # Next.js App Router
│   ├── [exchange]/[symbol]/ # 動態股票頁面 (TW/US)
│   ├── symbols/            # 股票列表頁面
│   ├── admin/              # 後台管理系統
│   ├── api/                # API 端點
│   │   ├── ohlc/           # K線資料 API
│   │   ├── historical/     # 歷史資料收集
│   │   ├── fundamentals/   # 基本面資料
│   │   ├── search-stocks/  # 股票搜尋
│   │   ├── symbols/        # 股票代碼管理
│   │   ├── watchlist/      # 關注列表 API
│   │   └── data/           # 資料管理 API
│   └── globals.css         # 全域樣式
├── components/             # React 組件
│   ├── PriceChart.tsx      # 主要圖表組件
│   ├── TechnicalIndicators.tsx # 技術指標
│   ├── CompanyInfo.tsx     # 公司資訊
│   ├── StockSearch.tsx     # 股票搜尋
│   ├── DateRangeSelector.tsx # 日期選擇器
│   └── ResizableChartLayout.tsx # 可調整圖表佈局
├── lib/                    # 工具函式庫
│   ├── stock-database.ts   # 本地股票資料庫
│   ├── watchlist.ts        # 關注列表管理
│   ├── hot-stocks.ts       # 熱門股票系統
│   ├── performance-monitor.ts # 效能監控
│   ├── test-utils.ts       # 測試工具
│   ├── historical-data-manager.ts # 歷史資料管理
│   ├── stock-cache.ts      # 快取系統
│   ├── technical-indicators.ts # 技術指標計算
│   ├── yahoo-finance.ts    # Yahoo Finance 服務
│   └── stock-updater.ts    # 股票列表更新
├── data/                   # 資料儲存
│   ├── cache/             # 快取資料 (24小時過期)
│   ├── historical/        # 永久歷史資料
│   ├── stocks_data_*.jsonl # 股票資料檔案
│   └── stocks.json        # 股票列表
├── __tests__/             # Jest 測試目錄
│   ├── api.test.ts        # API 功能測試
│   ├── watchlist.test.ts  # 關注列表測試
│   └── hot-stocks.test.ts # 熱門股票測試
├── tests/                 # Python 測試程式目錄
│   ├── README.md          # 測試說明文件
│   ├── test_*.py          # 資料來源測試
│   ├── explore_*.py       # FTP 探索程式
│   ├── parse_*.py         # 資料解析程式
│   └── final_*.py         # 最終收集器
├── scripts/               # 自動化腳本
│   └── run-tests.js       # 測試運行腳本
├── docs/                  # 文件
├── jest.config.js         # Jest 配置
├── jest.setup.js          # Jest 設置
└── stock_data_collector.py # 股票資料收集器
```

## 🧪 測試系統

### 測試命令
```bash
# 運行所有測試
npm run test

# 運行特定測試
npm run test:watchlist    # 關注列表測試
npm run test:hot-stocks   # 熱門股票測試
npm run test:api          # API 功能測試

# 效能測試
npm run test:performance

# 覆蓋率測試
npm run test:coverage

# 完整測試套件
npm run test:run
```

### 測試覆蓋
- **單元測試**: 57 個測試案例
- **效能測試**: 效能閾值檢查
- **覆蓋率**: 59.52% 整體覆蓋率
- **自動化**: 完整的測試腳本

## 🔧 API 端點

### 圖表資料
- `GET /api/ohlc` - 取得 K線資料
- `GET /api/ohlc/paged` - 分頁 K線資料

### 歷史資料
- `POST /api/historical/collect` - 收集單一股票歷史資料
- `POST /api/historical/batch` - 批次收集歷史資料
- `GET /api/historical/collect` - 查詢已收集的股票

### 股票管理
- `GET /api/search-stocks` - 股票搜尋 (使用本地資料庫)
- `GET /api/symbols` - 股票代碼查詢
- `GET /api/fundamentals` - 基本面資料
- `GET /api/watchlist` - 獲取關注列表
- `POST /api/watchlist` - 管理關注列表 (添加/移除/清空)
- `GET /api/data` - 資料統計和管理

### 資料管理
- `GET /api/data` - 資料統計
- `GET /api/data?action=files` - 檔案列表
- `GET /api/data?action=validate&file=filename` - 驗證檔案
- `POST /api/data` - 備份/清理檔案

### 範例請求
```bash
# 取得台積電日K資料
curl "http://localhost:3000/api/ohlc?market=TW&symbol=2330&interval=1d"

# 搜尋股票
curl "http://localhost:3000/api/search-stocks?query=台積電&market=TW"

# 取得股票基本面資料
curl "http://localhost:3000/api/fundamentals?market=TW&symbol=2330"
```

## 🛠️ 管理工具

### 股票資料收集器
```bash
# 收集所有股票資料 (台股+美股)
python3 stock_data_collector.py

# 收集特定市場資料
python3 -c "
from stock_data_collector import StockDataCollector
collector = StockDataCollector()

# 只收集台股
twse_stocks = collector.get_twse_listed_stocks()
collector.save_stocks_data(twse_stocks, 'taiwan_stocks.jsonl')

# 只收集美股
nasdaq_stocks = collector.get_nasdaq_ftp_stocks()
collector.save_stocks_data(nasdaq_stocks, 'us_stocks.jsonl')
"
```

### 資料管理
```bash
# 查看資料統計
curl "http://localhost:3000/api/data?action=stats"

# 查看檔案列表
curl "http://localhost:3000/api/data?action=files"

# 驗證資料檔案
curl "http://localhost:3000/api/data?action=validate&file=stocks_data_20250819_093615.jsonl"

# 備份檔案
curl -X POST "http://localhost:3000/api/data" \
  -H "Content-Type: application/json" \
  -d '{"action":"backup","filename":"stocks_data_20250819_093615.jsonl"}'

# 清理舊檔案
curl -X POST "http://localhost:3000/api/data" \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup","keepDays":7}'
```

### PowerShell 腳本 (Windows)
```powershell
# 快速啟動 (15秒內完成)
.\quick-start.ps1

# 完整啟動和監控
.\start-server.ps1

# 功能測試
.\test-server.ps1
```

### 測試工具
```bash
# 執行完整測試
node tests/run-all-tests.js

# 測試特定功能
node tests/test-historical.js
node tests/test-api.js

# 測試資料來源 (Python)
cd tests
python3 test_taiwan_stock_sources.py
python3 test_nasdaq_ftp_final.py
```

## ⚙️ 配置選項

### 環境變數
建立 `.env.local` 檔案：
```env
# 可選：Alpha Vantage API Key (備用資料來源)
ALPHAVANTAGE_API_KEY=your_api_key_here

# 可選：基礎 URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# 可選：快取設定
CACHE_EXPIRY_HOURS=24
MAX_CACHE_SIZE_MB=100
```

### 快取設定
在 `lib/stock-cache.ts` 中調整：
```typescript
private readonly CACHE_EXPIRY_HOURS = 24; // 快取過期時間
private readonly MAX_CACHE_SIZE_MB = 100;  // 最大快取大小
```

### 請求延遲
在 `lib/historical-data-manager.ts` 中調整：
```typescript
await this.delay(1000);  // 單一股票間隔
await this.delay(2000);  // 批次股票間隔
```

## 📊 支援的市場和資料

### 股票市場
- **台股 (TW)**: 1,057+ 支股票 (上市 1,057)
- **美股 (US)**: 14,920+ 支股票 (NASDAQ 5,043 + Other 6,656 + SEC 3,221)
- **港股 (HK)**: 2,000+ 支股票

### 資料來源
| 市場 | 資料來源 | 狀態 | 數量 | 備註 |
|------|----------|------|------|------|
| 台股上市 | 證交所 OpenAPI | ✅ | 1,057 支 | 即時更新 |
| 美股 NASDAQ | NASDAQ Trader FTP | ✅ | 5,043 支 | 主要交易所 |
| 美股 Other | NASDAQ Trader FTP | ✅ | 6,656 支 | 其他交易所 |
| 美股 SEC | SEC JSON | ✅ | 3,221 支 | 公司資料 |

### 時間週期
| 週期 | 說明 | 範例 |
|------|------|------|
| `1d` | 日K線 | 每日收盤價 |
| `1w` | 週K線 | 每週收盤價 |
| `1mo` | 月K線 | 每月收盤價 |
| `3mo` | 季K線 | 每季收盤價 |
| `6mo` | 半年K線 | 每半年收盤價 |
| `1y` | 年K線 | 每年收盤價 |

### 技術指標
- **趨勢指標**: 移動平均線 (MA)、指數移動平均線 (EMA)
- **動量指標**: RSI、MACD、隨機指標 (Stochastic)
- **波動指標**: 布林通道 (Bollinger Bands)、ATR
- **成交量指標**: 成交量、成交量移動平均

## 🚀 部署

### Vercel 部署 (推薦)
1. 將專案推送到 GitHub
2. 在 Vercel 中連接 GitHub 倉庫
3. 設定環境變數
4. 自動部署

### 其他平台
支援任何支援 Next.js 的部署平台：
- **Netlify**: 靜態網站部署
- **Railway**: 全端應用部署
- **DigitalOcean App Platform**: 雲端部署
- **AWS Amplify**: AWS 雲端部署

### Docker 部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔍 故障排除

### 常見問題

1. **伺服器啟動失敗**
   ```bash
   # 檢查 Node.js 版本
   node --version
   
   # 重新安裝依賴
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **API 錯誤 429**
   - 增加請求延遲時間
   - 檢查 API 使用限制
   - 使用快取減少請求

3. **圖表無法顯示**
   - 檢查網路連接
   - 確認股票代碼正確
   - 查看瀏覽器開發者工具錯誤

4. **記憶體不足**
   - 減少批次處理大小
   - 清理快取資料
   - 增加系統記憶體

### 日誌查看
```bash
# 查看 API 日誌
tail -f logs/api.log

# 查看 Yahoo Finance 日誌
tail -f logs/yahoo-finance.log

# 查看系統日誌
tail -f logs/system.log
```

## 📈 效能優化

### 快取策略
- **API 快取**: 24小時快取機制
- **圖表快取**: 本地儲存圖表資料
- **搜尋快取**: 搜尋結果快取

### 資料優化
- **批次處理**: 多股票同時處理
- **延遲控制**: 避免 API 限制
- **資料壓縮**: 減少傳輸大小

### 前端優化
- **程式碼分割**: 按需載入組件
- **圖片優化**: 自動圖片壓縮
- **CDN 快取**: 靜態資源快取

## 🤝 貢獻指南

### 開發環境設定
1. Fork 專案
2. 建立功能分支
3. 提交變更
4. 建立 Pull Request

### 程式碼規範
- 使用 TypeScript
- 遵循 ESLint 規則
- 撰寫單元測試
- 更新文件

### 測試架構

本專案採用完整的測試策略，包括單元測試、效能測試和覆蓋率測試。

#### 測試框架
- **Jest**: 主要測試框架
- **React Testing Library**: React 組件測試
- **效能監控**: 自定義效能監控工具

#### 測試類型
- **單元測試**: 功能邏輯、數據格式、錯誤處理
- **效能測試**: 執行時間、記憶體使用、效能閾值
- **覆蓋率測試**: 代碼覆蓋率要求 59%+

#### 測試命令
```bash
# 執行所有測試
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

# 執行特定測試
npm test -- --grep "API"

# 檢查程式碼品質
npm run lint
```

#### 測試結果
- ✅ **52 個測試案例全部通過**
- ✅ **效能測試在閾值內**
- ✅ **覆蓋率達到要求**
- ✅ **錯誤處理完整**

#### 測試文件結構
```
__tests__/
├── watchlist.test.ts      # 關注股票功能測試
├── hot-stocks.test.ts     # 熱門股票功能測試
└── api.test.ts           # 核心功能測試

lib/
├── performance-monitor.ts # 效能監控工具
└── test-utils.ts         # 測試工具函數

scripts/
└── run-tests.js          # 測試運行腳本
```

## 📋 版本歷史

### v0.2.0 (2025-01-19)
- ✨ 新增關注股票功能
- ✨ 新增熱門股票系統
- ✨ 重新設計技術指標選擇器
- ✨ 新增雙圖表佈局
- 🔧 修復搜尋功能問題
- 🔧 優化路由結構
- 🧪 新增完整測試系統

### v0.1.0 (2024-12-01)
- 🎉 初始版本發布
- 📊 基本圖表功能
- 🔍 股票搜尋功能
- 📈 歷史資料收集
- 🛠️ 後台管理系統

## 📄 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

## 📞 聯絡與支援

- **GitHub Issues**: [提交問題](https://github.com/fair1983/StockResearch/issues)
- **Email**: toyop.tw@gmail.com
- **開發者**: fair1983

## 🙏 致謝

- [Yahoo Finance](https://finance.yahoo.com/) - 股票資料來源
- [Lightweight Charts](https://www.tradingview.com/lightweight-charts/) - 圖表庫
- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

---

**⭐ 如果這個專案對您有幫助，請給我們一個星標！**
