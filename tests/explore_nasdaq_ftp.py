import ftplib
import pandas as pd
from io import StringIO
import os

def explore_nasdaq_ftp():
    """探索 NASDAQ Trader FTP 上的所有資料"""
    print("探索 NASDAQ Trader FTP 資料...")
    print("=" * 60)
    
    try:
        # 連接到 FTP
        print("1. 連接到 ftp.nasdaqtrader.com...")
        ftp = ftplib.FTP('ftp.nasdaqtrader.com')
        ftp.login()
        print("✅ FTP 連接成功")
        
        # 列出根目錄
        print(f"\n2. 根目錄內容:")
        root_files = []
        ftp.retrlines('LIST', root_files.append)
        for file in root_files:
            print(f"  {file}")
        
        # 探索每個目錄
        directories = []
        for file_info in root_files:
            parts = file_info.split()
            if len(parts) >= 4 and parts[0].startswith('d'):
                dir_name = parts[-1]
                directories.append(dir_name)
        
        print(f"\n3. 發現 {len(directories)} 個目錄:")
        for i, dir_name in enumerate(directories, 1):
            print(f"  {i}. {dir_name}")
        
        # 詳細探索每個目錄
        for dir_name in directories:
            print(f"\n{'='*60}")
            print(f"探索目錄: {dir_name}")
            print(f"{'='*60}")
            
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
                    for file_info in txt_files[:10]:  # 只顯示前10個
                        print(f"  {file_info}")
                    if len(txt_files) > 10:
                        print(f"  ... 還有 {len(txt_files) - 10} 個 TXT 檔案")
                
                if csv_files:
                    print(f"\n📊 CSV 檔案 ({len(csv_files)}):")
                    for file_info in csv_files[:10]:
                        print(f"  {file_info}")
                    if len(csv_files) > 10:
                        print(f"  ... 還有 {len(csv_files) - 10} 個 CSV 檔案")
                
                if zip_files:
                    print(f"\n🗜️ ZIP 檔案 ({len(zip_files)}):")
                    for file_info in zip_files[:10]:
                        print(f"  {file_info}")
                    if len(zip_files) > 10:
                        print(f"  ... 還有 {len(zip_files) - 10} 個 ZIP 檔案")
                
                if other_files:
                    print(f"\n📁 其他檔案 ({len(other_files)}):")
                    for file_info in other_files[:10]:
                        print(f"  {file_info}")
                    if len(other_files) > 10:
                        print(f"  ... 還有 {len(other_files) - 10} 個其他檔案")
                
                # 回到根目錄
                ftp.cwd('/')
                
            except Exception as e:
                print(f"❌ 探索目錄 {dir_name} 時發生錯誤: {e}")
                ftp.cwd('/')  # 確保回到根目錄
                continue
        
        # 特別探索 Symboldirectory
        print(f"\n{'='*60}")
        print("詳細探索 Symboldirectory")
        print(f"{'='*60}")
        
        ftp.cwd('Symboldirectory')
        symbol_files = []
        ftp.retrlines('LIST', symbol_files.append)
        
        print("Symboldirectory 完整檔案列表:")
        for i, file_info in enumerate(symbol_files, 1):
            print(f"  {i:2d}. {file_info}")
        
        # 分析檔案大小
        print(f"\n檔案大小分析:")
        large_files = []
        for file_info in symbol_files:
            parts = file_info.split()
            if len(parts) >= 5:
                try:
                    size = int(parts[4])
                    if size > 1000000:  # 大於 1MB
                        large_files.append((parts[-1], size))
                except:
                    pass
        
        if large_files:
            print("大檔案 (>1MB):")
            for filename, size in sorted(large_files, key=lambda x: x[1], reverse=True):
                size_mb = size / 1024 / 1024
                print(f"  {filename}: {size_mb:.1f} MB")
        
        # 關閉連接
        ftp.quit()
        print("\n✅ FTP 連接已關閉")
        
        return True
        
    except Exception as e:
        print(f"❌ 探索錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False

def download_sample_files():
    """下載一些範例檔案來查看內容"""
    print("\n下載範例檔案...")
    print("=" * 60)
    
    try:
        ftp = ftplib.FTP('ftp.nasdaqtrader.com')
        ftp.login()
        ftp.cwd('Symboldirectory')
        
        # 要下載的範例檔案
        sample_files = [
            'bondslist.txt',
            'mpidlist.txt',
            'otclist.txt',
            'TradingSystemAddsDeletes.txt'
        ]
        
        for filename in sample_files:
            try:
                print(f"\n下載 {filename}...")
                data = []
                ftp.retrlines(f'RETR {filename}', data.append)
                
                print(f"檔案大小: {len(data)} 行")
                print("前5行內容:")
                for i, line in enumerate(data[:5]):
                    print(f"  {i+1}: {line}")
                
                # 儲存檔案
                with open(f"sample_{filename}", 'w', encoding='utf-8') as f:
                    f.write('\n'.join(data))
                print(f"✅ 已儲存: sample_{filename}")
                
            except Exception as e:
                print(f"❌ 下載 {filename} 失敗: {e}")
        
        ftp.quit()
        return True
        
    except Exception as e:
        print(f"❌ 下載範例檔案錯誤: {e}")
        return False

def main():
    print("NASDAQ Trader FTP 完整探索")
    print("=" * 60)
    
    # 探索所有目錄
    success = explore_nasdaq_ftp()
    
    if success:
        # 下載範例檔案
        download_sample_files()
        
        print("\n" + "=" * 60)
        print("探索完成！")
        print("\n發現的主要資料類型:")
        print("📊 股票代碼: nasdaqlisted.txt, otherlisted.txt")
        print("📈 交易資料: nasdaqtraded.txt, bxtraded.txt, psxtraded.txt")
        print("💼 債券資料: bondslist.txt")
        print("🔄 期權資料: options.txt, bxoptions.txt")
        print("📋 其他清單: mpidlist.txt, otclist.txt")
        print("🗜️ 壓縮資料: 各種期權資料的 ZIP 檔案")
    else:
        print("\n❌ 探索失敗")

if __name__ == "__main__":
    main()
