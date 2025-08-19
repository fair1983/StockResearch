# 測試程式目錄

此目錄包含各種測試和探索程式，用於驗證股票資料來源的可用性。

## 📁 檔案分類

### 🔍 資料來源測試
- `test_taiwan_stock_sources.py` - 測試台股各種資料來源
- `test_nasdaq_ftp_final.py` - 測試 NASDAQ Trader FTP 資料收集
- `test_stock_collection_final.py` - 測試股票資料收集整合

### 🌐 FTP 探索
- `explore_nasdaq_ftp.py` - 探索 NASDAQ Trader FTP 目錄結構
- `explore_all_directories.py` - 探索所有 FTP 目錄內容

### 📊 資料解析
- `parse_taiwan_stock_data.py` - 解析台股 ISIN 資料
- `simple_taiwan_stock_parser.py` - 簡單台股資料解析器

### 🎯 最終收集器
- `final_taiwan_stock_collector.py` - 最終版台股資料收集器

## 🚀 使用方式

### 測試台股資料來源
```bash
cd tests
python3 test_taiwan_stock_sources.py
```

### 測試美股 FTP 資料
```bash
cd tests
python3 test_nasdaq_ftp_final.py
```

### 探索 NASDAQ FTP
```bash
cd tests
python3 explore_nasdaq_ftp.py
```

### 解析台股資料
```bash
cd tests
python3 parse_taiwan_stock_data.py
```

## 📋 測試結果

### ✅ 有效的資料來源
1. **證交所 OpenAPI** - 上市股票 (1,057 支)
2. **NASDAQ Trader FTP** - 美股資料 (11,700+ 支)
3. **SEC JSON** - 美股公司資料
4. **證交所 ISIN** - 上櫃/興櫃資料 (可解析)

### ❌ 無效的資料來源
1. **櫃買中心 OpenAPI** - 回傳 HTML 而非 JSON
2. **櫃買中心其他 API** - 全部回傳網頁內容

## 📊 資料統計

| 資料來源 | 狀態 | 數量 | 備註 |
|----------|------|------|------|
| 證交所上市 | ✅ | 1,057 支 | OpenAPI |
| NASDAQ FTP | ✅ | 11,700+ 支 | 包含 ETF |
| SEC JSON | ✅ | 8,000+ 支 | 公司資料 |
| 櫃買中心 | ❌ | 0 | API 異常 |

## 🔧 依賴套件

```bash
pip install requests pandas beautifulsoup4
```

## 📝 注意事項

1. 測試程式僅用於驗證資料來源可用性
2. 實際使用請使用根目錄的 `stock_data_collector.py`
3. 部分測試程式可能需要網路連線
4. FTP 測試可能需要較長時間
