import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

export interface StockMetadata {
  symbol: string;
  name: string;
  market: string;
  category: string;
  exchange: string;
  exchangeName: string;
  quoteType: string;
  currency: string;
  lastUpdated: string;
  yahooData?: {
    longName?: string;
    shortName?: string;
    market?: string;
    fullExchangeName?: string;
    exchangeTimezoneName?: string;
    dividendYield?: number;
    trailingPE?: number;
    totalAssets?: number;
    fundFamily?: string;
    fundInceptionDate?: string;
    [key: string]: any;
  };
}

export interface StockMetadataStore {
  version: string;
  lastUpdated: string;
  stocks: { [symbol: string]: StockMetadata };
}

export class StockMetadataManager {
  private metadataPath: string;
  private metadata: StockMetadataStore;

  constructor() {
    this.metadataPath = path.join(process.cwd(), 'data', 'stock-metadata.json');
    this.metadata = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      stocks: {}
    };
  }

  /**
   * 載入元資料
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf8');
      this.metadata = JSON.parse(data);
      logger.stockMetadata.info(`載入 ${Object.keys(this.metadata.stocks).length} 筆股票元資料`);
    } catch (error) {
      logger.stockMetadata.warn('元資料檔案不存在，將創建新的檔案');
      await this.save();
    }
  }

  /**
   * 儲存元資料
   */
  async save(): Promise<void> {
    try {
      this.metadata.lastUpdated = new Date().toISOString();
      await fs.writeFile(this.metadataPath, JSON.stringify(this.metadata, null, 2), 'utf8');
      logger.stockMetadata.info('元資料已儲存');
    } catch (error) {
      logger.stockMetadata.error('儲存元資料失敗', error);
      throw error;
    }
  }

  /**
   * 取得股票元資料
   */
  getStockMetadata(symbol: string): StockMetadata | null {
    return this.metadata.stocks[symbol] || null;
  }

  /**
   * 設定股票元資料
   */
  setStockMetadata(symbol: string, metadata: Partial<StockMetadata>): void {
    const existing = this.metadata.stocks[symbol] || {
      symbol,
      name: '',
      market: 'TW',
      category: 'stock',
      exchange: '',
      exchangeName: '',
      quoteType: '',
      currency: 'TWD',
      lastUpdated: new Date().toISOString()
    };

    this.metadata.stocks[symbol] = {
      ...existing,
      ...metadata,
      lastUpdated: new Date().toISOString()
    };

    logger.stockMetadata.info(`更新股票元資料: ${symbol}`);
  }

  /**
   * 從 Yahoo Finance 資料更新股票元資料
   */
  updateFromYahooData(symbol: string, yahooQuote: any, yahooSummary?: any): void {
    const metadata: Partial<StockMetadata> = {
      symbol,
      name: yahooQuote.longName || yahooQuote.shortName || '',
      market: this.determineMarketFromYahoo(yahooQuote),
      category: this.determineCategoryFromYahoo(yahooQuote),
      exchange: yahooQuote.exchange || '',
      exchangeName: yahooQuote.fullExchangeName || yahooQuote.exchangeName || '',
      quoteType: yahooQuote.quoteType || '',
      currency: yahooQuote.currency || 'TWD',
      yahooData: {
        longName: yahooQuote.longName,
        shortName: yahooQuote.shortName,
        market: yahooQuote.market,
        fullExchangeName: yahooQuote.fullExchangeName,
        exchangeTimezoneName: yahooQuote.exchangeTimezoneName,
        dividendYield: yahooQuote.dividendYield,
        trailingPE: yahooQuote.trailingPE,
        totalAssets: yahooQuote.totalAssets || yahooQuote.netAssets,
        fundFamily: yahooQuote.fundFamily,
        fundInceptionDate: yahooQuote.fundInceptionDate,
        ...yahooQuote
      }
    };

    // 如果有基本面資料，也加入
    if (yahooSummary) {
      metadata.yahooData = {
        ...metadata.yahooData,
        summaryDetail: yahooSummary.summaryDetail,
        defaultKeyStatistics: yahooSummary.defaultKeyStatistics,
        price: yahooSummary.price
      };
    }

    this.setStockMetadata(symbol, metadata);
  }

  /**
   * 根據 Yahoo Finance 資料判斷市場
   */
  private determineMarketFromYahoo(quote: any): string {
    // 優先使用 market 欄位
    if (quote.market === 'tw_market') return 'TW';
    if (quote.market === 'us_market') return 'US';
    
    // 根據交易所代碼判斷
    if (quote.exchange === 'TAI') return 'TW';
    if (['NMS', 'NYQ', 'PCX', 'NGM', 'OPR', 'NEO', 'BTS', 'PNK'].includes(quote.exchange)) return 'US';
    
    // 根據股票代碼格式判斷（備用）
    if (/^\d{4,5}$/.test(quote.symbol)) return 'TW';
    if (/^[A-Z][A-Z0-9.]{0,6}$/.test(quote.symbol)) return 'US';
    
    return 'TW'; // 預設
  }

  /**
   * 根據 Yahoo Finance 資料判斷類別
   */
  private determineCategoryFromYahoo(quote: any): string {
    // 優先使用 quoteType 欄位
    if (quote.quoteType === 'ETF') return 'etf';
    if (quote.quoteType === 'EQUITY') return 'stock';
    if (quote.quoteType === 'OPTION') return 'option';
    
    // 根據股票代碼格式判斷（備用）
    if (/^\d{5}$/.test(quote.symbol)) return 'etf';
    if (/^\d{4}$/.test(quote.symbol)) return 'stock';
    
    return 'stock'; // 預設
  }

  /**
   * 取得所有股票元資料
   */
  getAllStockMetadata(): { [symbol: string]: StockMetadata } {
    return this.metadata.stocks;
  }

  /**
   * 根據市場篩選股票
   */
  getStocksByMarket(market: string): StockMetadata[] {
    return Object.values(this.metadata.stocks).filter(stock => stock.market === market);
  }

  /**
   * 根據類別篩選股票
   */
  getStocksByCategory(category: string): StockMetadata[] {
    return Object.values(this.metadata.stocks).filter(stock => stock.category === category);
  }

  /**
   * 搜尋股票
   */
  searchStocks(query: string, limit: number = 10): StockMetadata[] {
    const lowerQuery = query.toLowerCase();
    const results = Object.values(this.metadata.stocks)
      .filter(stock => 
        stock.symbol.toLowerCase().includes(lowerQuery) ||
        stock.name.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => {
        // 優先顯示代碼完全匹配的結果
        if (a.symbol.toLowerCase() === lowerQuery) return -1;
        if (b.symbol.toLowerCase() === lowerQuery) return 1;
        return a.symbol.localeCompare(b.symbol);
      })
      .slice(0, limit);

    return results;
  }

  /**
   * 取得統計資訊
   */
  getStats(): {
    total: number;
    byMarket: { [market: string]: number };
    byCategory: { [category: string]: number };
  } {
    const stocks = Object.values(this.metadata.stocks);
    const byMarket: { [market: string]: number } = {};
    const byCategory: { [category: string]: number } = {};

    stocks.forEach(stock => {
      byMarket[stock.market] = (byMarket[stock.market] || 0) + 1;
      byCategory[stock.category] = (byCategory[stock.category] || 0) + 1;
    });

    return {
      total: stocks.length,
      byMarket,
      byCategory
    };
  }

  /**
   * 清理過期的元資料（超過30天未更新）
   */
  async cleanupOldMetadata(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldSymbols: string[] = [];

    Object.entries(this.metadata.stocks).forEach(([symbol, metadata]) => {
      if (new Date(metadata.lastUpdated) < thirtyDaysAgo) {
        oldSymbols.push(symbol);
      }
    });

    if (oldSymbols.length > 0) {
      oldSymbols.forEach(symbol => {
        delete this.metadata.stocks[symbol];
      });
      await this.save();
      logger.stockMetadata.info(`清理了 ${oldSymbols.length} 筆過期元資料`);
    }
  }
}

// 全域實例
export const stockMetadataManager = new StockMetadataManager();
