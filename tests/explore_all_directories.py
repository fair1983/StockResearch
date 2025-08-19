import ftplib
import pandas as pd
from io import StringIO
import os

def explore_all_directories():
    """探索 NASDAQ Trader FTP 的所有目錄"""
    print("探索 NASDAQ Trader FTP 所有目錄...")
    print("=" * 80)
    
    try:
        # 連接到 FTP
        ftp = ftplib.FTP('ftp.nasdaqtrader.com')
        ftp.login()
        
        # 列出根目錄
        root_files = []
        ftp.retrlines('LIST', root_files.append)
        
        # 找出所有目錄
        directories = []
        for file_info in root_files:
            parts = file_info.split()
            if len(parts) >= 4:
                # 檢查是否為目錄 (以 'd' 開頭)
                if parts[0].startswith('d'):
                    dir_name = parts[-1]
                    directories.append(dir_name)
        
        print(f"發現 {len(directories)} 個目錄:")
        for i, dir_name in enumerate(directories, 1):
            print(f"  {i}. {dir_name}")
        
        # 探索每個目錄
        for dir_name in directories:
            print(f"\n{'='*80}")
            print(f"探索目錄: {dir_name}")
            print(f"{'='*80}")
            
            try:
                ftp.cwd(f'/{dir_name}')
                print(f"當前目錄: {ftp.pwd()}")
                
                # 列出目錄內容
                files = []
                ftp.retrlines('LIST', files.append)
                
                print(f"檔案數量: {len(files)}")
                
                # 分類檔案
                txt_files = []
                csv_files = []
                zip_files = []
                other_files = []
                
                for file_info in files:
                    filename = file_info.split()[-1]
                    if filename.endswith('.txt'):
                        txt_files.append(file_info)
                    elif filename.endswith('.csv'):
                        csv_files.append(file_info)
                    elif filename.endswith('.zip'):
                        zip_files.append(file_info)
                    else:
                        other_files.append(file_info)
                
                # 顯示分類結果
                if txt_files:
                    print(f"\n📄 TXT 檔案 ({len(txt_files)}):")
                    for file_info in txt_files[:5]:  # 只顯示前5個
                        print(f"  {file_info}")
                    if len(txt_files) > 5:
                        print(f"  ... 還有 {len(txt_files) - 5} 個 TXT 檔案")
                
                if csv_files:
                    print(f"\n📊 CSV 檔案 ({len(csv_files)}):")
                    for file_info in csv_files[:5]:
                        print(f"  {file_info}")
                    if len(csv_files) > 5:
                        print(f"  ... 還有 {len(csv_files) - 5} 個 CSV 檔案")
                
                if zip_files:
                    print(f"\n🗜️ ZIP 檔案 ({len(zip_files)}):")
                    for file_info in zip_files[:5]:
                        print(f"  {file_info}")
                    if len(zip_files) > 5:
                        print(f"  ... 還有 {len(zip_files) - 5} 個 ZIP 檔案")
                
                if other_files:
                    print(f"\n📁 其他檔案 ({len(other_files)}):")
                    for file_info in other_files[:5]:
                        print(f"  {file_info}")
                    if len(other_files) > 5:
                        print(f"  ... 還有 {len(other_files) - 5} 個其他檔案")
                
                # 回到根目錄
                ftp.cwd('/')
                
            except Exception as e:
                print(f"❌ 探索目錄 {dir_name} 時發生錯誤: {e}")
                ftp.cwd('/')  # 確保回到根目錄
                continue
        
        ftp.quit()
        return True
        
    except Exception as e:
        print(f"❌ 探索錯誤: {e}")
        return False

def download_interesting_files():
    """下載一些有趣的檔案"""
    print("\n下載有趣的檔案...")
    print("=" * 80)
    
    try:
        ftp = ftplib.FTP('ftp.nasdaqtrader.com')
        ftp.login()
        
        # 要下載的檔案列表
        interesting_files = [
            ('Symboldirectory', 'nasdaqtraded.txt'),
            ('Symboldirectory', 'bxtraded.txt'),
            ('Symboldirectory', 'psxtraded.txt'),
            ('ETFData', 'ETFList.txt'),
            ('ETFData', 'ETFList.csv'),
        ]
        
        for directory, filename in interesting_files:
            try:
                print(f"\n下載 {directory}/{filename}...")
                ftp.cwd(f'/{directory}')
                
                # 檢查檔案是否存在
                files = []
                ftp.retrlines('LIST', files.append)
                file_exists = any(filename in file_info for file_info in files)
                
                if file_exists:
                    data = []
                    ftp.retrlines(f'RETR {filename}', data.append)
                    
                    print(f"檔案大小: {len(data)} 行")
                    print("前3行內容:")
                    for i, line in enumerate(data[:3]):
                        print(f"  {i+1}: {line}")
                    
                    # 儲存檔案
                    save_filename = f"{directory}_{filename}"
                    with open(save_filename, 'w', encoding='utf-8') as f:
                        f.write('\n'.join(data))
                    print(f"✅ 已儲存: {save_filename}")
                else:
                    print(f"❌ 檔案不存在: {filename}")
                
                ftp.cwd('/')  # 回到根目錄
                
            except Exception as e:
                print(f"❌ 下載 {directory}/{filename} 失敗: {e}")
                ftp.cwd('/')  # 確保回到根目錄
                continue
        
        ftp.quit()
        return True
        
    except Exception as e:
        print(f"❌ 下載錯誤: {e}")
        return False

def main():
    print("NASDAQ Trader FTP 完整目錄探索")
    print("=" * 80)
    
    # 探索所有目錄
    success = explore_all_directories()
    
    if success:
        # 下載有趣的檔案
        download_interesting_files()
        
        print("\n" + "=" * 80)
        print("探索完成！")
        print("\n📋 發現的主要資料類型:")
        print("📊 股票代碼: nasdaqlisted.txt, otherlisted.txt")
        print("📈 交易資料: nasdaqtraded.txt, bxtraded.txt, psxtraded.txt")
        print("💼 債券資料: bondslist.txt")
        print("🔄 期權資料: options.txt, bxoptions.txt")
        print("📋 其他清單: mpidlist.txt, otclist.txt")
        print("🗜️ 壓縮資料: 各種期權資料的 ZIP 檔案")
        print("📊 ETF 資料: ETFData 目錄")
        print("📈 交易品質: OrderExecutionQuality 目錄")
        print("📊 交易量: MonthlyShareVolume 目錄")
        print("🔄 開盤/收盤: Openingcross, Closingcross 目錄")
    else:
        print("\n❌ 探索失敗")

if __name__ == "__main__":
    main()
