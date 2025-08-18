# 股票研究圖表系統 (Stock Chart Research System)

一個基於 Next.js 的股票研究圖表系統，提供美股和台股的 K線圖分析功能。

## 🎯 功能特色

### 📊 圖表功能
- **日K線圖**：使用 Lightweight Charts 顯示互動式 K線圖
- **多市場支援**：美股 (US) 和台股 (TW)
- **資料排序**：正序顯示圖表，倒序顯示最近成交資料
- **響應式設計**：支援各種螢幕尺寸

### 🔧 技術架構
- **前端**：Next.js 14 + React 18 + TypeScript
- **樣式**：Tailwind CSS
- **圖表**：Lightweight Charts
- **資料來源**：Yahoo Finance API
- **日誌系統**：自建日誌管理系統

### 🛠️ 管理功能
- **後台管理**：`/admin` 頁面控制日誌開關
- **日誌監控**：即時查看系統日誌
- **配置管理**：可調整各種日誌設定
- **日誌導出**：支援 JSON 格式導出

## 🚀 快速開始

### 環境需求
- Node.js 18+ 
- npm 或 yarn

### 安裝步驟

1. **克隆專案**
```bash
git clone <your-repo-url>
cd stock-chart-research
```

2. **安裝依賴**
```bash
npm install
```

3. **啟動開發伺服器**
```bash
npm run dev
```

4. **開啟瀏覽器**
訪問 `http://localhost:3000`

## 📖 使用方式

### 查看股票圖表
- **美股**：`http://localhost:3000/US/AAPL`
- **台股**：`http://localhost:3000/TW/2330`

### 後台管理
- **日誌管理**：`http://localhost:3000/admin`
- 可控制各種日誌開關
- 即時監控系統日誌
- 支援日誌導出

### API 端點
```
GET /api/ohlc?market=US&symbol=AAPL
GET /api/ohlc?market=TW&symbol=2330
```

## 🏗️ 專案結構

```
├── app/                    # Next.js App Router
│   ├── admin/             # 後台管理頁面
│   ├── api/               # API 路由
│   ├── [market]/          # 動態路由
│   └── globals.css        # 全域樣式
├── components/            # React 組件
│   └── PriceChart.tsx     # K線圖組件
├── lib/                   # 工具函式庫
│   ├── logger.ts          # 日誌管理
│   └── yahoo-finance.ts   # Yahoo Finance 服務
├── types/                 # TypeScript 類型定義
└── test-api.js           # API 測試工具
```

## 🔧 開發指南

### 日誌系統
系統使用自建的日誌管理系統，支援：
- **API 日誌**：請求、回應、錯誤、時間
- **Yahoo Finance 日誌**：請求、回應、錯誤、資料範圍
- **前端日誌**：資料獲取、圖表渲染、錯誤
- **系統日誌**：快取、效能

### 測試工具
```bash
# 快速測試
node test-api.js quick

# 完整測試
node test-api.js full

# 單一測試
node test-api.js single US AAPL
```

## 📝 環境變數

建立 `.env.local` 檔案：
```env
# 可選：Alpha Vantage API Key (作為備用資料來源)
ALPHAVANTAGE_API_KEY=your_api_key_here

# 可選：資料庫連接 (未來功能)
DATABASE_URL=your_database_url_here

# 可選：基礎 URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🚀 部署

### Vercel 部署
1. 將專案推送到 GitHub
2. 在 Vercel 中連接 GitHub 倉庫
3. 設定環境變數
4. 自動部署

### 其他平台
支援任何支援 Next.js 的部署平台：
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 📞 聯絡

如有問題，請提交 Issue 或聯絡開發者。
