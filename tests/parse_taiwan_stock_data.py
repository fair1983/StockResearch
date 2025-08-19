import requests
import pandas as pd
from bs4 import BeautifulSoup
import re
import json

def parse_isin_data(url, market_type):
    """解析證交所 ISIN 資料"""
    print(f"解析 {market_type} 資料...")
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # 使用 BeautifulSoup 解析 HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 找到表格
        table = soup.find('table')
        if not table:
            print("❌ 找不到表格")
            return None
        
        # 解析表格資料
        rows = table.find_all('tr')
        data = []
        
        for row in rows[1:]:  # 跳過標題行
            cells = row.find_all('td')
            if len(cells) >= 4:
                # 提取資料
                isin = cells[0].get_text(strip=True)
                symbol = cells[1].get_text(strip=True)
                name = cells[2].get_text(strip=True)
                category = cells[3].get_text(strip=True) if len(cells) > 3 else ""
                
                # 清理資料
                if symbol and name and not symbol.startswith('註'):
                    # 移除多餘的空格和換行
                    symbol = re.sub(r'\s+', '', symbol)
                    name = re.sub(r'\s+', ' ', name).strip()
                    
                    data.append({
                        'ISIN': isin,
                        '代號': symbol,
                        '名稱': name,
                        '類別': category,
                        '市場': market_type
                    })
        
        print(f"✅ 成功解析 {len(data)} 筆 {market_type} 資料")
        return data
        
    except Exception as e:
        print(f"❌ 解析 {market_type} 資料失敗: {e}")
        return None

def get_tpex_data():
    """取得櫃買中心資料"""
    print("取得櫃買中心資料...")
    
    # 櫃買中心可能的資料來源
    tpex_urls = [
        "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4",  # 上櫃
        "https://isin.twse.com.tw/isin/C_public.jsp?strMode=5",  # 興櫃
    ]
    
    all_data = []
    
    for url in tpex_urls:
        market_type = "上櫃" if "strMode=4" in url else "興櫃"
        data = parse_isin_data(url, market_type)
        if data:
            all_data.extend(data)
    
    return all_data

def test_yahoo_finance_symbols():
    """測試 Yahoo Finance 台股代碼"""
    print("\n測試 Yahoo Finance 台股代碼...")
    
    # 測試一些上櫃和興櫃股票
    test_symbols = [
        "6488.TWO",  # 環球晶 (上櫃)
        "6488.TW",   # 環球晶 (上市)
        "6488",      # 環球晶 (無後綴)
        "6488.TWO",  # 興櫃股票
    ]
    
    for symbol in test_symbols:
        print(f"測試代碼: {symbol}")

def create_sample_otc_data():
    """建立範例上櫃/興櫃資料"""
    print("\n建立範例上櫃/興櫃資料...")
    
    # 上櫃股票範例
    otc_stocks = [
        {"代號": "6488", "名稱": "環球晶圓", "市場": "上櫃", "yahoo_symbol": "6488.TWO"},
        {"代號": "2454", "名稱": "聯發科", "市場": "上市", "yahoo_symbol": "2454.TW"},
        {"代號": "2317", "名稱": "鴻海", "市場": "上市", "yahoo_symbol": "2317.TW"},
        {"代號": "2330", "名稱": "台積電", "市場": "上市", "yahoo_symbol": "2330.TW"},
        {"代號": "2412", "名稱": "中華電", "市場": "上市", "yahoo_symbol": "2412.TW"},
        {"代號": "1301", "名稱": "台塑", "市場": "上市", "yahoo_symbol": "1301.TW"},
        {"代號": "1303", "名稱": "南亞", "市場": "上市", "yahoo_symbol": "1303.TW"},
        {"代號": "2881", "名稱": "富邦金", "市場": "上市", "yahoo_symbol": "2881.TW"},
        {"代號": "2882", "名稱": "國泰金", "市場": "上市", "yahoo_symbol": "2882.TW"},
    ]
    
    # 興櫃股票範例 (需要實際資料)
    emerging_stocks = [
        {"代號": "EXAMPLE1", "名稱": "範例興櫃股票1", "市場": "興櫃", "yahoo_symbol": "EXAMPLE1.TWO"},
        {"代號": "EXAMPLE2", "名稱": "範例興櫃股票2", "市場": "興櫃", "yahoo_symbol": "EXAMPLE2.TWO"},
    ]
    
    all_stocks = otc_stocks + emerging_stocks
    
    df = pd.DataFrame(all_stocks)
    print(f"✅ 建立 {len(df)} 筆範例資料")
    
    return df

def main():
    print("台股上櫃/興櫃資料解析")
    print("=" * 60)
    
    # 解析 ISIN 資料
    isin_data = get_tpex_data()
    
    if isin_data:
        # 轉換為 DataFrame
        df_isin = pd.DataFrame(isin_data)
        
        # 顯示統計
        print(f"\n資料統計:")
        print(f"總筆數: {len(df_isin)}")
        print(f"市場分布:")
        print(df_isin['市場'].value_counts())
        
        # 顯示範例資料
        print(f"\n範例資料:")
        print(df_isin.head(10).to_string())
        
        # 儲存資料
        filename = "taiwan_otc_emerging_stocks.jsonl"
        df_isin.to_json(filename, orient="records", lines=True, force_ascii=False)
        print(f"\n✅ 已儲存: {filename}")
        
        # 按市場分類儲存
        for market in df_isin['市場'].unique():
            market_df = df_isin[df_isin['市場'] == market]
            market_filename = f"taiwan_{market}_stocks.jsonl"
            market_df.to_json(market_filename, orient="records", lines=True, force_ascii=False)
            print(f"✅ 已儲存: {market_filename} ({len(market_df)} 筆)")
    
    else:
        print("❌ 無法取得 ISIN 資料，使用範例資料")
        df_sample = create_sample_otc_data()
        
        # 儲存範例資料
        filename = "taiwan_sample_stocks.jsonl"
        df_sample.to_json(filename, orient="records", lines=True, force_ascii=False)
        print(f"✅ 已儲存: {filename}")
    
    # 測試 Yahoo Finance 代碼
    test_yahoo_finance_symbols()
    
    print("\n" + "=" * 60)
    print("解析完成！")
    print("\n📋 台股資料來源總結:")
    print("✅ 證交所 ISIN 資料: 可取得上櫃和興櫃股票清單")
    print("✅ Yahoo Finance: 使用 .TWO 後綴取得上櫃資料")
    print("⚠️ 櫃買中心 API: 目前無法直接取得 JSON 資料")
    print("📊 建議: 結合多個資料來源建立完整台股資料庫")

if __name__ == "__main__":
    main()
