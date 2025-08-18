# 部署指南

本指南說明如何將股票研究圖表系統部署到不同的平台。

## 環境需求

- Node.js 18+ 
- npm 或 yarn
- Alpha Vantage API Key（可選，用於美股資料）

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境設定

```bash
# 複製環境變數範例
cp env.example .env.local

# 編輯環境變數
nano .env.local
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看結果。

## Vercel 部署（推薦）

### 1. 準備專案

```bash
# 確保程式碼已提交到 Git
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. 連接 Vercel

1. 前往 [Vercel](https://vercel.com)
2. 使用 GitHub 登入
3. 點擊 "New Project"
4. 選擇你的 GitHub 倉庫
5. 設定環境變數：
   - `ALPHAVANTAGE_API_KEY`: 你的 Alpha Vantage API Key
   - `NEXT_PUBLIC_BASE_URL`: 你的 Vercel 網址

### 3. 自動部署

Vercel 會自動偵測 Next.js 專案並部署。每次推送到 main 分支都會觸發重新部署。

## Docker 部署

### 1. 建立 Dockerfile

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

### 2. 建立 .dockerignore

```
node_modules
.next
.git
.env*
```

### 3. 建立 Docker 映像

```bash
docker build -t stock-chart-app .
```

### 4. 執行容器

```bash
docker run -p 3000:3000 \
  -e ALPHAVANTAGE_API_KEY=your_api_key \
  stock-chart-app
```

## 傳統伺服器部署

### 1. 建置專案

```bash
npm run build
```

### 2. 啟動生產伺服器

```bash
npm start
```

### 3. 使用 PM2（推薦）

```bash
# 安裝 PM2
npm install -g pm2

# 啟動應用
pm2 start npm --name "stock-chart" -- start

# 設定開機自啟
pm2 startup
pm2 save
```

## 環境變數

| 變數名稱 | 必填 | 說明 |
|---------|------|------|
| `ALPHAVANTAGE_API_KEY` | 否 | Alpha Vantage API Key（美股資料） |
| `DATABASE_URL` | 否 | 資料庫連接字串 |
| `NEXT_PUBLIC_BASE_URL` | 否 | 前端基準 URL |

## 效能優化

### 1. 快取設定

系統已包含以下快取機制：
- API 回應快取（1小時）
- 靜態資源快取
- CDN 快取支援

### 2. 資料庫（可選）

如需長期資料儲存，建議使用 TimescaleDB：

```sql
-- 建立表格
CREATE TABLE ohlc (
  market VARCHAR(2) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  tf VARCHAR(3) NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  volume BIGINT,
  adj_close DECIMAL(10,2)
);

-- 建立時序索引
SELECT create_hypertable('ohlc', 'ts');
```

### 3. Redis 快取（可選）

```bash
# 安裝 Redis
npm install redis

# 設定環境變數
REDIS_URL=redis://localhost:6379
```

## 監控與日誌

### 1. 應用日誌

```bash
# 查看 PM2 日誌
pm2 logs stock-chart

# 查看錯誤日誌
pm2 logs stock-chart --err
```

### 2. 效能監控

建議使用以下工具：
- Vercel Analytics（Vercel 部署）
- Sentry（錯誤追蹤）
- New Relic（效能監控）

## 安全考量

### 1. API 金鑰管理

- 使用環境變數儲存敏感資訊
- 定期輪換 API 金鑰
- 限制 API 金鑰權限

### 2. 速率限制

```javascript
// 在 next.config.js 中設定
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-RateLimit-Limit',
            value: '100',
          },
        ],
      },
    ]
  },
}
```

### 3. CORS 設定

```javascript
// 在 API 路由中設定
export async function GET(request: NextRequest) {
  const response = NextResponse.json(data);
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
```

## 故障排除

### 常見問題

1. **API 金鑰錯誤**
   - 檢查環境變數設定
   - 確認 API 金鑰有效
   - 檢查 API 使用限制

2. **資料載入失敗**
   - 檢查網路連接
   - 確認資料來源可用性
   - 查看伺服器日誌

3. **圖表不顯示**
   - 檢查瀏覽器控制台錯誤
   - 確認資料格式正確
   - 檢查 JavaScript 錯誤

### 支援

如遇問題，請：
1. 查看 [README.md](README.md)
2. 檢查 [Issues](../../issues)
3. 提交新的 Issue

## 更新部署

### 1. 更新程式碼

```bash
git pull origin main
npm install
npm run build
```

### 2. 重新啟動服務

```bash
# PM2
pm2 restart stock-chart

# Docker
docker-compose up -d

# 傳統部署
npm start
```
