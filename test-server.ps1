# 伺服器功能測試腳本

Write-Host "🧪 股票研究系統功能測試" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# 測試配置
$baseUrl = "http://localhost:3000"
$testEndpoints = @(
    @{ path = "/"; name = "主頁面" },
    @{ path = "/TW/2330"; name = "台積電圖表" },
    @{ path = "/US/AAPL"; name = "蘋果圖表" },
    @{ path = "/api/ohlc?market=TW&symbol=2330"; name = "台積電API" },
    @{ path = "/api/historical/collect"; name = "歷史資料API" }
)

function Test-Endpoint {
    param($url, $name)
    
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $name - 正常 (${$response.StatusCode})" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  $name - 異常 (${$response.StatusCode})" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "❌ $name - 錯誤: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ServerRunning {
    $port = netstat -an | findstr :3000
    return $port -ne $null
}

# 主測試程序
Write-Host "`n🔍 檢查伺服器狀態..." -ForegroundColor Cyan

if (-not (Test-ServerRunning)) {
    Write-Host "❌ 伺服器未運行，請先啟動伺服器" -ForegroundColor Red
    Write-Host "💡 使用命令: .\quick-start.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 伺服器正在運行" -ForegroundColor Green

Write-Host "`n🌐 測試 API 端點..." -ForegroundColor Cyan

$successCount = 0
$totalCount = $testEndpoints.Count

foreach ($endpoint in $testEndpoints) {
    $url = "$baseUrl$($endpoint.path)"
    if (Test-Endpoint -url $url -name $endpoint.name) {
        $successCount++
    }
    Start-Sleep -Seconds 1  # 避免請求過於頻繁
}

Write-Host "`n📊 測試結果摘要:" -ForegroundColor Cyan
Write-Host "   成功: $successCount/$totalCount" -ForegroundColor Green

if ($successCount -eq $totalCount) {
    Write-Host "🎉 所有測試通過！系統運行正常" -ForegroundColor Green
} else {
    Write-Host "⚠️  部分測試失敗，請檢查系統狀態" -ForegroundColor Yellow
}

Write-Host "`n🔗 可用連結:" -ForegroundColor Cyan
Write-Host "   主頁面: $baseUrl" -ForegroundColor Gray
Write-Host "   台積電: $baseUrl/TW/2330" -ForegroundColor Gray
Write-Host "   蘋果: $baseUrl/US/AAPL" -ForegroundColor Gray
Write-Host "   後台管理: $baseUrl/admin" -ForegroundColor Gray
