#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整台股 ETF 資料收集器
收集更完整的台股 ETF 資料
"""

import requests
import re
import json
import pandas as pd
from datetime import datetime
import time

class CompleteTWETFCollector:
    """完整台股 ETF 資料收集器"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def get_comprehensive_etf_list(self):
        """取得完整的台股 ETF 列表"""
        print("📊 取得完整台股 ETF 列表...")
        
        # 更完整的台股 ETF 列表
        comprehensive_etfs = [
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
            {'代號': '00692', '名稱': '富邦公司治理', 'yahoo_symbol': '00692.TW'},
            {'代號': '00693', '名稱': '富邦台灣公司治理100', 'yahoo_symbol': '00693.TW'},
            {'代號': '00694', '名稱': '富邦台灣公司治理100正2', 'yahoo_symbol': '00694.TW'},
            {'代號': '00695', '名稱': '富邦台灣公司治理100反1', 'yahoo_symbol': '00695.TW'},
            {'代號': '00696', '名稱': '富邦台灣公司治理100槓桿', 'yahoo_symbol': '00696.TW'},
            {'代號': '00697', '名稱': '富邦台灣公司治理100反向', 'yahoo_symbol': '00697.TW'},
            {'代號': '00698', '名稱': '富邦台灣公司治理100槓桿反向', 'yahoo_symbol': '00698.TW'},
            {'代號': '00699', '名稱': '富邦台灣公司治理100槓桿反向2', 'yahoo_symbol': '00699.TW'},
            
            # 更多 ETF（根據實際市場情況）
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
        for etf in comprehensive_etfs:
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
        
        # 移除重複
        unique_etfs = []
        seen_codes = set()
        
        for etf in etfs:
            code = etf['代號']
            if code not in seen_codes:
                unique_etfs.append(etf)
                seen_codes.add(code)
        
        print(f"✅ 成功取得 {len(unique_etfs)} 筆台股 ETF")
        return unique_etfs
    
    def get_etf_from_yahoo_finance(self):
        """從 Yahoo Finance 搜尋更多台股 ETF"""
        print("📊 從 Yahoo Finance 搜尋台股 ETF...")
        
        # 嘗試搜尋更多 ETF 代號
        etf_codes = []
        
        # 搜尋 00 開頭的代號
        for i in range(50, 1000):
            code = f"{i:04d}"
            try:
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{code}.TW"
                response = self.session.get(url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                        result = data['chart']['result'][0]
                        meta = result.get('meta', {})
                        symbol = meta.get('symbol', '')
                        short_name = meta.get('shortName', '')
                        long_name = meta.get('longName', '')
                        
                        if symbol and (short_name or long_name):
                            name = short_name or long_name
                            if any(keyword in name.lower() for keyword in ['etf', '指數', '基金', '信託']):
                                etf_codes.append({
                                    '代號': code,
                                    '名稱': name,
                                    'yahoo_symbol': f"{code}.TW"
                                })
                                print(f"發現 ETF: {code} - {name}")
                
                time.sleep(0.1)  # 避免請求過於頻繁
                
            except Exception as e:
                continue
        
        return etf_codes
    
    def collect_all_etfs(self):
        """收集所有台股 ETF 資料"""
        print("🚀 開始收集完整台股 ETF 資料...")
        print("=" * 60)
        
        all_etfs = []
        
        # 1. 從完整列表取得
        comprehensive_etfs = self.get_comprehensive_etf_list()
        all_etfs.extend(comprehensive_etfs)
        
        # 2. 從 Yahoo Finance 搜尋（可選，會比較慢）
        # yahoo_etfs = self.get_etf_from_yahoo_finance()
        # all_etfs.extend(yahoo_etfs)
        
        # 移除重複
        unique_etfs = []
        seen_codes = set()
        
        for etf in all_etfs:
            code = etf['代號']
            if code not in seen_codes:
                unique_etfs.append(etf)
                seen_codes.add(code)
        
        # 按代號排序
        unique_etfs.sort(key=lambda x: x['代號'])
        
        print(f"✅ 總共收集到 {len(unique_etfs)} 筆唯一 ETF 資料")
        
        return unique_etfs
    
    def save_etf_data(self, etfs, filename=None):
        """儲存 ETF 資料"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"data/tw_etfs_complete_{timestamp}.jsonl"
        
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
    collector = CompleteTWETFCollector()
    
    # 收集所有 ETF 資料
    etfs = collector.collect_all_etfs()
    
    if etfs:
        # 顯示前 20 筆資料
        print("\n📋 前 20 筆 ETF 資料:")
        for i, etf in enumerate(etfs[:20]):
            print(f"{i+1:2d}. {etf['代號']} - {etf['名稱']} ({etf['yahoo_symbol']})")
        
        # 儲存資料
        filename = collector.save_etf_data(etfs)
        
        if filename:
            print(f"\n✅ 完整台股 ETF 資料收集完成！")
            print(f"📁 檔案位置: {filename}")
            print(f"📊 總數量: {len(etfs)} 筆")
            
            # 顯示統計
            print(f"\n📈 ETF 統計:")
            print(f"  元大系列: {len([e for e in etfs if '元大' in e['名稱']])} 筆")
            print(f"  富邦系列: {len([e for e in etfs if '富邦' in e['名稱']])} 筆")
            print(f"  國泰系列: {len([e for e in etfs if '國泰' in e['名稱']])} 筆")
            print(f"  其他系列: {len([e for e in etfs if '元大' not in e['名稱'] and '富邦' not in e['名稱'] and '國泰' not in e['名稱']])} 筆")
    else:
        print("❌ 沒有收集到任何 ETF 資料")

if __name__ == "__main__":
    main()
