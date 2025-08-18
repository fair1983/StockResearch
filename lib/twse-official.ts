import axios from 'axios';
import { Candle } from '@/types';

// TWSE 官方 API 端點
const TWSE_ENDPOINTS = {
  // 舊版月檔 API（單一股票、單一月份）
  STOCK_DAY: 'https://www.twse.com.tw/exchangeReport/STOCK_DAY',
  // 新版 OpenAPI（整批資料）
  FMSRFK_ALL: 'https://openapi.twse.com.tw/v1/exchangeReport/FMSRFK_ALL',
  // 大盤統計資訊
  MI_INDEX: 'https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX',
};

export class TWSEOfficialService {
  /**
   * 使用新版 OpenAPI 取得股票月成交資訊
   */
  private async fetchMonthlyBulkAndFilter(stockNo: string): Promise<Candle[]> {
    try {
      const response = await axios.get(TWSE_ENDPOINTS.FMSRFK_ALL, {
        timeout: 15000,
      });

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid TWSE OpenAPI response format');
      }

      // 過濾指定股票的資料
      const stockData = response.data.filter((item: any) => item['股票代號'] === stockNo);
      
      if (stockData.length === 0) {
        throw new Error(`No data found for stock ${stockNo}`);
      }

      // 轉換為 Candle 格式
      return this.parseOpenAPIData(stockData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`TWSE OpenAPI HTTP error: ${error.response?.status} - ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 解析 TWSE OpenAPI 資料格式
   */
  private parseOpenAPIData(rawData: any[]): Candle[] {
    const candles: Candle[] = [];
    
    for (const item of rawData) {
      try {
        // 檢查必要欄位
        if (!item['年月'] || !item['開盤價'] || !item['最高價'] || !item['最低價'] || !item['收盤價']) {
          continue;
        }
        
        // 解析年月：202412 -> 2024-12-01
        const yearMonth = String(item['年月']);
        const year = yearMonth.substring(0, 4);
        const month = yearMonth.substring(4, 6);
        const date = `${year}-${month}-01`;
        
        // 清理數值（移除千分位逗號）
        const toNum = (str: string) => {
          const cleaned = String(str).replace(/[,]/g, '');
          const num = Number(cleaned);
          return isNaN(num) ? null : num;
        };
        
        const openNum = toNum(item['開盤價']);
        const highNum = toNum(item['最高價']);
        const lowNum = toNum(item['最低價']);
        const closeNum = toNum(item['收盤價']);
        const volumeNum = toNum(item['成交股數'] || '0');
        
        // 檢查數值有效性
        if (openNum === null || highNum === null || lowNum === null || closeNum === null) {
          continue;
        }
        
        candles.push({
          time: date,
          open: openNum,
          high: highNum,
          low: lowNum,
          close: closeNum,
          volume: volumeNum || 0,
          adj_close: closeNum, // TWSE 沒有調整收盤價
        });
      } catch (error) {
        console.warn('Failed to parse TWSE OpenAPI item:', error);
        continue;
      }
    }
    
    return candles.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  /**
   * 取得股票歷史資料（使用 OpenAPI）
   */
  public async getHistoricalData(symbol: string, fromDate?: string, toDate?: string): Promise<Candle[]> {
    try {
      // 使用 OpenAPI 取得所有資料
      const allCandles = await this.fetchMonthlyBulkAndFilter(symbol);
      
      // 篩選日期範圍
      let filteredCandles = allCandles;
      if (fromDate || toDate) {
        filteredCandles = allCandles.filter(candle => {
          const candleDate = new Date(candle.time);
          const fromDateObj = fromDate ? new Date(fromDate) : null;
          const toDateObj = toDate ? new Date(toDate) : null;

          if (fromDateObj && candleDate < fromDateObj) return false;
          if (toDateObj && candleDate > toDateObj) return false;
          return true;
        });
      }

      return filteredCandles.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    } catch (error) {
      console.error(`Failed to get historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * 取得最近一個月的資料（快速測試用）
   */
  public async getRecentData(symbol: string): Promise<Candle[]> {
    try {
      const allData = await this.fetchMonthlyBulkAndFilter(symbol);
      // 只回傳最近 12 個月的資料
      return allData.slice(0, 12);
    } catch (error) {
      console.warn(`Failed to fetch recent data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * 測試 API 連接
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(TWSE_ENDPOINTS.MI_INDEX, {
        timeout: 10000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('TWSE API connection test failed:', error);
      return false;
    }
  }
}
