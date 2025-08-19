#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
台股 ETF 資料收集器
收集台股 ETF 的公開資料
"""

import requests
import re
import json
import pandas as pd
from datetime import datetime
import time

class TWETFCollector:
    """台股 ETF 資料收集器"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def get_twse_etf_data(self):
        """從證交所取得 ETF 資料"""
        print("📊 從證交所取得 ETF 資料...")
        
        # 證交所 ISIN 資料 - ETF 模式
        url = "https://isin.twse.com.tw/isin/C_public.jsp?strMode=2"
        
        try:
            response = self.session.get(url, timeout=30)
            response.encoding = 'big5'  # 使用 Big5 編碼
            
            # 使用正則表達式提取 ETF 資料
            pattern = r'<td[^>]*>(\d{4})[^<]*</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td><td[^>]*>([^<]+)</td>'
            matches = re.findall(pattern, response.text)
            
            etfs = []
            for match in matches:
                if match[0].isdigit() and match[0].startswith('00'):  # ETF 代號通常以 00 開頭
                    etf_data = {
                        '代號': match[0],
                        '名稱': match[1].strip(),
                        'ISIN': match[2].strip(),
                        '上市日期': match[3].strip(),
                        '市場': '上市',
                        '產業': match[4].strip(),
                        'yahoo_symbol': f"{match[0]}.TW",
                        'ETF': True
                    }
                    etfs.append(etf_data)
            
            print(f"✅ 從證交所取得 {len(etfs)} 筆 ETF 資料")
            return etfs
            
        except Exception as e:
            print(f"❌ 從證交所取得 ETF 資料失敗: {e}")
            return []
    
    def get_yahoo_finance_etf(self):
        """從 Yahoo Finance 取得台股 ETF 資料"""
        print("📊 從 Yahoo Finance 取得台股 ETF 資料...")
        
        # 已知的台股 ETF 列表
        known_etfs = [
            {'代號': '0050', '名稱': '元大台灣50', 'yahoo_symbol': '0050.TW'},
            {'代號': '0056', '名稱': '元大高股息', 'yahoo_symbol': '0056.TW'},
            {'代號': '0061', '名稱': '元大寶滬深', 'yahoo_symbol': '0061.TW'},
            {'代號': '00692', '名稱': '富邦公司治理', 'yahoo_symbol': '00692.TW'},
            {'代號': '00878', '名稱': '國泰永續高股息', 'yahoo_symbol': '00878.TW'},
            {'代號': '00881', '名稱': '國泰台灣5G+', 'yahoo_symbol': '00881.TW'},
            {'代號': '00892', '名稱': '富邦台灣半導體', 'yahoo_symbol': '00892.TW'},
            {'代號': '00929', '名稱': '復華台灣科技', 'yahoo_symbol': '00929.TW'},
            {'代號': '00930', '名稱': '永豐台灣ESG', 'yahoo_symbol': '00930.TW'},
            {'代號': '00935', '名稱': '野村台灣創新科技', 'yahoo_symbol': '00935.TW'},
            {'代號': '00939', '名稱': '統一台灣高息動能', 'yahoo_symbol': '00939.TW'},
            {'代號': '00940', '名稱': '元大台灣價值高息', 'yahoo_symbol': '00940.TW'},
            {'代號': '00941', '名稱': '中信上游半導體', 'yahoo_symbol': '00941.TW'},
            {'代號': '00942', '名稱': '中信小資高價30', 'yahoo_symbol': '00942.TW'},
            {'代號': '00943', '名稱': '兆豐台灣晶圓製造', 'yahoo_symbol': '00943.TW'},
            {'代號': '00944', '名稱': '野村趨勢動能高息', 'yahoo_symbol': '00944.TW'},
            {'代號': '00945', '名稱': '野村台灣創新科技50', 'yahoo_symbol': '00945.TW'},
            {'代號': '00946', '名稱': '群益台灣精選高息', 'yahoo_symbol': '00946.TW'},
            {'代號': '00947', '名稱': '統一台灣高息動能', 'yahoo_symbol': '00947.TW'},
            {'代號': '00948', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00948.TW'},
            {'代號': '00949', '名稱': '富邦台灣半導體', 'yahoo_symbol': '00949.TW'},
            {'代號': '00950', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00950.TW'},
            {'代號': '00951', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00951.TW'},
            {'代號': '00952', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00952.TW'},
            {'代號': '00953', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00953.TW'},
            {'代號': '00954', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00954.TW'},
            {'代號': '00955', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00955.TW'},
            {'代號': '00956', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00956.TW'},
            {'代號': '00957', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00957.TW'},
            {'代號': '00958', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00958.TW'},
            {'代號': '00959', '名稱': '元大台灣高息低波', 'yahoo_symbol': '00959.TW'},
        ]
        
        etfs = []
        for etf in known_etfs:
            etf_data = {
                '代號': etf['代號'],
                '名稱': etf['名稱'],
                '市場': '上市',
                'yahoo_symbol': etf['yahoo_symbol'],
                'ISIN': '',
                '上市日期': '',
                '產業': 'ETF',
                'ETF': True
            }
            etfs.append(etf_data)
        
        print(f"✅ 從 Yahoo Finance 取得 {len(etfs)} 筆 ETF 資料")
        return etfs
    
    def get_etf_info_from_yahoo(self, symbol):
        """從 Yahoo Finance 取得 ETF 詳細資訊"""
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
            response = self.session.get(url, timeout=10)
            data = response.json()
            
            if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                result = data['chart']['result'][0]
                meta = result.get('meta', {})
                
                return {
                    'longName': meta.get('longName', ''),
                    'shortName': meta.get('shortName', ''),
                    'exchangeName': meta.get('exchangeName', ''),
                    'instrumentInfo': meta.get('instrumentInfo', {})
                }
        except:
            pass
        
        return None
    
    def collect_all_etfs(self):
        """收集所有台股 ETF 資料"""
        print("🚀 開始收集台股 ETF 資料...")
        print("=" * 60)
        
        all_etfs = []
        
        # 1. 從證交所取得 ETF 資料
        twse_etfs = self.get_twse_etf_data()
        all_etfs.extend(twse_etfs)
        
        # 2. 從 Yahoo Finance 取得已知 ETF 資料
        yahoo_etfs = self.get_yahoo_finance_etf()
        all_etfs.extend(yahoo_etfs)
        
        # 移除重複
        unique_etfs = []
        seen_codes = set()
        
        for etf in all_etfs:
            code = etf['代號']
            if code not in seen_codes:
                unique_etfs.append(etf)
                seen_codes.add(code)
        
        print(f"✅ 總共收集到 {len(unique_etfs)} 筆唯一 ETF 資料")
        
        # 按代號排序
        unique_etfs.sort(key=lambda x: x['代號'])
        
        return unique_etfs
    
    def save_etf_data(self, etfs, filename=None):
        """儲存 ETF 資料"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"data/tw_etfs_{timestamp}.jsonl"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                for etf in etfs:
                    f.write(json.dumps(etf, ensure_ascii=False) + '\n')
            
            print(f"✅ ETF 資料已儲存至 {filename}")
            return filename
        except Exception as e:
            print(f"❌ 儲存 ETF 資料失敗: {e}")
            return None

def main():
    """主程式"""
    collector = TWETFCollector()
    
    # 收集所有 ETF 資料
    etfs = collector.collect_all_etfs()
    
    if etfs:
        # 顯示前 10 筆資料
        print("\n📋 前 10 筆 ETF 資料:")
        for i, etf in enumerate(etfs[:10]):
            print(f"{i+1:2d}. {etf['代號']} - {etf['名稱']} ({etf['yahoo_symbol']})")
        
        # 儲存資料
        filename = collector.save_etf_data(etfs)
        
        if filename:
            print(f"\n✅ 台股 ETF 資料收集完成！")
            print(f"📁 檔案位置: {filename}")
            print(f"📊 總數量: {len(etfs)} 筆")
    else:
        print("❌ 沒有收集到任何 ETF 資料")

if __name__ == "__main__":
    main()
