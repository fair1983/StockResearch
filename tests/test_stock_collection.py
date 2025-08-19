import requests
import pandas as pd
from io import StringIO
import json
import time

def test_stock_collection():
    print("開始收集股票代碼...")
    print("=" * 50)
    
    try:
        # ---------- 台股 ----------
        print("1. 收集台股資料...")
        
        # TWSE 上市公司基本資料 (JSON)
        print("  - 取得 TWSE 資料...")
        twse_url = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L"
        twse_response = requests.get(twse_url, timeout=30)
        twse_response.raise_for_status()
        twse_data = twse_response.json()
        df_twse = pd.DataFrame(twse_data)
        df_twse["yahoo_symbol"] = df_twse["公司代號"] + ".TW"
        print(f"    TWSE 股票數量: {len(df_twse)}")

        # TPEX 櫃買公司基本資料 (JSON)
        print("  - 取得 TPEX 資料...")
        tpex_url = "https://www.tpex.org.tw/openapi/v1/stock/info"
        tpex_response = requests.get(tpex_url, timeout=30)
        tpex_response.raise_for_status()
        tpex_data = tpex_response.json()
        df_tpex = pd.DataFrame(tpex_data)
        df_tpex["yahoo_symbol"] = df_tpex["Code"] + ".TWO"
        print(f"    TPEX 股票數量: {len(df_tpex)}")

        # 合併台股
        df_tw_all = pd.concat([
            df_twse[["公司代號", "公司簡稱", "yahoo_symbol"]],
            df_tpex[["Code", "Name", "yahoo_symbol"]].rename(columns={"Code": "公司代號", "Name": "公司簡稱"})
        ], ignore_index=True)
        print(f"    台股總數: {len(df_tw_all)}")

        # ---------- 美股 ----------
        print("\n2. 收集美股資料...")
        
        # NASDAQ 上市 (nasdaqlisted.txt)
        print("  - 取得 NASDAQ 資料...")
        nasdaq_url = "ftp://ftp.nasdaqtrader.com/SymbolDirectory/nasdaqlisted.txt"
        nasdaq_response = requests.get(nasdaq_url, timeout=30)
        nasdaq_response.raise_for_status()
        nasdaq_txt = nasdaq_response.text
        df_nasdaq = pd.read_csv(StringIO(nasdaq_txt), sep="|")
        df_nasdaq = df_nasdaq.dropna(subset=["Symbol"])
        print(f"    NASDAQ 股票數量: {len(df_nasdaq)}")

        # 其他交易所 (otherlisted.txt)
        print("  - 取得其他交易所資料...")
        other_url = "ftp://ftp.nasdaqtrader.com/SymbolDirectory/otherlisted.txt"
        other_response = requests.get(other_url, timeout=30)
        other_response.raise_for_status()
        other_txt = other_response.text
        df_other = pd.read_csv(StringIO(other_txt), sep="|")
        df_other = df_other.dropna(subset=["Symbol"])
        print(f"    其他交易所股票數量: {len(df_other)}")

        # 合併美股
        df_us_all = pd.concat([
            df_nasdaq[["Symbol", "Security Name"]].rename(columns={"Symbol": "代號", "Security Name": "名稱"}),
            df_other[["Symbol", "Security Name"]].rename(columns={"Symbol": "代號", "Security Name": "名稱"})
        ], ignore_index=True)
        df_us_all["yahoo_symbol"] = df_us_all["代號"]
        print(f"    美股總數: {len(df_us_all)}")

        # ---------- SEC 公開 JSON ----------
        print("\n3. 收集 SEC 資料...")
        sec_url = "https://www.sec.gov/files/company_tickers.json"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        sec_response = requests.get(sec_url, headers=headers, timeout=30)
        sec_response.raise_for_status()
        sec_data = sec_response.json()
        df_sec = pd.DataFrame.from_dict(sec_data, orient="index")
        df_sec = df_sec.rename(columns={"ticker": "代號", "title": "名稱", "cik_str": "CIK"})
        df_sec["yahoo_symbol"] = df_sec["代號"]
        print(f"    SEC 股票數量: {len(df_sec)}")

        # ---------- 顯示範例資料 ----------
        print("\n4. 資料範例:")
        print("\n台股範例:")
        print(df_tw_all.head(3).to_string())
        
        print("\n美股範例:")
        print(df_us_all.head(3).to_string())
        
        print("\nSEC 範例:")
        print(df_sec.head(3).to_string())

        # ---------- 存成 JSON Lines ----------
        print("\n5. 儲存資料...")
        df_tw_all.to_json("taiwan_stocks.jsonl", orient="records", lines=True, force_ascii=False)
        df_us_all.to_json("us_stocks.jsonl", orient="records", lines=True, force_ascii=False)
        df_sec.to_json("us_stocks_sec.jsonl", orient="records", lines=True, force_ascii=False)
        
        print("    檔案已儲存:")
        print("    - taiwan_stocks.jsonl")
        print("    - us_stocks.jsonl")
        print("    - us_stocks_sec.jsonl")

        # ---------- 統計結果 ----------
        print("\n" + "=" * 50)
        print("收集結果統計:")
        print(f"TWSE+TPEX 股票數量: {len(df_tw_all)}")
        print(f"美股 (NASDAQ Trader): {len(df_us_all)}")
        print(f"美股 (SEC JSON): {len(df_sec)}")
        
        # 檢查重複
        tw_duplicates = df_tw_all["公司代號"].duplicated().sum()
        us_duplicates = df_us_all["代號"].duplicated().sum()
        sec_duplicates = df_sec["代號"].duplicated().sum()
        
        print(f"\n重複檢查:")
        print(f"台股重複: {tw_duplicates}")
        print(f"美股重複: {us_duplicates}")
        print(f"SEC 重複: {sec_duplicates}")
        
        return True

    except requests.exceptions.RequestException as e:
        print(f"網路請求錯誤: {e}")
        return False
    except Exception as e:
        print(f"執行錯誤: {e}")
        return False

if __name__ == "__main__":
    success = test_stock_collection()
    if success:
        print("\n✅ 股票代碼收集完成!")
    else:
        print("\n❌ 股票代碼收集失敗!")
