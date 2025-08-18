import yahooFinance from 'yahoo-finance2';
import { Candle } from '@/types';
import { logger } from './logger';

export class YahooFinanceService {
  /**
   * 取得股票的K線資料
   * @param symbol 股票代碼
   * @param from 開始日期 (YYYY-MM-DD)
   * @param to 結束日期 (YYYY-MM-DD)
   * @param interval 時間間隔 (1d, 1m, 5m, 15m, 30m, 60m)
   * @returns K線資料陣列
   */
  public async getKlineData(symbol: string, from?: string, to?: string, interval: string = '1d'): Promise<Candle[]> {
    try {
      logger.yahooFinance.request(`Fetching data for ${symbol}`, { from, to, interval });
      
      // 轉換股票代碼格式
      const formattedSymbol = this.formatSymbol(symbol);
      
      // 設定查詢選項 - 必須提供日期範圍
      const queryOptions: any = {
        interval: interval,
      };

      // 設定預設日期範圍（如果沒有提供）
      const today = new Date();
      const defaultDaysAgo = new Date();
      defaultDaysAgo.setDate(today.getDate() - 365); // 改為365天（約1年）
      
      const startDate = from || defaultDaysAgo.toISOString().split('T')[0];
      const endDate = to || today.toISOString().split('T')[0];
      
      queryOptions.period1 = startDate;
      queryOptions.period2 = endDate;

      // 取得歷史資料
      let result;
      if (interval === '1d') {
        // 日K使用 historical API
        result = await yahooFinance.historical(formattedSymbol, queryOptions);
      } else {
        // 分K使用 chart API
        result = await yahooFinance.chart(formattedSymbol, queryOptions);
        result = result.quotes || []; // chart API 返回 { quotes: [...] }
      }
      
      logger.yahooFinance.response(`Returned ${result.length} records for ${symbol}`);
      
      // 顯示資料範圍
      if (result.length > 0) {
        const firstDate = this.formatTime(result[0].date, interval);
        const lastDate = this.formatTime(result[result.length - 1].date, interval);
        logger.yahooFinance.dataRange(`Data range: ${firstDate} to ${lastDate}`);
      }
      
      // 轉換資料格式
      const candles: Candle[] = result.map(item => ({
        time: this.formatTime(item.date, interval), // 根據間隔格式化時間
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        adj_close: item.adjClose,
      }));

      // 按日期升序排列（最舊的在前，符合 Lightweight Charts 要求）
      candles.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      return candles;
    } catch (error) {
      logger.yahooFinance.error(`Error for ${symbol}`, error);
      throw new Error(`無法從 Yahoo Finance 取得 ${symbol} 的資料: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 格式化股票代碼
   * @param symbol 原始股票代碼
   * @returns 格式化後的股票代碼
   */
  private formatSymbol(symbol: string): string {
    // 台股：加上 .TW 後綴
    // 支援 4-5 位數股票代碼 (如 2330, 0050, 0056, 00878)
    if (/^\d{4,5}$/.test(symbol)) {
      return `${symbol}.TW`;
    }
    
    // 美股：直接使用
    return symbol;
  }

  /**
   * 格式化時間
   * @param date 日期物件
   * @param interval 時間間隔
   * @returns 格式化後的時間字串
   */
  private formatTime(date: Date, interval: string): string {
    if (interval === '1d') {
      // 日K：YYYY-MM-DD 格式
      return date.toISOString().split('T')[0];
    } else {
      // 分K：YYYY-MM-DD HH:MM 格式
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  }

  /**
   * 檢查服務是否可用
   */
  public isAvailable(): boolean {
    return true; // Yahoo Finance 不需要 API Key
  }

  /**
   * 測試連接
   */
  public async testConnection(): Promise<boolean> {
    try {
      const result = await yahooFinance.historical('AAPL', { period1: '2024-01-01', period2: '2024-01-02' });
      return result.length > 0;
    } catch (error) {
      console.error('Yahoo Finance connection test failed:', error);
      return false;
    }
  }

  /**
   * 取得股票的日線資料（向後相容）
   */
  public async getDailyData(symbol: string, from?: string, to?: string): Promise<Candle[]> {
    return this.getKlineData(symbol, from, to, '1d');
  }
}
