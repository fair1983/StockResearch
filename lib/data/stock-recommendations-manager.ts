import { YahooFinanceCollector } from './yahoo-finance-collector';
import { DataConverter } from './data-converter';
import { StockAnalysisEngine } from '@/lib/ai/stock-analysis-engine';
import { StockRecommendation } from '@/types';

export interface StockRecommendationsCache {
  recommendations: StockRecommendation[];
  lastUpdated: string;
  version: string;
}

export class StockRecommendationsManager {
  private static readonly CACHE_FILE = 'data/stock-recommendations-cache.json';
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30分鐘
  private static readonly VERSION = '1.0.0';

  // 定義要分析的股票
  private static readonly STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.', market: 'US' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'US' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'US' },
    { symbol: '2330.TW', name: '台積電', market: 'TW' },
    { symbol: '2317.TW', name: '鴻海', market: 'TW' },
    { symbol: '2454.TW', name: '聯發科', market: 'TW' },
    { symbol: '2412.TW', name: '中華電', market: 'TW' },
    { symbol: '2881.TW', name: '富邦金', market: 'TW' }
  ];

  /**
   * 獲取指定市場的股票列表
   */
  static async getSymbols(market: string): Promise<Array<{ symbol: string; market: string; name?: string }>> {
    return this.STOCKS.filter(stock => stock.market === market);
  }

  /**
   * 獲取股票推薦數據（優先使用緩存）
   */
  static async getStockRecommendations(): Promise<StockRecommendation[]> {
    try {
      // 嘗試從緩存讀取
      const cachedData = await this.loadFromCache();
      
      if (cachedData && this.isCacheValid(cachedData)) {
        console.log('使用緩存的股票推薦數據');
        return cachedData.recommendations;
      }

      // 緩存無效或不存在，重新獲取數據
      console.log('緩存無效，重新獲取股票推薦數據');
      const recommendations = await this.fetchAndAnalyzeStocks();
      
      // 保存到緩存
      await this.saveToCache(recommendations);
      
      return recommendations;
    } catch (error) {
      console.error('獲取股票推薦數據失敗:', error);
      
      // 嘗試從緩存讀取舊數據
      const cachedData = await this.loadFromCache();
      if (cachedData) {
        console.log('使用舊的緩存數據');
        return cachedData.recommendations;
      }
      
      // 如果連緩存都沒有，返回未分析狀態
      return this.createUnanalyzedRecommendations();
    }
  }

  /**
   * 強制刷新股票推薦數據
   */
  static async refreshStockRecommendations(): Promise<StockRecommendation[]> {
    try {
      console.log('強制刷新股票推薦數據');
      const recommendations = await this.fetchAndAnalyzeStocks();
      await this.saveToCache(recommendations);
      return recommendations;
    } catch (error) {
      console.error('刷新股票推薦數據失敗:', error);
      throw error;
    }
  }

  /**
   * AI 分析單支股票
   */
  static async analyzeSingleStock(symbol: string, market: string): Promise<StockRecommendation> {
    try {
      console.log(`AI 分析股票: ${symbol}`);
      const aiResult = await StockAnalysisEngine.analyzeStock(symbol, market);
      
      // 轉換為 StockRecommendation 格式
      const recommendation: StockRecommendation = {
        symbol: aiResult.symbol,
        name: aiResult.name,
        market: aiResult.market,
        currentPrice: aiResult.technicalAnalysis.priceAnalysis.currentPrice,
        priceChange: aiResult.technicalAnalysis.priceAnalysis.priceChange,
        priceChangePercent: aiResult.technicalAnalysis.priceAnalysis.priceChangePercent,
        recommendedStrategy: aiResult.recommendedStrategy,
        confidence: aiResult.confidence,
        expectedReturn: aiResult.expectedReturn,
        riskLevel: aiResult.riskLevel,
        reasoning: aiResult.reasoning,
        technicalSignals: {
          trend: aiResult.technicalAnalysis.trend,
          momentum: aiResult.technicalAnalysis.momentum,
          volatility: aiResult.technicalAnalysis.volatility,
          support: aiResult.technicalAnalysis.support,
          resistance: aiResult.technicalAnalysis.resistance
        },
        fundamentalScore: aiResult.fundamentalScore,
        technicalScore: aiResult.technicalScore,
        overallScore: aiResult.overallScore,
        lastUpdate: aiResult.lastUpdate,
        isAnalyzed: true
      };

      return recommendation;
    } catch (error) {
      console.error(`AI 分析股票 ${symbol} 失敗:`, error);
      throw error;
    }
  }

  /**
   * AI 批量分析股票
   */
  static async analyzeBatchStocks(stocks: Array<{ symbol: string; market: string }>): Promise<StockRecommendation[]> {
    try {
      console.log(`AI 批量分析 ${stocks.length} 支股票`);
      const aiResults = await StockAnalysisEngine.analyzeStocks(stocks);
      
      // 轉換為 StockRecommendation 格式
      const recommendations: StockRecommendation[] = aiResults.map(aiResult => ({
        symbol: aiResult.symbol,
        name: aiResult.name,
        market: aiResult.market,
        currentPrice: aiResult.technicalAnalysis.priceAnalysis.currentPrice,
        priceChange: aiResult.technicalAnalysis.priceAnalysis.priceChange,
        priceChangePercent: aiResult.technicalAnalysis.priceAnalysis.priceChangePercent,
        recommendedStrategy: aiResult.recommendedStrategy,
        confidence: aiResult.confidence,
        expectedReturn: aiResult.expectedReturn,
        riskLevel: aiResult.riskLevel,
        reasoning: aiResult.reasoning,
        technicalSignals: {
          trend: aiResult.technicalAnalysis.trend,
          momentum: aiResult.technicalAnalysis.momentum,
          volatility: aiResult.technicalAnalysis.volatility,
          support: aiResult.technicalAnalysis.support,
          resistance: aiResult.technicalAnalysis.resistance
        },
        fundamentalScore: aiResult.fundamentalScore,
        technicalScore: aiResult.technicalScore,
        overallScore: aiResult.overallScore,
        lastUpdate: aiResult.lastUpdate,
        isAnalyzed: true
      }));

      return recommendations;
    } catch (error) {
      console.error('AI 批量分析股票失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取並分析股票數據
   */
  private static async fetchAndAnalyzeStocks(): Promise<StockRecommendation[]> {
    const collector = new YahooFinanceCollector({
      baseDir: 'data/yahoo-finance',
      markets: {
        US: { name: 'US', symbols: [], currency: 'USD', timezone: 'America/New_York' },
        TW: { name: 'TW', symbols: [], currency: 'TWD', timezone: 'Asia/Taipei' },
        HK: { name: 'HK', symbols: [], currency: 'HKD', timezone: 'Asia/Hong_Kong' },
        JP: { name: 'JP', symbols: [], currency: 'JPY', timezone: 'Asia/Tokyo' },
        CN: { name: 'CN', symbols: [], currency: 'CNY', timezone: 'Asia/Shanghai' }
      }
    });

    const recommendations: StockRecommendation[] = [];

    // 並行獲取所有股票數據
    const stockPromises = this.STOCKS.map(async (stock) => {
      try {
        // 先嘗試從本地文件讀取
        let quoteData = await collector.loadQuoteData(stock.symbol, stock.market as any);
        
        // 如果本地數據不存在或過期，從 API 獲取
        if (!quoteData || collector.isTimestampStale(quoteData.lastUpdated)) {
          console.log(`獲取 ${stock.symbol} 的最新數據`);
          quoteData = await collector.getQuote(stock.symbol, stock.market as any);
          
          if (quoteData) {
            await collector.saveQuoteData(stock.symbol, stock.market as any, quoteData);
          }
        }

        if (quoteData) {
          // 使用數據轉換器轉換為推薦格式
          const recommendation = DataConverter.convertQuoteToStockRecommendation(quoteData);
          return recommendation;
        } else {
          console.warn(`無法獲取 ${stock.symbol} 數據，標記為未分析`);
          return this.createUnanalyzedRecommendation(stock);
        }
      } catch (error) {
        console.error(`處理 ${stock.symbol} 失敗:`, error);
        return this.createUnanalyzedRecommendation(stock);
      }
    });

    // 等待所有股票數據載入完成
    const results = await Promise.all(stockPromises);
    return results;
  }

  /**
   * 從緩存讀取數據
   */
  private static async loadFromCache(): Promise<StockRecommendationsCache | null> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const cachePath = path.join(process.cwd(), this.CACHE_FILE);
      const cacheData = await fs.readFile(cachePath, 'utf-8');
      const cache: StockRecommendationsCache = JSON.parse(cacheData);
      
      return cache;
    } catch (error) {
      console.log('緩存文件不存在或讀取失敗');
      return null;
    }
  }

  /**
   * 保存數據到緩存
   */
  private static async saveToCache(recommendations: StockRecommendation[]): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const cacheDir = path.dirname(path.join(process.cwd(), this.CACHE_FILE));
      await fs.mkdir(cacheDir, { recursive: true });
      
      const cache: StockRecommendationsCache = {
        recommendations,
        lastUpdated: new Date().toISOString(),
        version: this.VERSION
      };
      
      const cachePath = path.join(process.cwd(), this.CACHE_FILE);
      await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
      
      console.log('股票推薦數據已保存到緩存');
    } catch (error) {
      console.error('保存緩存失敗:', error);
    }
  }

  /**
   * 檢查緩存是否有效
   */
  private static isCacheValid(cache: StockRecommendationsCache): boolean {
    // 檢查版本
    if (cache.version !== this.VERSION) {
      return false;
    }
    
    // 檢查時間
    const lastUpdated = new Date(cache.lastUpdated).getTime();
    const now = new Date().getTime();
    const age = now - lastUpdated;
    
    return age < this.CACHE_DURATION;
  }

  /**
   * 創建未分析狀態的推薦
   */
  private static createUnanalyzedRecommendation(stock: { symbol: string; name: string; market: string }): StockRecommendation {
    return {
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      currentPrice: 0,
      priceChange: 0,
      priceChangePercent: 0,
      recommendedStrategy: '未分析',
      confidence: 0,
      expectedReturn: 0,
      riskLevel: 'unknown',
      reasoning: '數據收集中，請稍後再試',
      technicalSignals: {
        trend: 'neutral',
        momentum: 0,
        volatility: 0,
        support: 0,
        resistance: 0
      },
      fundamentalScore: 0,
      technicalScore: 0,
      overallScore: 0,
      lastUpdate: new Date().toISOString(),
      isAnalyzed: false
    };
  }

  /**
   * 創建所有股票的未分析推薦
   */
  private static createUnanalyzedRecommendations(): StockRecommendation[] {
    return this.STOCKS.map(stock => this.createUnanalyzedRecommendation(stock));
  }

  /**
   * 獲取緩存狀態
   */
  static async getCacheStatus(): Promise<{
    exists: boolean;
    lastUpdated?: string;
    isValid: boolean;
    age?: number;
  }> {
    try {
      const cachedData = await this.loadFromCache();
      
      if (!cachedData) {
        return { exists: false, isValid: false };
      }
      
      const lastUpdated = new Date(cachedData.lastUpdated).getTime();
      const now = new Date().getTime();
      const age = now - lastUpdated;
      const isValid = this.isCacheValid(cachedData);
      
      return {
        exists: true,
        lastUpdated: cachedData.lastUpdated,
        isValid,
        age
      };
    } catch (error) {
      return { exists: false, isValid: false };
    }
  }

  /**
   * 清除緩存
   */
  static async clearCache(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const cachePath = path.join(process.cwd(), this.CACHE_FILE);
      await fs.unlink(cachePath);
      console.log('緩存已清除');
    } catch (error) {
      console.log('緩存文件不存在或清除失敗');
    }
  }
}
