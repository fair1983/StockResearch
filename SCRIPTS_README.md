# 股票研究系統腳本使用說明

這個目錄包含了自動化腳本來管理股票研究系統的伺服器。

## 📁 腳本檔案

### 1. `quick-start.ps1` - 快速啟動腳本
**功能**：15秒內自動啟動伺服器
**使用方式**：
```powershell
.\quick-start.ps1
```

**特點**：
- ⚡ 快速啟動（15秒內完成）
- 🔍 自動檢測伺服器狀態
- ✅ 成功/失敗狀態顯示
- 🎯 簡單易用

### 2. `start-server.ps1` - 完整啟動腳本
**功能**：完整的伺服器啟動和監控
**使用方式**：
```powershell
# 使用預設設定
.\start-server.ps1

# 自訂參數
.\start-server.ps1 -MaxRetries 10 -CheckInterval 30 -RetryDelay 10
```

**參數說明**：
- `MaxRetries`：最大重試次數（預設：5）
- `CheckInterval`：檢查間隔秒數（預設：15）
- `RetryDelay`：重試延遲秒數（預設：5）

**特點**：
- 🔄 自動重試機制
- 📊 詳細狀態監控
- 🛡️ 錯誤處理
- 🔄 持續監控和自動重啟

### 3. `test-server.ps1` - 功能測試腳本
**功能**：測試所有 API 端點和功能
**使用方式**：
```powershell
.\test-server.ps1
```

**測試項目**：
- ✅ 主頁面
- ✅ 台積電圖表頁面
- ✅ 蘋果圖表頁面
- ✅ 股票資料 API
- ✅ 歷史資料 API

## 🚀 快速開始

### 第一次使用
```powershell
# 1. 快速啟動伺服器
.\quick-start.ps1

# 2. 測試功能
.\test-server.ps1
```

### 日常使用
```powershell
# 啟動伺服器（推薦）
.\quick-start.ps1

# 或者使用完整版本
.\start-server.ps1
```

## 📊 腳本功能對比

| 功能 | quick-start.ps1 | start-server.ps1 | test-server.ps1 |
|------|----------------|------------------|-----------------|
| 快速啟動 | ✅ | ✅ | ❌ |
| 自動重試 | ❌ | ✅ | ❌ |
| 持續監控 | ❌ | ✅ | ❌ |
| 功能測試 | ❌ | ❌ | ✅ |
| 詳細日誌 | ❌ | ✅ | ✅ |
| 錯誤處理 | 基本 | 完整 | 基本 |

## 🔧 故障排除

### 常見問題

1. **腳本無法執行**
   ```powershell
   # 檢查執行政策
   Get-ExecutionPolicy
   
   # 設定執行政策（如果需要）
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **伺服器啟動失敗**
   ```powershell
   # 檢查 Node.js 是否安裝
   node --version
   
   # 檢查依賴是否安裝
   npm install
   ```

3. **端口被佔用**
   ```powershell
   # 檢查端口使用情況
   netstat -an | findstr :3000
   
   # 終止佔用端口的程序
   taskkill /f /im node.exe
   ```

### 錯誤代碼

| 代碼 | 說明 | 解決方案 |
|------|------|----------|
| 0 | 成功 | 無需處理 |
| 1 | 伺服器未啟動 | 檢查 Node.js 和依賴 |
| 2 | 端口被佔用 | 終止其他 Node.js 程序 |
| 3 | 網路錯誤 | 檢查網路連接 |

## 📝 日誌說明

### 顏色代碼
- 🟢 **綠色**：成功/正常
- 🟡 **黃色**：警告/等待
- 🔴 **紅色**：錯誤/失敗
- 🔵 **藍色**：資訊/狀態
- ⚪ **灰色**：詳細資訊

### 日誌格式
```
[時間] [狀態] [訊息] [詳細資訊]
```

## 🎯 最佳實踐

1. **日常使用**：使用 `quick-start.ps1`
2. **開發測試**：使用 `test-server.ps1`
3. **生產環境**：使用 `start-server.ps1`
4. **故障排除**：查看詳細日誌和錯誤訊息

## 🔄 自動化建議

### 開機自啟動
```powershell
# 建立捷徑到啟動資料夾
$startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
Copy-Item ".\quick-start.ps1" "$startupFolder\StockResearch.ps1"
```

### 定時檢查
```powershell
# 建立定時任務（每小時檢查一次）
Register-ScheduledJob -Name "StockResearchMonitor" -ScriptBlock {
    Set-Location "D:\GitHub\StockResearch"
    .\test-server.ps1
} -Trigger (New-JobTrigger -Once -At "00:00" -RepetitionInterval (New-TimeSpan -Hours 1) -RepeatIndefinitely)
```

## 📞 支援

如果遇到問題，請檢查：
1. Node.js 版本（建議 18+）
2. 專案依賴是否完整
3. 網路連接是否正常
4. 防火牆設定
5. 系統權限
