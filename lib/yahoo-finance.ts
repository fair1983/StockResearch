import yahooFinance from 'yahoo-finance2';
import { logger } from './logger';
import { stockMetadataManager } from './stock-metadata';

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class YahooFinanceService {
  /**
   * 取得K線資料
   * @param symbol 股票代碼
   * @param market 市場 (TW/US)
   * @param interval 時間間隔
   * @param period1 開始時間
   * @param period2 結束時間
   * @returns K線資料
   */
  public async getKlineData(
    symbol: string,
    market: string = 'TW',
    interval: string = '1d',
    period1?: Date,
    period2?: Date
  ): Promise<Candle[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      logger.yahooFinance.request(`Fetching K-line data for ${symbol}`, { market, interval });

      // 設定預設時間範圍（20年前到現在）
      const startDate = period1 || new Date(Date.now() - 20 * 365 * 24 * 60 * 60 * 1000);
      const endDate = period2 || new Date();

      const result = await yahooFinance.historical(formattedSymbol, {
        period1: startDate,
        period2: endDate,
        interval: this.mapInterval(interval)
      });

      // 轉換為內部格式
      const candles: Candle[] = result.map(item => ({
        time: this.formatTime(item.date, interval),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));

      logger.yahooFinance.response(`K-line data for ${symbol} fetched`, { count: candles.length });
      return candles;
    } catch (error) {
      logger.yahooFinance.error(`Error fetching K-line data for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * 取得分頁K線資料
   * @param symbol 股票代碼
   * @param market 市場
   * @param interval 時間間隔
   * @param page 頁碼
   * @param pageSize 每頁大小
   * @param existingData 現有資料
   * @returns 分頁K線資料
   */
  public async getKlineDataByPage(
    symbol: string,
    market: string = 'TW',
    interval: string = '1d',
    page: number = 1,
    pageSize: number = 100,
    existingData: Candle[] = []
  ): Promise<{ data: Candle[]; hasMore: boolean }> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      logger.yahooFinance.request(`Fetching paged K-line data for ${symbol}`, { 
        market, interval, page, pageSize 
      });

      // 計算時間範圍
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - pageSize * 24 * 60 * 60 * 1000);

      const result = await yahooFinance.historical(formattedSymbol, {
        period1: startDate,
        period2: endDate,
        interval: this.mapInterval(interval)
      });

      // 轉換為內部格式
      const newCandles: Candle[] = result.map(item => ({
        time: this.formatTime(item.date, interval),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));

      // 合併資料並去重
      const mergedData = this.mergeCandleData(existingData, newCandles);
      const hasMore = newCandles.length >= pageSize;

      logger.yahooFinance.response(`Paged K-line data for ${symbol} fetched`, { 
        newCount: newCandles.length, 
        totalCount: mergedData.length,
        hasMore 
      });

      return { data: mergedData, hasMore };
    } catch (error) {
      logger.yahooFinance.error(`Error fetching paged K-line data for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * 取得股票報價資訊並更新元資料
   * @param symbol 股票代碼
   * @param market 市場
   * @returns 報價資訊
   */
  public async getQuote(symbol: string, market: string = 'TW'): Promise<any> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      logger.yahooFinance.request(`Fetching quote for ${symbol}`, { market });

      const quote = await yahooFinance.quote(formattedSymbol);
      
      // 取得基本面資料
      let summary = null;
      try {
        summary = await yahooFinance.quoteSummary(formattedSymbol, {
          modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics']
        });
      } catch (summaryError) {
        logger.yahooFinance.warn(`Failed to fetch summary for ${symbol}`, summaryError);
      }

      // 更新股票元資料
      stockMetadataManager.updateFromYahooData(symbol, quote, summary);
      
      // 儲存元資料
      await stockMetadataManager.save();

      logger.yahooFinance.response(`Quote for ${symbol} fetched`);
      return quote;
    } catch (error) {
      logger.yahooFinance.error(`Error fetching quote for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * 搜尋股票
   * @param query 搜尋關鍵字
   * @param limit 結果數量限制
   * @returns 搜尋結果
   */
  public async searchStocks(query: string, limit: number = 10): Promise<any[]> {
    try {
      logger.yahooFinance.request(`Searching stocks with query: ${query}`, { limit });

      const searchResults = await yahooFinance.search(query);
      
      if (!searchResults || !searchResults.quotes) {
        return [];
      }

      const results = searchResults.quotes.slice(0, limit);
      
      // 為每個搜尋結果更新元資料
      for (const result of results) {
        try {
          const quote = await yahooFinance.quote(result.symbol);
          stockMetadataManager.updateFromYahooData(result.symbol, quote);
        } catch (quoteError) {
          logger.yahooFinance.warn(`Failed to fetch quote for ${result.symbol}`, quoteError);
        }
      }

      // 儲存元資料
      await stockMetadataManager.save();

      logger.yahooFinance.response(`Stock search completed`, { count: results.length });
      return results;
    } catch (error) {
      logger.yahooFinance.error(`Error searching stocks`, error);
      throw error;
    }
  }

  /**
   * 取得基本面資料
   * @param symbol 股票代碼
   * @param market 市場
   * @returns 基本面資料
   */
  public async getFundamentals(symbol: string, market: string = 'TW'): Promise<{[key: string]: any}> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      logger.yahooFinance.request(`Fetching fundamentals for ${symbol}`, { market });

      const modules = ['price','summaryDetail','financialData','defaultKeyStatistics'] as const;
      const qs: any = await yahooFinance.quoteSummary(formattedSymbol, { modules: modules as any });

      const price = qs?.price || {};
      const summaryDetail = qs?.summaryDetail || {};
      const financialData = qs?.financialData || {};
      const stats = qs?.defaultKeyStatistics || {};

      const data = {
        currency: price.currency || financialData.financialCurrency || price.currencySymbol || undefined,
        marketCap: price.marketCap || stats.marketCap || undefined,
        enterpriseValue: stats.enterpriseValue || undefined,
        trailingPE: stats.trailingPE || price.trailingPE || undefined,
        forwardPE: stats.forwardPE || price.forwardPE || undefined,
        priceToBook: stats.priceToBook || undefined,
        pegRatio: stats.pegRatio || undefined,
        epsTrailingTwelveMonths: stats.trailingEps || financialData.epsTrailingTwelveMonths || undefined,
        ebitda: financialData.ebitda || undefined,
        totalRevenue: financialData.totalRevenue || undefined,
        revenueGrowth: financialData.revenueGrowth || undefined,
        grossMargins: financialData.grossMargins || undefined,
        profitMargins: financialData.profitMargins || undefined,
        operatingMargins: financialData.operatingMargins || undefined,
        freeCashflow: financialData.freeCashflow || undefined,
        dividendYield: summaryDetail.dividendYield || undefined,
        payoutRatio: summaryDetail.payoutRatio || undefined,
      };

      logger.yahooFinance.response(`Fundamentals for ${symbol} fetched`);
      return data;
    } catch (error) {
      logger.yahooFinance.error(`Error fetching fundamentals for ${symbol}`, error);
      throw error;
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
   * 合併K線資料並去重
   * @param existingData 現有資料
   * @param newData 新資料
   * @returns 合併後的資料
   */
  private mergeCandleData(existingData: Candle[], newData: Candle[]): Candle[] {
    const dataMap = new Map<string, Candle>();
    
    // 先加入現有資料
    existingData.forEach(candle => {
      dataMap.set(candle.time, candle);
    });
    
    // 新資料會覆蓋舊資料
    newData.forEach(candle => {
      dataMap.set(candle.time, candle);
    });
    
    // 轉換回陣列並排序
    return Array.from(dataMap.values()).sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * 檢查服務是否可用
   * @returns 是否可用
   */
  public async isAvailable(): Promise<boolean> {
    try {
      await yahooFinance.quote('AAPL');
      return true;
    } catch (error) {
      return false;
    }
  }
}
