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
        
        print("SymbolDirectory 內容:")
        ftp.retrlines('LIST')
        
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
        
        # 檢查欄位名稱
        if nasdaq_data:
            header_line = nasdaq_data[0]
            print(f"NASDAQ 標題行: {header_line}")
            columns = header_line.split('|')
            print(f"NASDAQ 欄位: {columns}")
        
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
        
        # 檢查欄位名稱
        if other_data:
            header_line = other_data[0]
            print(f"其他交易所標題行: {header_line}")
            columns = header_line.split('|')
            print(f"其他交易所欄位: {columns}")
        
        df_other = pd.read_csv(StringIO(other_text), sep="|")
        print(f"其他交易所 DataFrame 欄位: {list(df_other.columns)}")
        df_other = df_other.dropna(subset=["Symbol"])
        df_other["yahoo_symbol"] = df_other["Symbol"]
        print(f"其他交易所股票數量: {len(df_other)}")
        
        # 合併資料
        print("\n合併美股資料...")
        df_us_all = pd.concat([
            df_nasdaq[["Symbol", "Security Name"]].rename(columns={"Symbol": "代號", "Security Name": "名稱"}),
            df_other[["Symbol", "Security Name"]].rename(columns={"Symbol": "代號", "Security Name": "名稱"})
        ], ignore_index=True)
        df_us_all["yahoo_symbol"] = df_us_all["代號"]
        
        print(f"美股總數: {len(df_us_all)}")
        
        # 顯示範例資料
        print("\n範例資料:")
        print(df_us_all.head(5).to_string())
        
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

def test_nasdaq_ftp_detailed():
    """詳細測試 NASDAQ FTP 連接"""
    print("詳細測試 NASDAQ FTP 連接...")
    print("=" * 50)
    
    try:
        # 連接到 FTP
        print("1. 連接到 ftp.nasdaqtrader.com...")
        ftp = ftplib.FTP('ftp.nasdaqtrader.com')
        
        # 顯示歡迎訊息
        print("FTP 歡迎訊息:")
        print(ftp.getwelcome())
        
        # 匿名登入
        print("\n2. 匿名登入...")
        ftp.login()
        print("✅ 登入成功")
        
        # 顯示當前目錄
        print(f"\n3. 當前目錄: {ftp.pwd()}")
        
        # 列出根目錄內容
        print("\n4. 根目錄內容:")
        files = []
        ftp.retrlines('LIST', files.append)
        for file in files:
            print(f"  {file}")
        
        # 檢查 Symboldirectory (注意大小寫)
        print("\n5. 檢查 Symboldirectory 目錄...")
        if 'Symboldirectory' in [f.split()[-1] for f in files]:
            print("✅ Symboldirectory 目錄存在")
            
            # 進入目錄
            ftp.cwd('Symboldirectory')
            print(f"當前目錄: {ftp.pwd()}")
            
            # 列出目錄內容
            print("\n6. Symboldirectory 內容:")
            symbol_files = []
            ftp.retrlines('LIST', symbol_files.append)
            for file in symbol_files:
                print(f"  {file}")
            
            # 檢查需要的檔案
            nasdaq_file = None
            other_file = None
            
            for file_info in symbol_files:
                filename = file_info.split()[-1]
                if filename == 'nasdaqlisted.txt':
                    nasdaq_file = file_info
                elif filename == 'otherlisted.txt':
                    other_file = file_info
            
            print(f"\n7. 檔案檢查:")
            if nasdaq_file:
                print(f"✅ nasdaqlisted.txt: {nasdaq_file}")
            else:
                print("❌ nasdaqlisted.txt 不存在")
                
            if other_file:
                print(f"✅ otherlisted.txt: {other_file}")
            else:
                print("❌ otherlisted.txt 不存在")
            
            # 下載檔案
            if nasdaq_file:
                print("\n8. 下載 nasdaqlisted.txt...")
                nasdaq_data = []
                ftp.retrlines('RETR nasdaqlisted.txt', nasdaq_data.append)
                print(f"下載了 {len(nasdaq_data)} 行資料")
                
                # 顯示前幾行
                print("檔案前5行:")
                for i, line in enumerate(nasdaq_data[:5]):
                    print(f"  {i+1}: {line}")
            
            if other_file:
                print("\n9. 下載 otherlisted.txt...")
                other_data = []
                ftp.retrlines('RETR otherlisted.txt', other_data.append)
                print(f"下載了 {len(other_data)} 行資料")
                
                # 顯示前幾行
                print("檔案前5行:")
                for i, line in enumerate(other_data[:5]):
                    print(f"  {i+1}: {line}")
        
        else:
            print("❌ Symboldirectory 目錄不存在")
        
        # 關閉連接
        ftp.quit()
        print("\n✅ FTP 連接已關閉")
        
        return True
        
    except Exception as e:
        print(f"❌ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("NASDAQ Trader FTP 資料收集測試 (修正版)")
    print("=" * 50)
    
    # 先進行詳細測試
    print("進行詳細 FTP 測試...")
    detailed_success = test_nasdaq_ftp_detailed()
    
    if detailed_success:
        print("\n" + "=" * 50)
        print("開始下載完整資料...")
        
        # 下載完整資料
        df = download_nasdaq_ftp()
        
        if df is not None:
            print(f"\n✅ 成功下載 {len(df)} 支美股")
        else:
            print("\n❌ 下載失敗")
    else:
        print("\n❌ FTP 測試失敗，無法下載資料")

if __name__ == "__main__":
    main()
