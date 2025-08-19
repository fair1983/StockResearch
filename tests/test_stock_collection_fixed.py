import requests
import pandas as pd
from io import StringIO
import json
import time

def test_twse():
    """測試 TWSE 資料收集"""
    print("測試 TWSE 資料...")
    try:
        twse_url = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L"
        response = requests.get(twse_url, timeout=30)
        response.raise_for_status()
        data = response.json()
        df = pd.DataFrame(data)
        df["yahoo_symbol"] = df["公司代號"] + ".TW"
        print(f"✅ TWSE 成功: {len(df)} 支股票")
        print("範例資料:")
        print(df.head(3)[["公司代號", "公司簡稱", "yahoo_symbol"]].to_string())
        return df
    except Exception as e:
        print(f"❌ TWSE 失敗: {e}")
        return None

def test_tpex():
    """測試 TPEX 資料收集"""
    print("\n測試 TPEX 資料...")
    try:
        tpex_url = "https://www.tpex.org.tw/openapi/v1/stock/info"
        response = requests.get(tpex_url, timeout=30)
        response.raise_for_status()
        
        # 檢查回應內容
        print(f"回應狀態碼: {response.status_code}")
        print(f"回應內容前100字: {response.text[:100]}")
        
        data = response.json()
        df = pd.DataFrame(data)
        df["yahoo_symbol"] = df["Code"] + ".TWO"
        print(f"✅ TPEX 成功: {len(df)} 支股票")
        print("範例資料:")
        print(df.head(3)[["Code", "Name", "yahoo_symbol"]].to_string())
        return df
    except Exception as e:
        print(f"❌ TPEX 失敗: {e}")
        return None

def test_nasdaq():
    """測試 NASDAQ 資料收集"""
    print("\n測試 NASDAQ 資料...")
    try:
        nasdaq_url = "ftp://ftp.nasdaqtrader.com/SymbolDirectory/nasdaqlisted.txt"
        response = requests.get(nasdaq_url, timeout=30)
        response.raise_for_status()
        df = pd.read_csv(StringIO(response.text), sep="|")
        df = df.dropna(subset=["Symbol"])
        df["yahoo_symbol"] = df["Symbol"]
        print(f"✅ NASDAQ 成功: {len(df)} 支股票")
        print("範例資料:")
        print(df.head(3)[["Symbol", "Security Name", "yahoo_symbol"]].to_string())
        return df
    except Exception as e:
        print(f"❌ NASDAQ 失敗: {e}")
        return None

def test_other_exchanges():
    """測試其他交易所資料收集"""
    print("\n測試其他交易所資料...")
    try:
        other_url = "ftp://ftp.nasdaqtrader.com/SymbolDirectory/otherlisted.txt"
        response = requests.get(other_url, timeout=30)
        response.raise_for_status()
        df = pd.read_csv(StringIO(response.text), sep="|")
        df = df.dropna(subset=["Symbol"])
        df["yahoo_symbol"] = df["Symbol"]
        print(f"✅ 其他交易所成功: {len(df)} 支股票")
        print("範例資料:")
        print(df.head(3)[["Symbol", "Security Name", "yahoo_symbol"]].to_string())
        return df
    except Exception as e:
        print(f"❌ 其他交易所失敗: {e}")
        return None

def test_sec():
    """測試 SEC 資料收集"""
    print("\n測試 SEC 資料...")
    try:
        sec_url = "https://www.sec.gov/files/company_tickers.json"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        response = requests.get(sec_url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        df = pd.DataFrame.from_dict(data, orient="index")
        df = df.rename(columns={"ticker": "代號", "title": "名稱", "cik_str": "CIK"})
        df["yahoo_symbol"] = df["代號"]
        print(f"✅ SEC 成功: {len(df)} 支股票")
        print("範例資料:")
        print(df.head(3)[["代號", "名稱", "yahoo_symbol"]].to_string())
        return df
    except Exception as e:
        print(f"❌ SEC 失敗: {e}")
        return None

def main():
    print("股票代碼收集測試")
    print("=" * 50)
    
    results = {}
    
    # 測試台股
    print("\n🇹🇼 台股資料測試:")
    twse_df = test_twse()
    tpex_df = test_tpex()
    
    if twse_df is not None:
        results['twse'] = twse_df
    if tpex_df is not None:
        results['tpex'] = tpex_df
    
    # 測試美股
    print("\n🇺🇸 美股資料測試:")
    nasdaq_df = test_nasdaq()
    other_df = test_other_exchanges()
    sec_df = test_sec()
    
    if nasdaq_df is not None:
        results['nasdaq'] = nasdaq_df
    if other_df is not None:
        results['other'] = other_df
    if sec_df is not None:
        results['sec'] = sec_df
    
    # 總結
    print("\n" + "=" * 50)
    print("測試結果總結:")
    
    if 'twse' in results:
        print(f"✅ TWSE: {len(results['twse'])} 支股票")
    else:
        print("❌ TWSE: 失敗")
    
    if 'tpex' in results:
        print(f"✅ TPEX: {len(results['tpex'])} 支股票")
    else:
        print("❌ TPEX: 失敗")
    
    if 'nasdaq' in results:
        print(f"✅ NASDAQ: {len(results['nasdaq'])} 支股票")
    else:
        print("❌ NASDAQ: 失敗")
    
    if 'other' in results:
        print(f"✅ 其他交易所: {len(results['other'])} 支股票")
    else:
        print("❌ 其他交易所: 失敗")
    
    if 'sec' in results:
        print(f"✅ SEC: {len(results['sec'])} 支股票")
    else:
        print("❌ SEC: 失敗")
    
    # 嘗試合併台股資料
    if 'twse' in results and 'tpex' in results:
        print("\n合併台股資料...")
        tw_all = pd.concat([
            results['twse'][["公司代號", "公司簡稱", "yahoo_symbol"]],
            results['tpex'][["Code", "Name", "yahoo_symbol"]].rename(columns={"Code": "公司代號", "Name": "公司簡稱"})
        ], ignore_index=True)
        print(f"台股總數: {len(tw_all)}")
        results['tw_all'] = tw_all
    
    # 嘗試合併美股資料
    if 'nasdaq' in results and 'other' in results:
        print("\n合併美股資料...")
        us_all = pd.concat([
            results['nasdaq'][["Symbol", "Security Name"]].rename(columns={"Symbol": "代號", "Security Name": "名稱"}),
            results['other'][["Symbol", "Security Name"]].rename(columns={"Symbol": "代號", "Security Name": "名稱"})
        ], ignore_index=True)
        us_all["yahoo_symbol"] = us_all["代號"]
        print(f"美股總數: {len(us_all)}")
        results['us_all'] = us_all
    
    # 儲存成功的資料
    print("\n儲存資料...")
    for name, df in results.items():
        if name in ['tw_all', 'us_all', 'sec']:
            filename = f"{name}_stocks.jsonl"
            df.to_json(filename, orient="records", lines=True, force_ascii=False)
            print(f"✅ 已儲存: {filename}")

if __name__ == "__main__":
    main()
