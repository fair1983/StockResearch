import ftplib
import pandas as pd
from io import StringIO
import tempfile
import os

def download_nasdaq_ftp():
    """從 NASDAQ Trader FTP 下載股票資料"""
    print("開始從 NASDAQ Trader FTP 下載資料...")
    
    try:
        # 連接到 NASDAQ Trader FTP
        print("連接到 ftp.nasdaqtrader.com...")
        ftp = ftplib.FTP('ftp.nasdaqtrader.com')
        ftp.login()  # 匿名登入
        
        print("✅ FTP 連接成功")
        
        # 進入 SymbolDirectory 目錄
        print("\n進入 SymbolDirectory 目錄...")
        ftp.cwd('Symboldirectory')  # 注意大小寫
        
        # 下載 nasdaqlisted.txt
        print("\n下載 nasdaqlisted.txt...")
        nasdaq_data = []
        ftp.retrlines('RETR nasdaqlisted.txt', nasdaq_data.append)
        print(f"下載了 {len(nasdaq_data)} 行 NASDAQ 資料")
        
        # 下載 otherlisted.txt
        print("下載 otherlisted.txt...")
        other_data = []
        ftp.retrlines('RETR otherlisted.txt', other_data.append)
        print(f"下載了 {len(other_data)} 行其他交易所資料")
        
        # 關閉連接
        ftp.quit()
        print("✅ FTP 連接已關閉")
        
        # 處理 nasdaqlisted.txt
        print("\n處理 NASDAQ 資料...")
        nasdaq_text = '\n'.join(nasdaq_data)
        
        # 顯示前幾行來檢查格式
        print("NASDAQ 資料前5行:")
        for i, line in enumerate(nasdaq_data[:5]):
            print(f"  {i+1}: {line}")
        
        df_nasdaq = pd.read_csv(StringIO(nasdaq_text), sep="|")
        print(f"NASDAQ DataFrame 欄位: {list(df_nasdaq.columns)}")
        df_nasdaq = df_nasdaq.dropna(subset=["Symbol"])
        df_nasdaq["yahoo_symbol"] = df_nasdaq["Symbol"]
        print(f"NASDAQ 股票數量: {len(df_nasdaq)}")
        
        # 處理 otherlisted.txt
        print("\n處理其他交易所資料...")
        other_text = '\n'.join(other_data)
        
        # 顯示前幾行來檢查格式
        print("其他交易所資料前5行:")
        for i, line in enumerate(other_data[:5]):
            print(f"  {i+1}: {line}")
        
        df_other = pd.read_csv(StringIO(other_text), sep="|")
        print(f"其他交易所 DataFrame 欄位: {list(df_other.columns)}")
        
        # 修正：使用正確的欄位名稱
        df_other = df_other.dropna(subset=["ACT Symbol"])
        df_other["yahoo_symbol"] = df_other["ACT Symbol"]
        print(f"其他交易所股票數量: {len(df_other)}")
        
        # 合併資料 - 修正欄位名稱對應
        print("\n合併美股資料...")
        df_us_all = pd.concat([
            df_nasdaq[["Symbol", "Security Name"]].rename(columns={"Symbol": "代號", "Security Name": "名稱"}),
            df_other[["ACT Symbol", "Security Name"]].rename(columns={"ACT Symbol": "代號", "Security Name": "名稱"})
        ], ignore_index=True)
        df_us_all["yahoo_symbol"] = df_us_all["代號"]
        
        print(f"美股總數: {len(df_us_all)}")
        
        # 顯示範例資料
        print("\n範例資料:")
        print(df_us_all.head(10).to_string())
        
        # 儲存資料
        filename = "nasdaq_ftp_stocks.jsonl"
        df_us_all.to_json(filename, orient="records", lines=True, force_ascii=False)
        print(f"\n✅ 已儲存: {filename}")
        
        return df_us_all
        
    except ftplib.error_perm as e:
        print(f"❌ FTP 權限錯誤: {e}")
        return None
    except ftplib.error_temp as e:
        print(f"❌ FTP 暫時錯誤: {e}")
        return None
    except Exception as e:
        print(f"❌ 其他錯誤: {e}")
        import traceback
        traceback.print_exc()
        return None

def analyze_nasdaq_data():
    """分析 NASDAQ 資料內容"""
    print("分析 NASDAQ FTP 資料...")
    print("=" * 50)
    
    try:
        # 連接到 FTP
        ftp = ftplib.FTP('ftp.nasdaqtrader.com')
        ftp.login()
        ftp.cwd('Symboldirectory')
        
        # 下載檔案
        nasdaq_data = []
        ftp.retrlines('RETR nasdaqlisted.txt', nasdaq_data.append)
        
        other_data = []
        ftp.retrlines('RETR otherlisted.txt', other_data.append)
        
        ftp.quit()
        
        # 分析 NASDAQ 資料
        print("\nNASDAQ 資料分析:")
        nasdaq_text = '\n'.join(nasdaq_data)
        df_nasdaq = pd.read_csv(StringIO(nasdaq_text), sep="|")
        
        print(f"總行數: {len(df_nasdaq)}")
        print(f"欄位: {list(df_nasdaq.columns)}")
        print(f"Market Category 分布:")
        print(df_nasdaq['Market Category'].value_counts())
        print(f"ETF 分布:")
        print(df_nasdaq['ETF'].value_counts())
        
        # 分析其他交易所資料
        print("\n其他交易所資料分析:")
        other_text = '\n'.join(other_data)
        df_other = pd.read_csv(StringIO(other_text), sep="|")
        
        print(f"總行數: {len(df_other)}")
        print(f"欄位: {list(df_other.columns)}")
        print(f"Exchange 分布:")
        print(df_other['Exchange'].value_counts())
        print(f"ETF 分布:")
        print(df_other['ETF'].value_counts())
        
        return True
        
    except Exception as e:
        print(f"❌ 分析錯誤: {e}")
        return False

def main():
    print("NASDAQ Trader FTP 資料收集測試 (最終版)")
    print("=" * 50)
    
    # 先分析資料
    print("分析 NASDAQ 資料結構...")
    analyze_nasdaq_data()
    
    print("\n" + "=" * 50)
    print("開始下載完整資料...")
    
    # 下載完整資料
    df = download_nasdaq_ftp()
    
    if df is not None:
        print(f"\n✅ 成功下載 {len(df)} 支美股")
        
        # 顯示統計資訊
        print(f"\n資料統計:")
        print(f"- 總股票數: {len(df)}")
        print(f"- 唯一代號數: {df['代號'].nunique()}")
        print(f"- 重複代號數: {len(df) - df['代號'].nunique()}")
        
        # 檢查重複
        duplicates = df[df['代號'].duplicated(keep=False)]
        if len(duplicates) > 0:
            print(f"\n重複代號範例:")
            print(duplicates.head(10)[['代號', '名稱']].to_string())
        
    else:
        print("\n❌ 下載失敗")

if __name__ == "__main__":
    main()
