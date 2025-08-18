import yahooFinance from 'yahoo-finance2';
import { Candle } from '@/types';
import { logger } from './logger';
import { StockCache } from './stock-cache';

export class YahooFinanceService {
  private cache: StockCache;

  constructor() {
    this.cache = new StockCache();
  }

  /**
   * 取得股票的K線資料（支援快取）
   * @param symbol 股票代碼
   * @param from 開始日期 (YYYY-MM-DD)
   * @param to 結束日期 (YYYY-MM-DD)
   * @param interval 時間間隔 (1d, 1m, 5m, 15m, 30m, 60m)
   * @param market 市場 (TW, US)
   * @returns K線資料陣列
   */
  public async getKlineData(symbol: string, from?: string, to?: string, interval: string = '1d', market: string = 'TW'): Promise<Candle[]> {
    try {
      logger.yahooFinance.request(`Fetching data for ${symbol}`, { from, to, interval, market });
      
      // 先嘗試從快取讀取資料
      const cachedData = await this.cache.getCachedData(market, symbol, interval, from, to);
      if (cachedData) {
        logger.yahooFinance.response(`Using cached data for ${symbol} (${cachedData.length} records)`);
        return cachedData;
      }
      
      // 轉換股票代碼格式
      const formattedSymbol = this.formatSymbol(symbol);
      
      // 設定查詢選項 - 必須提供日期範圍
      const queryOptions: any = {
        interval: this.mapInterval(interval),
      };

      // 設定預設日期範圍（如果沒有提供）
      const today = new Date();
      let defaultDaysAgo = new Date();
      
      // 如果沒有指定日期範圍，則取得更長期的歷史資料
      if (!from && !to) {
        // 設定為 20 年前的日期，以取得更完整的歷史資料
        // 台積電成立於 1987 年，許多台股都有很長的歷史
        defaultDaysAgo.setFullYear(today.getFullYear() - 20);
      } else {
        // 如果指定了日期範圍，則使用指定的範圍
        defaultDaysAgo.setDate(today.getDate() - 365); // 預設一年
      }
      
      const startDate = from || defaultDaysAgo.toISOString().split('T')[0];
      const endDate = to || today.toISOString().split('T')[0];
      
      queryOptions.period1 = startDate;
      queryOptions.period2 = endDate;

      // 取得歷史資料
      let result;
      if (['1d', '1w', '1mo', '3mo', '6mo', '1y'].includes(interval)) {
        // 日K、週K、月K等使用 historical API
        result = await yahooFinance.historical(formattedSymbol, queryOptions);
      } else {
        // 分K使用 chart API
        result = await yahooFinance.chart(formattedSymbol, queryOptions);
        result = (result as any).quotes || []; // chart API 返回 { quotes: [...] }
      }
      
      logger.yahooFinance.response(`Returned ${result.length} records for ${symbol}`);
      
      // 顯示資料範圍
      if (result.length > 0) {
        const firstDate = this.formatTime(result[0].date, interval);
        const lastDate = this.formatTime(result[result.length - 1].date, interval);
        logger.yahooFinance.dataRange(`Data range: ${firstDate} to ${lastDate}`);
      }
      
      // 轉換資料格式
      const candles: Candle[] = result.map((item: any) => ({
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

      // 將資料儲存到快取
      await this.cache.setCachedData(market, symbol, interval, candles, from, to);

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
   * 映射時間間隔到 Yahoo Finance 支援的格式
   * @param interval 內部時間間隔
   * @returns Yahoo Finance 支援的時間間隔
   */
  private mapInterval(interval: string): string {
    const intervalMap: { [key: string]: string } = {
      '1d': '1d',
      '1w': '1wk',
      '1M': '1mo',
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '60m': '60m',
    };
    return intervalMap[interval] || '1d';
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
    } else if (interval === '1w' || interval === '1M') {
      // 週K、月K：YYYY-MM-DD 格式
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

  /**
   * 分頁取得股票的歷史資料並合併到現有資料
   * @param symbol 股票代碼
   * @param page 頁碼 (從 1 開始)
   * @param pageSize 每頁資料量
   * @param interval 時間間隔
   * @param market 市場
   * @param existingData 現有資料（可選）
   * @returns 合併後的分頁資料
   */
  public async getKlineDataByPage(symbol: string, page: number = 1, pageSize: number = 1000, interval: string = '1d', market: string = 'TW', existingData?: Candle[]): Promise<{
    data: Candle[];
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
    earliestDate?: string;
    latestDate?: string;
    mergedCount: number;
    newCount: number;
  }> {
    try {
      logger.yahooFinance.request(`Fetching page ${page} for ${symbol}`, { page, pageSize, interval, market });
      
      // 計算日期範圍
      const today = new Date();
      const endDate = new Date();
      const startDate = new Date();
      
      // 每頁代表一段時間範圍，逐步往前
      const daysPerPage = pageSize * this.getDaysPerInterval(interval);
      const offsetDays = (page - 1) * daysPerPage;
      
      endDate.setDate(today.getDate() - offsetDays);
      startDate.setDate(endDate.getDate() - daysPerPage);
      
      const fromStr = startDate.toISOString().split('T')[0];
      const toStr = endDate.toISOString().split('T')[0];
      
      logger.yahooFinance.request(`Date range for page ${page}: ${fromStr} to ${toStr}`);
      
      // 取得該頁的資料
      const pageData = await this.getKlineData(symbol, fromStr, toStr, interval, market);
      
      // 合併資料並去重
      let mergedData: Candle[] = [];
      let mergedCount = 0;
      let newCount = 0;
      
      if (existingData && existingData.length > 0) {
        // 如果有現有資料，進行合併和去重
        const existingMap = new Map<string, Candle>();
        existingData.forEach(candle => {
          existingMap.set(candle.time, candle);
        });
        
        // 添加新資料，如果時間重複則覆蓋
        pageData.forEach(candle => {
          if (existingMap.has(candle.time)) {
            existingMap.set(candle.time, candle); // 覆蓋舊資料
            mergedCount++;
          } else {
            existingMap.set(candle.time, candle);
            newCount++;
          }
        });
        
        // 轉換回陣列並排序
        mergedData = Array.from(existingMap.values()).sort((a, b) => 
          new Date(a.time).getTime() - new Date(b.time).getTime()
        );
      } else {
        // 沒有現有資料，直接使用新資料
        mergedData = pageData;
        newCount = pageData.length;
      }
      
      // 估算總頁數（基於 20 年的歷史資料）
      const totalYears = 20;
      const totalDays = totalYears * 365;
      const totalPages = Math.ceil(totalDays / daysPerPage);
      
      const hasMore = page < totalPages;
      
      return {
        data: mergedData,
        totalPages,
        currentPage: page,
        hasMore,
        earliestDate: mergedData.length > 0 ? mergedData[0].time : undefined,
        latestDate: mergedData.length > 0 ? mergedData[mergedData.length - 1].time : undefined,
        mergedCount,
        newCount,
      };
    } catch (error) {
      logger.yahooFinance.error(`Error fetching page ${page} for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * 根據時間間隔取得對應的天數
   */
  private getDaysPerInterval(interval: string): number {
    const intervalMap: { [key: string]: number } = {
      '1d': 1,
      '1w': 7,
      '1M': 30,
      '1m': 1/1440, // 1分鐘
      '5m': 5/1440,
      '15m': 15/1440,
      '30m': 30/1440,
      '60m': 60/1440,
    };
    return intervalMap[interval] || 1;
  }
}
