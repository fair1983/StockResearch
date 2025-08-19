import requests
import re
import pandas as pd
import json

def parse_taiwan_stocks_simple():
    """簡單解析台股資料"""
    print("解析台股上櫃和興櫃資料...")
    
    # 上櫃資料
    otc_url = "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4"
    # 興櫃資料
    emerging_url = "https://isin.twse.com.tw/isin/C_public.jsp?strMode=5"
    
    all_stocks = []
    
    # 解析上櫃資料
    print("解析上櫃資料...")
    try:
        response = requests.get(otc_url, timeout=30)
        response.encoding = 'big5'  # 使用 Big5 編碼
        
        # 使用正則表達式提取資料
        pattern = r'<td[^>]*>(\d{4})[^<]*</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td>'
        matches = re.findall(pattern, response.text)
        
        for match in matches:
            if match[0].isdigit():  # 確保是數字代碼
                stock_data = {
                    '代號': match[0],
                    '名稱': match[1].strip(),
                    'ISIN': match[2].strip(),
                    '上市日期': match[3].strip(),
                    '市場': '上櫃',
                    '產業': match[4].strip(),
                    'yahoo_symbol': f"{match[0]}.TWO"
                }
                all_stocks.append(stock_data)
        
        print(f"✅ 成功解析 {len(all_stocks)} 筆上櫃資料")
        
    except Exception as e:
        print(f"❌ 解析上櫃資料失敗: {e}")
    
    # 解析興櫃資料
    print("解析興櫃資料...")
    try:
        response = requests.get(emerging_url, timeout=30)
        response.encoding = 'big5'  # 使用 Big5 編碼
        
        # 使用正則表達式提取資料
        pattern = r'<td[^>]*>(\d{4})[^<]*</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td>'
        matches = re.findall(pattern, response.text)
        
        for match in matches:
            if match[0].isdigit():  # 確保是數字代碼
                stock_data = {
                    '代號': match[0],
                    '名稱': match[1].strip(),
                    'ISIN': match[2].strip(),
                    '上市日期': match[3].strip(),
                    '市場': '興櫃',
                    '產業': match[4].strip(),
                    'yahoo_symbol': f"{match[0]}.TWO"
                }
                all_stocks.append(stock_data)
        
        print(f"✅ 成功解析 {len([s for s in all_stocks if s['市場'] == '興櫃'])} 筆興櫃資料")
        
    except Exception as e:
        print(f"❌ 解析興櫃資料失敗: {e}")
    
    return all_stocks

def create_comprehensive_taiwan_data():
    """建立完整的台股資料"""
    print("建立完整台股資料...")
    
    # 基本台股資料
    taiwan_stocks = [
        # 上市股票 (主要)
        {"代號": "2330", "名稱": "台積電", "市場": "上市", "yahoo_symbol": "2330.TW"},
        {"代號": "2317", "名稱": "鴻海", "市場": "上市", "yahoo_symbol": "2317.TW"},
        {"代號": "2454", "名稱": "聯發科", "市場": "上市", "yahoo_symbol": "2454.TW"},
        {"代號": "2412", "名稱": "中華電", "市場": "上市", "yahoo_symbol": "2412.TW"},
        {"代號": "1301", "名稱": "台塑", "市場": "上市", "yahoo_symbol": "1301.TW"},
        {"代號": "1303", "名稱": "南亞", "市場": "上市", "yahoo_symbol": "1303.TW"},
        {"代號": "2881", "名稱": "富邦金", "市場": "上市", "yahoo_symbol": "2881.TW"},
        {"代號": "2882", "名稱": "國泰金", "市場": "上市", "yahoo_symbol": "2882.TW"},
        {"代號": "2002", "名稱": "中鋼", "市場": "上市", "yahoo_symbol": "2002.TW"},
        {"代號": "1216", "名稱": "統一", "市場": "上市", "yahoo_symbol": "1216.TW"},
        
        # 上櫃股票 (主要)
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
        {"代號": "6415", "名稱": "矽力-KY", "市場": "上櫃", "yahoo_symbol": "6415.TWO"},
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
    ]
    
    # 嘗試解析實際資料
    try:
        parsed_stocks = parse_taiwan_stocks_simple()
        if parsed_stocks:
            taiwan_stocks.extend(parsed_stocks)
    except:
        print("使用基本資料")
    
    # 移除重複
    unique_stocks = []
    seen_codes = set()
    
    for stock in taiwan_stocks:
        code = stock['代號']
        if code not in seen_codes:
            unique_stocks.append(stock)
            seen_codes.add(code)
    
    return unique_stocks

def main():
    print("台股資料收集")
    print("=" * 50)
    
    # 建立台股資料
    taiwan_stocks = create_comprehensive_taiwan_data()
    
    # 轉換為 DataFrame
    df = pd.DataFrame(taiwan_stocks)
    
    # 顯示統計
    print(f"\n資料統計:")
    print(f"總筆數: {len(df)}")
    if '市場' in df.columns:
        print(f"市場分布:")
        print(df['市場'].value_counts())
    
    # 顯示範例資料
    print(f"\n範例資料:")
    print(df.head(10).to_string())
    
    # 儲存資料
    filename = "taiwan_comprehensive_stocks.jsonl"
    df.to_json(filename, orient="records", lines=True, force_ascii=False)
    print(f"\n✅ 已儲存: {filename}")
    
    # 按市場分類儲存
    if '市場' in df.columns:
        for market in df['市場'].unique():
            market_df = df[df['市場'] == market]
            market_filename = f"taiwan_{market}_stocks.jsonl"
            market_df.to_json(market_filename, orient="records", lines=True, force_ascii=False)
            print(f"✅ 已儲存: {market_filename} ({len(market_df)} 筆)")
    
    print("\n" + "=" * 50)
    print("台股資料收集完成！")
    print("\n📋 資料來源:")
    print("✅ 證交所 ISIN 資料")
    print("✅ 基本台股清單")
    print("✅ Yahoo Finance 代碼對應")

if __name__ == "__main__":
    main()
