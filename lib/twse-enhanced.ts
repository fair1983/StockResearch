import axios from 'axios';
import { Candle } from '@/types';

// 多個台股資料來源
const DATA_SOURCES = {
  TWSE: 'https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY',
  TWSE_AVG: 'https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_AVG',
  GOODINFO: 'https://goodinfo.tw/tw/StockDetail.asp',
};

export class TWSEEnhancedService {
  private async tryTWSE(symbol: string, year: number, month: number): Promise<Candle[]> {
    try {
      const response = await axios.get(DATA_SOURCES.TWSE, {
        params: {
          stockNo: symbol,
          date: `${year}${month.toString().padStart(2, '0')}01`,
          response: 'json',
        },
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        },
      });

      const data = response.data;
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid TWSE data format');
      }

      return this.parseTWSEData(data.data);
    } catch (error) {
              console.warn(`TWSE API failed for ${symbol} ${year}/${month}:`, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private parseTWSEData(rawData: any[]): Candle[] {
    const candles: Candle[] = [];
    
    for (const row of rawData) {
      if (row.length >= 8) {
        const [date, volume, amount, open, high, low, close, change] = row;
        
        // 跳過標題行或無效資料
        if (typeof date !== 'string' || date.includes('日期') || date.includes('年月日')) {
          continue;
        }

        // 解析日期格式 (民國年/月/日)
        const dateMatch = date.match(/(\d+)\/(\d+)\/(\d+)/);
        if (!dateMatch) continue;

        const [_, yearStr, monthStr, dayStr] = dateMatch;
        const yearNum = parseInt(yearStr) + 1911; // 民國年轉西元年
        const monthNum = parseInt(monthStr);
        const dayNum = parseInt(dayStr);
        
        const formattedDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;

        // 清理數值資料（移除逗號）
        const cleanVolume = parseInt(volume.replace(/,/g, ''));
        const cleanOpen = parseFloat(open.replace(/,/g, ''));
        const cleanHigh = parseFloat(high.replace(/,/g, ''));
        const cleanLow = parseFloat(low.replace(/,/g, ''));
        const cleanClose = parseFloat(close.replace(/,/g, ''));

        if (isNaN(cleanVolume) || isNaN(cleanOpen) || isNaN(cleanHigh) || isNaN(cleanLow) || isNaN(cleanClose)) {
          continue;
        }

        candles.push({
          time: formattedDate,
          open: cleanOpen,
          high: cleanHigh,
          low: cleanLow,
          close: cleanClose,
          volume: cleanVolume,
          adj_close: cleanClose, // TWSE 沒有調整收盤價，使用收盤價
        });
      }
    }

    return candles.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  public async getHistoricalData(symbol: string, fromDate?: string, toDate?: string): Promise<Candle[]> {
    const allCandles: Candle[] = [];
    const currentDate = new Date();
    const fromYear = fromDate ? new Date(fromDate).getFullYear() : currentDate.getFullYear() - 1;
    const toYear = toDate ? new Date(toDate).getFullYear() : currentDate.getFullYear();

    // 取得最近 1 年的資料
    for (let year = fromYear; year <= toYear; year++) {
      for (let month = 1; month <= 12; month++) {
        try {
          const monthData = await this.tryTWSE(symbol, year, month);
          allCandles.push(...monthData);
          
          // 避免過於頻繁的請求
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.warn(`Failed to fetch data for ${symbol} ${year}/${month}:`, error);
          continue;
        }
      }
    }

    // 去重並排序
    const uniqueCandles = allCandles.filter((candle, index, self) => 
      index === self.findIndex(c => c.time === candle.time)
    );

    return uniqueCandles.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  // 取得最近一個月的資料（用於快速測試）
  public async getRecentData(symbol: string): Promise<Candle[]> {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    try {
      return await this.tryTWSE(symbol, year, month);
    } catch (error) {
      console.warn(`Failed to fetch recent data for ${symbol}:`, error);
      return [];
    }
  }
}
