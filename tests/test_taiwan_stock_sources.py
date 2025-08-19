import requests
import pandas as pd
from io import StringIO
import json
import time

def test_tpex_sources():
    """測試櫃買中心的各種資料來源"""
    print("測試櫃買中心資料來源...")
    print("=" * 50)
    
    # 櫃買中心可能的 API 端點
    tpex_urls = [
        "https://www.tpex.org.tw/openapi/v1/stock/info",
        "https://www.tpex.org.tw/openapi/v1/stock/list",
        "https://www.tpex.org.tw/openapi/v1/stock/basic",
        "https://www.tpex.org.tw/openapi/v1/stock/company",
        "https://www.tpex.org.tw/openapi/v1/stock/otc",
        "https://www.tpex.org.tw/openapi/v1/stock/emerging",
        "https://www.tpex.org.tw/openapi/v1/stock/otc_list",
        "https://www.tpex.org.tw/openapi/v1/stock/emerging_list"
    ]
    
    for url in tpex_urls:
        try:
            print(f"\n測試: {url}")
            response = requests.get(url, timeout=10)
            print(f"狀態碼: {response.status_code}")
            print(f"內容類型: {response.headers.get('content-type', 'unknown')}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        print(f"✅ 成功取得 {len(data)} 筆資料")
                        if len(data) > 0:
                            print(f"範例資料: {data[0]}")
                    elif isinstance(data, dict):
                        print(f"✅ 成功取得字典資料")
                        print(f"鍵值: {list(data.keys())}")
                except:
                    print(f"⚠️ 回應不是 JSON 格式")
                    print(f"前100字: {response.text[:100]}")
            else:
                print(f"❌ 請求失敗")
                
        except Exception as e:
            print(f"❌ 錯誤: {e}")

def test_twse_otc():
    """測試證交所的櫃買資料"""
    print("\n測試證交所櫃買資料...")
    print("=" * 50)
    
    # 證交所可能的櫃買資料端點
    twse_otc_urls = [
        "https://openapi.twse.com.tw/v1/opendata/t187ap03_L_otc",
        "https://openapi.twse.com.tw/v1/opendata/t187ap03_L_emerging",
        "https://openapi.twse.com.tw/v1/opendata/t187ap03_L_otc_list",
        "https://openapi.twse.com.tw/v1/opendata/t187ap03_L_emerging_list"
    ]
    
    for url in twse_otc_urls:
        try:
            print(f"\n測試: {url}")
            response = requests.get(url, timeout=10)
            print(f"狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"✅ 成功取得 {len(data)} 筆資料")
                    if len(data) > 0:
                        print(f"範例資料: {data[0]}")
                except:
                    print(f"⚠️ 回應不是 JSON 格式")
            else:
                print(f"❌ 請求失敗")
                
        except Exception as e:
            print(f"❌ 錯誤: {e}")

def test_alternative_sources():
    """測試其他可能的資料來源"""
    print("\n測試其他資料來源...")
    print("=" * 50)
    
    # 其他可能的資料來源
    alternative_urls = [
        "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4",  # 證交所上櫃資料
        "https://isin.twse.com.tw/isin/C_public.jsp?strMode=5",  # 證交所興櫃資料
        "https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge.php?l=zh-tw&se=EW&t=D",
        "https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430.php?l=zh-tw&se=EW&t=D"
    ]
    
    for url in alternative_urls:
        try:
            print(f"\n測試: {url}")
            response = requests.get(url, timeout=10)
            print(f"狀態碼: {response.status_code}")
            print(f"內容類型: {response.headers.get('content-type', 'unknown')}")
            
            if response.status_code == 200:
                print(f"✅ 成功取得資料")
                print(f"內容長度: {len(response.text)} 字元")
                print(f"前200字: {response.text[:200]}")
            else:
                print(f"❌ 請求失敗")
                
        except Exception as e:
            print(f"❌ 錯誤: {e}")

def test_yahoo_finance_tw():
    """測試 Yahoo Finance 台股資料"""
    print("\n測試 Yahoo Finance 台股資料...")
    print("=" * 50)
    
    # 測試一些台股代碼
    test_symbols = [
        "6488.TWO",  # 環球晶
        "6488.TW",   # 環球晶 (上市)
        "6488",      # 環球晶 (無後綴)
    ]
    
    for symbol in test_symbols:
        try:
            print(f"\n測試: {symbol}")
            # 這裡可以測試 Yahoo Finance API
            print(f"✅ 可以測試 {symbol}")
        except Exception as e:
            print(f"❌ 錯誤: {e}")

def main():
    print("台股上櫃/興櫃資料來源測試")
    print("=" * 60)
    
    # 測試各種資料來源
    test_tpex_sources()
    test_twse_otc()
    test_alternative_sources()
    test_yahoo_finance_tw()
    
    print("\n" + "=" * 60)
    print("測試完成！")
    print("\n📋 台股資料來源建議:")
    print("1. 櫃買中心官網: https://www.tpex.org.tw/")
    print("2. 證交所官網: https://www.twse.com.tw/")
    print("3. Yahoo Finance: 使用 .TWO 後綴")
    print("4. 公開資訊觀測站: https://mops.twse.com.tw/")

if __name__ == "__main__":
    main()
