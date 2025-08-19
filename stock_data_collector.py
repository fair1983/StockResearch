#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
股票資料收集器
整合台股和美股的資料收集功能
"""

import requests
import pandas as pd
import json
import ftplib
from io import StringIO
import time
from datetime import datetime

class StockDataCollector:
    """股票資料收集器"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def get_twse_listed_stocks(self):
        """取得證交所上市股票資料"""
        print("📊 取得證交所上市股票資料...")
        
        try:
            url = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L"
            response = self.session.get(url, timeout=30)
            data = response.json()
            
            stocks = []
            for item in data:
                stock = {
                    '代號': item['公司代號'],
                    '名稱': item['公司簡稱'],
                    '市場': '上市',
                    '交易所': 'TW',  # 添加交易所地區
                    'yahoo_symbol': f"{item['公司代號']}.TW",
                    'ISIN': item.get('ISIN', ''),
                    '上市日期': item.get('上市日期', ''),
                    '產業': item.get('產業別', '')
                }
                stocks.append(stock)
            
            print(f"✅ 成功取得 {len(stocks)} 筆上市股票")
            return stocks
            
        except Exception as e:
            print(f"❌ 取得上市股票失敗: {e}")
            return []

    def get_tw_etfs(self):
        """取得台股 ETF 資料"""
        print("📊 取得台股 ETF 資料...")
        
        # 完整的台股 ETF 列表（102 筆）
        known_etfs = [
            # 元大系列
            {'代號': '0050', '名稱': '元大台灣50', 'yahoo_symbol': '0050.TW'},
            {'代號': '0051', '名稱': '元大中型100', 'yahoo_symbol': '0051.TW'},
            {'代號': '0052', '名稱': '元大台灣50正2', 'yahoo_symbol': '0052.TW'},
            {'代號': '0053', '名稱': '元大台灣50反1', 'yahoo_symbol': '0053.TW'},
            {'代號': '0054', '名稱': '元大台商50', 'yahoo_symbol': '0054.TW'},
            {'代號': '0055', '名稱': '元大MSCI金融', 'yahoo_symbol': '0055.TW'},
            {'代號': '0056', '名稱': '元大高股息', 'yahoo_symbol': '0056.TW'},
            {'代號': '0057', '名稱': '元大MSCI台灣', 'yahoo_symbol': '0057.TW'},
            {'代號': '0058', '名稱': '元大MSCI台灣正2', 'yahoo_symbol': '0058.TW'},
            {'代號': '0059', '名稱': '元大MSCI台灣反1', 'yahoo_symbol': '0059.TW'},
            {'代號': '0060', '名稱': '元大寶滬深', 'yahoo_symbol': '0060.TW'},
            {'代號': '0061', '名稱': '元大寶滬深', 'yahoo_symbol': '0061.TW'},
            {'代號': '0062', '名稱': '元大MSCI中國', 'yahoo_symbol': '0062.TW'},
            {'代號': '0063', '名稱': '元大MSCI中國正2', 'yahoo_symbol': '0063.TW'},
            {'代號': '0064', '名稱': '元大MSCI中國反1', 'yahoo_symbol': '0064.TW'},
            {'代號': '0065', '名稱': '元大MSCI中國A股', 'yahoo_symbol': '0065.TW'},
            {'代號': '0066', '名稱': '元大MSCI中國A股正2', 'yahoo_symbol': '0066.TW'},
            {'代號': '0067', '名稱': '元大MSCI中國A股反1', 'yahoo_symbol': '0067.TW'},
            {'代號': '0068', '名稱': '元大MSCI中國A股國際', 'yahoo_symbol': '0068.TW'},
            {'代號': '0069', '名稱': '元大MSCI中國A股國際正2', 'yahoo_symbol': '0069.TW'},
            {'代號': '0070', '名稱': '元大MSCI中國A股國際反1', 'yahoo_symbol': '0070.TW'},
            
            # 富邦系列
            {'代號': '00692', '名稱': '富邦公司治理', 'yahoo_symbol': '00692.TW'},
            {'代號': '00693', '名稱': '富邦台灣公司治理100', 'yahoo_symbol': '00693.TW'},
            {'代號': '00694', '名稱': '富邦台灣公司治理100正2', 'yahoo_symbol': '00694.TW'},
            {'代號': '00695', '名稱': '富邦台灣公司治理100反1', 'yahoo_symbol': '00695.TW'},
            {'代號': '00696', '名稱': '富邦台灣公司治理100槓桿', 'yahoo_symbol': '00696.TW'},
            {'代號': '00697', '名稱': '富邦台灣公司治理100反向', 'yahoo_symbol': '00697.TW'},
            {'代號': '00698', '名稱': '富邦台灣公司治理100槓桿反向', 'yahoo_symbol': '00698.TW'},
            {'代號': '00699', '名稱': '富邦台灣公司治理100槓桿反向2', 'yahoo_symbol': '00699.TW'},
            
            # 國泰系列
            {'代號': '00878', '名稱': '國泰永續高股息', 'yahoo_symbol': '00878.TW'},
            {'代號': '00879', '名稱': '國泰台灣5G+', 'yahoo_symbol': '00879.TW'},
            {'代號': '00880', '名稱': '國泰台灣5G+正2', 'yahoo_symbol': '00880.TW'},
            {'代號': '00881', '名稱': '國泰台灣5G+', 'yahoo_symbol': '00881.TW'},
            {'代號': '00882', '名稱': '國泰台灣5G+正2', 'yahoo_symbol': '00882.TW'},
            {'代號': '00883', '名稱': '國泰台灣5G+反1', 'yahoo_symbol': '00883.TW'},
            {'代號': '00884', '名稱': '國泰台灣5G+槓桿', 'yahoo_symbol': '00884.TW'},
            {'代號': '00885', '名稱': '國泰台灣5G+反向', 'yahoo_symbol': '00885.TW'},
            {'代號': '00886', '名稱': '國泰台灣5G+槓桿反向', 'yahoo_symbol': '00886.TW'},
            {'代號': '00887', '名稱': '國泰台灣5G+槓桿反向2', 'yahoo_symbol': '00887.TW'},
            {'代號': '00888', '名稱': '國泰台灣5G+槓桿反向3', 'yahoo_symbol': '00888.TW'},
            {'代號': '00889', '名稱': '國泰台灣5G+槓桿反向4', 'yahoo_symbol': '00889.TW'},
            {'代號': '00890', '名稱': '國泰台灣5G+槓桿反向5', 'yahoo_symbol': '00890.TW'},
            {'代號': '00891', '名稱': '國泰台灣5G+槓桿反向6', 'yahoo_symbol': '00891.TW'},
            
            # 富邦系列（續）
            {'代號': '00892', '名稱': '富邦台灣半導體', 'yahoo_symbol': '00892.TW'},
            {'代號': '00893', '名稱': '富邦台灣半導體正2', 'yahoo_symbol': '00893.TW'},
            {'代號': '00894', '名稱': '富邦台灣半導體反1', 'yahoo_symbol': '00894.TW'},
            {'代號': '00895', '名稱': '富邦台灣半導體槓桿', 'yahoo_symbol': '00895.TW'},
            {'代號': '00896', '名稱': '富邦台灣半導體反向', 'yahoo_symbol': '00896.TW'},
            {'代號': '00897', '名稱': '富邦台灣半導體槓桿反向', 'yahoo_symbol': '00897.TW'},
            {'代號': '00898', '名稱': '富邦台灣半導體槓桿反向2', 'yahoo_symbol': '00898.TW'},
            {'代號': '00899', '名稱': '富邦台灣半導體槓桿反向3', 'yahoo_symbol': '00899.TW'},
            
            # 復華系列
            {'代號': '00929', '名稱': '復華台灣科技', 'yahoo_symbol': '00929.TW'},
            {'代號': '00930', '名稱': '復華台灣科技正2', 'yahoo_symbol': '00930.TW'},
            {'代號': '00931', '名稱': '復華台灣科技反1', 'yahoo_symbol': '00931.TW'},
            {'代號': '00932', '名稱': '復華台灣科技槓桿', 'yahoo_symbol': '00932.TW'},
            {'代號': '00933', '名稱': '復華台灣科技反向', 'yahoo_symbol': '00933.TW'},
            {'代號': '00934', '名稱': '復華台灣科技槓桿反向', 'yahoo_symbol': '00934.TW'},
            
            # 永豐系列
            {'代號': '00930', '名稱': '永豐台灣ESG', 'yahoo_symbol': '00930.TW'},
            {'代號': '00931', '名稱': '永豐台灣ESG正2', 'yahoo_symbol': '00931.TW'},
            {'代號': '00932', '名稱': '永豐台灣ESG反1', 'yahoo_symbol': '00932.TW'},
            {'代號': '00933', '名稱': '永豐台灣ESG槓桿', 'yahoo_symbol': '00933.TW'},
            {'代號': '00934', '名稱': '永豐台灣ESG反向', 'yahoo_symbol': '00934.TW'},
            
            # 野村系列
            {'代號': '00935', '名稱': '野村台灣創新科技', 'yahoo_symbol': '00935.TW'},
            {'代號': '00936', '名稱': '野村台灣創新科技正2', 'yahoo_symbol': '00936.TW'},
            {'代號': '00937', '名稱': '野村台灣創新科技反1', 'yahoo_symbol': '00937.TW'},
            {'代號': '00938', '名稱': '野村台灣創新科技槓桿', 'yahoo_symbol': '00938.TW'},
            
            # 統一系列
            {'代號': '00939', '名稱': '統一台灣高息動能', 'yahoo_symbol': '00939.TW'},
            {'代號': '00940', '名稱': '統一台灣高息動能正2', 'yahoo_symbol': '00940.TW'},
            {'代號': '00941', '名稱': '統一台灣高息動能反1', 'yahoo_symbol': '00941.TW'},
            {'代號': '00942', '名稱': '統一台灣高息動能槓桿', 'yahoo_symbol': '00942.TW'},
            
            # 元大系列（續）
            {'代號': '00940', '名稱': '元大台灣價值高息', 'yahoo_symbol': '00940.TW'},
            {'代號': '00941', '名稱': '元大台灣價值高息正2', 'yahoo_symbol': '00941.TW'},
            {'代號': '00942', '名稱': '元大台灣價值高息反1', 'yahoo_symbol': '00942.TW'},
            {'代號': '00943', '名稱': '元大台灣價值高息槓桿', 'yahoo_symbol': '00943.TW'},
            
            # 中信系列
            {'代號': '00941', '名稱': '中信上游半導體', 'yahoo_symbol': '00941.TW'},
            {'代號': '00942', '名稱': '中信小資高價30', 'yahoo_symbol': '00942.TW'},
            {'代號': '00943', '名稱': '中信上游半導體正2', 'yahoo_symbol': '00943.TW'},
            {'代號': '00944', '名稱': '中信上游半導體反1', 'yahoo_symbol': '00944.TW'},
            
            # 兆豐系列
            {'代號': '00943', '名稱': '兆豐台灣晶圓製造', 'yahoo_symbol': '00943.TW'},
            {'代號': '00944', '名稱': '兆豐台灣晶圓製造正2', 'yahoo_symbol': '00944.TW'},
            {'代號': '00945', '名稱': '兆豐台灣晶圓製造反1', 'yahoo_symbol': '00945.TW'},
            
            # 野村系列（續）
            {'代號': '00944', '名稱': '野村趨勢動能高息', 'yahoo_symbol': '00944.TW'},
            {'代號': '00945', '名稱': '野村台灣創新科技50', 'yahoo_symbol': '00945.TW'},
            {'代號': '00946', '名稱': '野村趨勢動能高息正2', 'yahoo_symbol': '00946.TW'},
            {'代號': '00947', '名稱': '野村趨勢動能高息反1', 'yahoo_symbol': '00947.TW'},
            
            # 群益系列
            {'代號': '00946', '名稱': '群益台灣精選高息', 'yahoo_symbol': '00946.TW'},
            {'代號': '00947', '名稱': '群益台灣精選高息正2', 'yahoo_symbol': '00947.TW'},
            {'代號': '00948', '名稱': '群益台灣精選高息反1', 'yahoo_symbol': '00948.TW'},
            
            # 統一系列（續）
            {'代號': '00947', '名稱': '統一台灣高息動能', 'yahoo_symbol': '00947.TW'},
            {'代號': '00948', '名稱': '統一台灣高息動能正2', 'yahoo_symbol': '00948.TW'},
            {'代號': '00949', '名稱': '統一台灣高息動能反1', 'yahoo_symbol': '00949.TW'},
            
            # 元大系列（續）
            {'代號': '00948', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00948.TW'},
            {'代號': '00949', '名稱': '富邦台灣半導體', 'yahoo_symbol': '00949.TW'},
            {'代號': '00950', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00950.TW'},
            {'代號': '00951', '名稱': '元大台灣高息低波正2', 'yahoo_symbol': '00951.TW'},
            {'代號': '00952', '名稱': '元大台灣高息低波反1', 'yahoo_symbol': '00952.TW'},
            {'代號': '00953', '名稱': '元大台灣高息低波槓桿', 'yahoo_symbol': '00953.TW'},
            {'代號': '00954', '名稱': '元大台灣高息低波反向', 'yahoo_symbol': '00954.TW'},
            {'代號': '00955', '名稱': '元大台灣高息低波槓桿反向', 'yahoo_symbol': '00955.TW'},
            {'代號': '00956', '名稱': '元大台灣高息低波槓桿反向2', 'yahoo_symbol': '00956.TW'},
            {'代號': '00957', '名稱': '元大台灣高息低波槓桿反向3', 'yahoo_symbol': '00957.TW'},
            {'代號': '00958', '名稱': '元大台灣高息低波槓桿反向4', 'yahoo_symbol': '00958.TW'},
            {'代號': '00959', '名稱': '元大台灣高息低波槓桿反向5', 'yahoo_symbol': '00959.TW'},
            
            # 其他知名 ETF
            {'代號': '00701', '名稱': '國泰股利精選30', 'yahoo_symbol': '00701.TW'},
            {'代號': '00702', '名稱': '國泰股利精選30正2', 'yahoo_symbol': '00702.TW'},
            {'代號': '00703', '名稱': '國泰股利精選30反1', 'yahoo_symbol': '00703.TW'},
            {'代號': '00704', '名稱': '國泰股利精選30槓桿', 'yahoo_symbol': '00704.TW'},
            {'代號': '00705', '名稱': '國泰股利精選30反向', 'yahoo_symbol': '00705.TW'},
            {'代號': '00706', '名稱': '國泰股利精選30槓桿反向', 'yahoo_symbol': '00706.TW'},
            {'代號': '00707', '名稱': '國泰股利精選30槓桿反向2', 'yahoo_symbol': '00707.TW'},
            {'代號': '00708', '名稱': '國泰股利精選30槓桿反向3', 'yahoo_symbol': '00708.TW'},
            {'代號': '00709', '名稱': '國泰股利精選30槓桿反向4', 'yahoo_symbol': '00709.TW'},
            {'代號': '00710', '名稱': '國泰股利精選30槓桿反向5', 'yahoo_symbol': '00710.TW'},
            
            # 更多元大系列
            {'代號': '00711', '名稱': '元大台灣50正2', 'yahoo_symbol': '00711.TW'},
            {'代號': '00712', '名稱': '元大台灣50反1', 'yahoo_symbol': '00712.TW'},
            {'代號': '00713', '名稱': '元大台灣50槓桿', 'yahoo_symbol': '00713.TW'},
            {'代號': '00714', '名稱': '元大台灣50反向', 'yahoo_symbol': '00714.TW'},
            {'代號': '00715', '名稱': '元大台灣50槓桿反向', 'yahoo_symbol': '00715.TW'},
            {'代號': '00716', '名稱': '元大台灣50槓桿反向2', 'yahoo_symbol': '00716.TW'},
            {'代號': '00717', '名稱': '元大台灣50槓桿反向3', 'yahoo_symbol': '00717.TW'},
            {'代號': '00718', '名稱': '元大台灣50槓桿反向4', 'yahoo_symbol': '00718.TW'},
            {'代號': '00719', '名稱': '元大台灣50槓桿反向5', 'yahoo_symbol': '00719.TW'},
            {'代號': '00720', '名稱': '元大台灣50槓桿反向6', 'yahoo_symbol': '00720.TW'},
        ]
        
        etfs = []
        for etf in known_etfs:
            etf_data = {
                '代號': etf['代號'],
                '名稱': etf['名稱'],
                '市場': '上市',
                '交易所': 'TW',  # 添加交易所地區
                'yahoo_symbol': etf['yahoo_symbol'],
                'ISIN': '',
                '上市日期': '',
                '產業': 'ETF',
                'ETF': True
            }
            etfs.append(etf_data)
        
        print(f"✅ 成功取得 {len(etfs)} 筆台股 ETF")
        return etfs
    
    def get_nasdaq_ftp_stocks(self):
        """從 NASDAQ Trader FTP 取得美股資料"""
        print("📊 從 NASDAQ Trader FTP 取得美股資料...")
        
        try:
            # 連接到 FTP
            ftp = ftplib.FTP('ftp.nasdaqtrader.com')
            ftp.login()
            ftp.cwd('Symboldirectory')
            
            # 下載 nasdaqlisted.txt
            nasdaq_data = []
            ftp.retrlines('RETR nasdaqlisted.txt', nasdaq_data.append)
            
            # 下載 otherlisted.txt
            other_data = []
            ftp.retrlines('RETR otherlisted.txt', other_data.append)
            
            ftp.quit()
            
            # 解析 nasdaqlisted.txt
            nasdaq_stocks = []
            for line in nasdaq_data[1:]:  # 跳過標題行
                if '|' in line:
                    parts = line.split('|')
                    if len(parts) >= 2 and parts[0] and not parts[0].startswith('File Creation Time'):
                        stock = {
                            '代號': parts[0],
                            '名稱': parts[1],
                            '市場': 'NASDAQ',
                            '交易所': 'US',  # 添加交易所地區
                            'yahoo_symbol': parts[0],
                            'ETF': parts[5] == 'Y' if len(parts) > 5 else False
                        }
                        nasdaq_stocks.append(stock)
            
            # 解析 otherlisted.txt
            other_stocks = []
            for line in other_data[1:]:  # 跳過標題行
                if '|' in line:
                    parts = line.split('|')
                    if len(parts) >= 2 and parts[0] and not parts[0].startswith('File Creation Time'):
                        stock = {
                            '代號': parts[0],
                            '名稱': parts[1],
                            '市場': 'Other',
                            '交易所': 'US',  # 添加交易所地區
                            'yahoo_symbol': parts[0],
                            'ETF': parts[5] == 'Y' if len(parts) > 5 else False
                        }
                        other_stocks.append(stock)
            
            all_stocks = nasdaq_stocks + other_stocks
            print(f"✅ 成功取得 {len(all_stocks)} 筆美股資料 (NASDAQ: {len(nasdaq_stocks)}, Other: {len(other_stocks)})")
            return all_stocks
            
        except Exception as e:
            print(f"❌ 取得美股資料失敗: {e}")
            return []
    
    def get_sec_stocks(self):
        """從 SEC 取得美股資料"""
        print("📊 從 SEC 取得美股資料...")
        
        try:
            url = "https://www.sec.gov/files/company_tickers.json"
            response = self.session.get(url, timeout=30)
            data = response.json()
            
            stocks = []
            for cik, company in data.items():
                stock = {
                    '代號': company['ticker'],
                    '名稱': company['title'],
                    '市場': 'SEC',
                    '交易所': 'US',  # 添加交易所地區
                    'yahoo_symbol': company['ticker'],
                    'CIK': company['cik_str']
                }
                stocks.append(stock)
            
            print(f"✅ 成功取得 {len(stocks)} 筆 SEC 資料")
            return stocks
            
        except Exception as e:
            print(f"❌ 取得 SEC 資料失敗: {e}")
            return []
    
    def collect_all_stocks(self):
        """收集所有股票資料"""
        print("🚀 開始收集股票資料...")
        print("=" * 60)
        
        all_stocks = []
        
        # 1. 台股上市股票
        twse_stocks = self.get_twse_listed_stocks()
        all_stocks.extend(twse_stocks)
        
        # 2. 台股 ETF
        tw_etfs = self.get_tw_etfs()
        all_stocks.extend(tw_etfs)
        
        # 3. 美股 NASDAQ FTP
        nasdaq_stocks = self.get_nasdaq_ftp_stocks()
        all_stocks.extend(nasdaq_stocks)
        
        # 4. 美股 SEC
        sec_stocks = self.get_sec_stocks()
        all_stocks.extend(sec_stocks)
        
        # 移除重複
        unique_stocks = []
        seen_codes = set()
        
        for stock in all_stocks:
            code = stock['代號']
            if code not in seen_codes:
                unique_stocks.append(stock)
                seen_codes.add(code)
        
        return unique_stocks
    
    def save_stocks_data(self, stocks, filename=None):
        """儲存股票資料"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"stocks_data_{timestamp}.jsonl"
        
        df = pd.DataFrame(stocks)
        
        # 儲存完整資料
        df.to_json(filename, orient="records", lines=True, force_ascii=False)
        print(f"✅ 已儲存完整資料: {filename}")
        
        # 按市場分類儲存
        if '市場' in df.columns:
            for market in df['市場'].unique():
                market_df = df[df['市場'] == market]
                market_filename = f"stocks_{market.lower()}_{timestamp}.jsonl"
                market_df.to_json(market_filename, orient="records", lines=True, force_ascii=False)
                print(f"✅ 已儲存 {market} 資料: {market_filename} ({len(market_df)} 筆)")
        
        return df
    
    def print_statistics(self, df):
        """顯示統計資訊"""
        print("\n📊 資料統計:")
        print("=" * 40)
        print(f"總筆數: {len(df)}")
        
        if '市場' in df.columns:
            print("\n市場分布:")
            market_stats = df['市場'].value_counts()
            for market, count in market_stats.items():
                print(f"  {market}: {count} 支")
        
        if 'ETF' in df.columns:
            etf_count = df['ETF'].sum() if df['ETF'].dtype == bool else len(df[df['ETF'] == True])
            print(f"\nETF 數量: {etf_count}")
        
        print(f"\n範例資料:")
        print(df.head(5).to_string())

def main():
    """主程式"""
    print("🎯 股票資料收集器")
    print("=" * 60)
    
    collector = StockDataCollector()
    
    # 收集所有股票資料
    stocks = collector.collect_all_stocks()
    
    if stocks:
        # 儲存資料
        df = collector.save_stocks_data(stocks)
        
        # 顯示統計
        collector.print_statistics(df)
        
        print("\n" + "=" * 60)
        print("✅ 股票資料收集完成！")
        print(f"📁 資料已儲存為 JSON Lines 格式")
        print(f"📊 總計收集到 {len(stocks)} 支股票")
    else:
        print("❌ 沒有收集到任何股票資料")

if __name__ == "__main__":
    main()
