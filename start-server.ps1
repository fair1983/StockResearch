# 自動啟動股票研究系統伺服器

Write-Host "🚀 啟動股票研究系統..." -ForegroundColor Green

# 檢查伺服器是否已運行
$port = netstat -an | findstr :3000
if ($port) {
    Write-Host "✅ 伺服器已運行在 http://localhost:3000" -ForegroundColor Green
    Write-Host "📊 股票詳情: http://localhost:3000/TW/2330" -ForegroundColor Cyan
    exit 0
}

Write-Host "📡 啟動伺服器..." -ForegroundColor Yellow

# 檢查是否在正確的目錄
if (-not (Test-Path "package.json")) {
    Write-Host "❌ 錯誤：請在 StockResearch 目錄中執行此腳本" -ForegroundColor Red
    exit 1
}

# 啟動伺服器
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden

# 等待伺服器啟動
$startTime = Get-Date
$timeout = $startTime.AddSeconds(30)
$attempts = 0

while ((Get-Date) -lt $timeout) {
    $attempts++
    Write-Host "🔄 檢查伺服器狀態... (嘗試 $attempts)" -ForegroundColor Gray
    
    $port = netstat -an | findstr :3000
    if ($port) {
        Write-Host "✅ 伺服器成功啟動！" -ForegroundColor Green
        Write-Host "🌐 訪問地址: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "📊 股票詳情: http://localhost:3000/TW/2330" -ForegroundColor Cyan
        Write-Host "🎉 系統準備就緒！" -ForegroundColor Green
        exit 0
    }
    
    Start-Sleep -Seconds 2
}

Write-Host "❌ 30秒內伺服器未啟動" -ForegroundColor Red
Write-Host "🔧 嘗試手動執行: npm run dev" -ForegroundColor Yellow
exit 1
