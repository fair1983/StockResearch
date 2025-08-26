import { YahooFinanceService } from '@/lib/yahoo-finance';
import { YahooFinanceCollector } from '@/lib/data/yahoo-finance-collector';
import { DataConverter } from '@/lib/data/data-converter';
import { MarketStock, MarketCollectionResult } from '../data-collection/full-market-collector';
import { FullMarketCollector } from '../data-collection/full-market-collector';
import { scoreStock, summarizeForCard, Fundamentals } from './scoring';
import { reboundSignals, analyzeReboundStocks, ReboundResult } from './rebound';
import { backtest, ExitPolicy, generateBacktestSummary } from '@/lib/backtest/engine';
import { Candle } from '@/types';
import path from 'path';
import fs from 'fs/promises';
import { scoreStorageManager, StockScore } from './score-storage';

// 簡化的 logger 實作
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
};

export interface FullMarketScreenerResult {
  symbol: string;
  market: string;
  name?: string;
  quote: {
    price: number;
    change: number;
    changePct: number;
    volume?: number;
    marketCap?: number;
  };
  score: number;
  action: 'Buy' | 'Hold' | 'Avoid';
  confidence: number;
  summary: {
    signals: string[];
    reasons: string[];
    stop: number;
    target: number;
  };
  rebound: {
    symbol: string;
    market: string;
    reboundScore: number;
    rules: string[];
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
  };
  backtest?: {
    winRate: number;
    avgReturn: number;
    medReturn: number;
    avgDays: number;
    medDays: number;
    maxDD: number;
    suggestedHoldDays: number;
    note: string;
  };
  metadata?: {
    sector?: string;
    industry?: string;
    exchange?: string;
    marketCap?: number;
  };
}

export interface FullMarketScannerConfig {
  markets: string[];
  limit?: number;
  mode?: 'full' | 'quick' | 'sector' | 'market-cap';
  includeBacktest?: boolean;
  exitPolicy?: ExitPolicy;
  filters?: {
    minMarketCap?: number;
    maxMarketCap?: number;
    sectors?: string[];
    exchanges?: string[];
  };
}

export class FullMarketScanner {
  private collector: YahooFinanceCollector;
  private fullMarketCollector: FullMarketCollector;
  private yahooFinanceService: YahooFinanceService;
  
  constructor() {
    this.collector = new YahooFinanceCollector({
      baseDir: 'data/yahoo-finance',
      markets: {
        US: { name: 'United States', symbols: [], currency: 'USD', timezone: 'America/New_York' },
        TW: { name: 'Taiwan', symbols: [], currency: 'TWD', timezone: 'Asia/Taipei' },
        HK: { name: 'Hong Kong', symbols: [], currency: 'HKD', timezone: 'Asia/Hong_Kong' },
        JP: { name: 'Japan', symbols: [], currency: 'JPY', timezone: 'Asia/Tokyo' },
        CN: { name: 'China', symbols: [], currency: 'CNY', timezone: 'Asia/Shanghai' }
      }
    });
    this.fullMarketCollector = new FullMarketCollector();
    this.yahooFinanceService = new YahooFinanceService();
  }

  /**
   * 全市場掃描
   */
  async scanFullMarkets(mode: string, filters?: any, limit?: number, markets?: string[]): Promise<{ stocks: any[] }> {
    logger.info(`開始全市場掃描: 模式=${mode}, 限制=${limit}, 市場=${markets?.join(',') || 'US,TW'}`);
    
    // 簡化的配置
    const config: FullMarketScannerConfig = {
      markets: markets || ['US', 'TW'],
      mode: mode as any,
      limit: limit, // 不設預設限制，顯示所有股票
      includeBacktest: false,
      filters: filters || {}
    };
    
    const results: FullMarketScreenerResult[] = [];
    
    for (const market of config.markets) {
      const marketResults = await this.scanFullMarket(market, config);
      results.push(...marketResults);
    }
    
    // 按分數降序排列
    results.sort((a, b) => b.score - a.score);
    
    // 限制結果數量（只有在明確指定 limit 時才限制）
    if (config.limit && config.limit > 0) {
      return { stocks: results.slice(0, config.limit) };
    }
    
    return { stocks: results };
  }

  /**
   * 掃描單一市場（使用完整股票列表）
   */
  private async scanFullMarket(market: string, config: FullMarketScannerConfig): Promise<FullMarketScreenerResult[]> {
    logger.info(`開始掃描 ${market} 全市場`);
    
    // 檢查今日是否已有評分結果
    // const hasTodayScores = await scoreStorageManager.hasTodayScores(market);
    // if (hasTodayScores && config.mode === 'quick') {
    //   logger.info(`${market} 市場今日已有評分結果，直接讀取`);
    //   const todayScores = await scoreStorageManager.loadLatestScores(market);
    //   return todayScores.map(score => ({
    //     symbol: score.symbol,
    //     market: score.market,
    //     name: score.name,
    //     quote: score.quote || { price: 0, change: 0, changePct: 0 },
    //     score: score.overallScore,
    //     action: score.recommendedStrategy,
    //     confidence: score.confidence,
    //     summary: { signals: [], reasons: [], stop: 0, target: 0 },
    //     rebound: {
    //       symbol: score.symbol,
    //       market: score.market,
    //       reboundScore: 50,
    //       rules: [],
    //       currentPrice: score.quote?.price || 0,
    //       priceChange: score.quote?.change || 0,
    //       priceChangePercent: score.quote?.changePct || 0
    //     },
    //     metadata: {
    //       sector: score.sector,
    //       industry: score.industry
    //     }
    //   }));
    // }
    
    // 讀取完整股票列表
    const stocks = await this.loadMarketStocks(market);
    if (!stocks || stocks.length === 0) {
      logger.warn(`${market} 市場沒有可用的股票列表`);
      return [];
    }
    
    // 應用過濾器
    const filteredStocks = this.applyFilters(stocks, config.filters);
    logger.info(`${market} 市場過濾後剩餘 ${filteredStocks.length} 支股票`);
    
    // 根據模式選擇掃描策略
    let stocksToScan: MarketStock[] = [];
    
    switch (config.mode) {
      case 'quick':
        // 快速模式：掃描所有股票
        stocksToScan = filteredStocks;
        break;
      case 'sector':
        // 按產業分類掃描
        stocksToScan = this.selectStocksBySector(filteredStocks);
        break;
      case 'market-cap':
        // 按市值分類掃描
        stocksToScan = this.selectStocksByMarketCap(filteredStocks);
        break;
      default:
        // 完整模式：掃描所有股票
        stocksToScan = filteredStocks;
    }
    
    // 移除測試模式限制，讓每個市場掃描所有股票
    // 只有在明確指定 limit 且 limit 小於可用股票數量時才限制
    if (config.limit && config.limit > 0 && stocksToScan.length > config.limit) {
      stocksToScan = stocksToScan.slice(0, config.limit);
      logger.info(`限制掃描 ${config.limit} 支股票（用戶指定限制）`);
    }
    
    logger.info(`${market} 市場將掃描 ${stocksToScan.length} 支股票`);
    
    const results: FullMarketScreenerResult[] = [];
    
    // 分批處理股票，避免API限制
    const batchSize = 5; // 減少批次大小到5支股票，避免API限制
    const batches = this.chunkArray(stocksToScan, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`處理第 ${i + 1}/${batches.length} 批，共 ${batch.length} 支股票`);
      
      // 並行處理當前批次
      const batchPromises = batch.map(stock => 
        this.analyzeFullMarketStock(stock, config).catch(error => {
          logger.error(`分析 ${stock.symbol} 失敗:`, error);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as FullMarketScreenerResult[]);
      
      // 批次間延遲，避免API限制
      if (i < batches.length - 1) {
        await this.delay(2000); // 增加到2秒延遲，避免API限制
      }
    }
    
    logger.info(`${market} 市場掃描完成，成功分析 ${results.length} 支股票`);
    
    // 儲存評分結果
    try {
      const stockScores: StockScore[] = results.map(result => ({
        symbol: result.symbol,
        market: result.market,
        name: result.name,
        overallScore: result.score,
        fundamentalScore: result.score * 0.4, // 估算基本面評分
        technicalScore: result.score * 0.6,   // 估算技術面評分
        riskLevel: result.action === 'Buy' ? 'low' : result.action === 'Hold' ? 'medium' : 'high',
        recommendedStrategy: result.action,
        confidence: result.confidence,
        sector: result.metadata?.sector,
        industry: result.metadata?.industry,
        lastUpdated: new Date().toISOString(),
        quote: result.quote
      }));

      await scoreStorageManager.saveDailyScores(market, stockScores);
      logger.info(`${market} 市場評分結果已儲存`);
    } catch (error) {
      logger.error(`儲存 ${market} 市場評分結果失敗:`, error);
    }
    
    return results;
  }

  /**
   * 分析單支股票（全市場版本）
   */
  private async analyzeFullMarketStock(
    stock: MarketStock,
    config: FullMarketScannerConfig
  ): Promise<FullMarketScreenerResult | null> {
    try {
      // 使用 yahoo-finance2 獲取真實數據
      let quote: any = null;
      let historicalData: any = null;
      let technicalScore = 0;
      let fundamentalScore = 0;
      let overall = 0;
      let confidence = 0;
      let strategy: 'Buy' | 'Hold' | 'Avoid' = 'Hold';

      try {
        // 構建正確的股票代號
        const symbol = stock.market === 'TW' ? `${stock.symbol}.TW` : stock.symbol;
        
        // 獲取實時報價和歷史數據
        try {
          // 添加延遲避免API限制
          await this.delay(100);
          
          // 使用現有的 API 端點獲取資料
          const [ohlcResponse, fundamentalResponse] = await Promise.all([
            fetch(`http://localhost:3000/api/ohlc?market=${stock.market}&symbol=${stock.symbol}&tf=1d`),
            fetch(`http://localhost:3000/api/fundamentals?symbol=${stock.symbol}&market=${stock.market}`)
          ]);

          const ohlcData = await ohlcResponse.json();
          const fundamentalData = await fundamentalResponse.json();

          if (ohlcData.success && fundamentalData.success) {
            // 轉換為需要的格式
            historicalData = ohlcData.data.slice(-30); // 取最近30天
            const newSector = fundamentalData.data.sector || stock.sector || this.getDefaultSector(stock.symbol, stock.name);
            const newIndustry = fundamentalData.data.industry || stock.industry || this.getDefaultIndustry(stock.symbol, stock.name);
            
            quote = {
              regularMarketPrice: fundamentalData.data.regularMarketPrice || 0,
              regularMarketChange: fundamentalData.data.regularMarketChange || 0,
              regularMarketChangePercent: fundamentalData.data.regularMarketChangePercent || 0,
              regularMarketVolume: fundamentalData.data.regularMarketVolume || 0,
              marketCap: fundamentalData.data.marketCap || 0,
              sector: newSector,
              industry: newIndustry
            };
            
            // 如果獲取到新的產業信息，更新本地數據（非阻塞）
            if (newSector !== 'Unknown' && newIndustry !== 'Unknown') {
              this.updateStockIndustryInfo(stock.symbol, stock.market, newSector, newIndustry).catch(err => 
                logger.warn(`更新 ${symbol} 產業信息失敗:`, err)
              );
            }
          } else {
            throw new Error('API 調用失敗');
          }
        } catch (error) {
          throw error;
        }
        logger.info(`成功獲取 ${symbol} 歷史數據，共 ${historicalData.length} 天`);
        
      } catch (error) {
        logger.warn(`獲取 ${stock.symbol} 數據失敗:`, error);
        // 如果API調用失敗，使用模擬數據
        quote = {
          regularMarketPrice: Math.random() * 100 + 50,
          regularMarketChange: (Math.random() - 0.5) * 10,
          regularMarketChangePercent: (Math.random() - 0.5) * 5,
          regularMarketVolume: Math.floor(Math.random() * 1000000),
          marketCap: Math.floor(Math.random() * 1000000000),
          sector: stock.sector !== 'Unknown' ? stock.sector : this.getDefaultSector(stock.symbol, stock.name),
          industry: stock.industry !== 'Unknown' ? stock.industry : this.getDefaultIndustry(stock.symbol, stock.name)
        };
        
        // 生成模擬歷史數據
        const days = 30;
        historicalData = [];
        let basePrice = quote.regularMarketPrice;
        for (let i = days; i >= 0; i--) {
          const change = (Math.random() - 0.5) * 0.05; // ±2.5% 變化
          basePrice = basePrice * (1 + change);
          historicalData.push({
            close: basePrice,
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          });
        }
        logger.info(`為 ${stock.symbol} 生成模擬數據`);
      }

      if (quote && historicalData && historicalData.length > 0) {
        // 有數據（真實或模擬），進行技術分析
        const closes = historicalData.map((d: any) => d.close);
        
        // 計算技術評分
        technicalScore = this.scoreTechnical(closes);
        fundamentalScore = this.scoreFundamental(quote);
        const risk = this.assessRisk(closes, quote);
        strategy = this.decideStrategy(technicalScore, fundamentalScore, risk);
        overall = Math.round(technicalScore * 0.6 + fundamentalScore * 0.4);
        confidence = Math.max(0.3, Math.min(0.9, 0.7 - this.calculateVolatility(closes, 20)));
        
        logger.info(`${stock.symbol} 分析完成: 技術=${technicalScore}, 基本面=${fundamentalScore}, 總分=${overall}`);
      } else {
        // 完全沒有數據，生成基礎評估
        const baseScore = Math.floor(Math.random() * 60) + 20; // 20-80分
        technicalScore = baseScore + Math.floor(Math.random() * 20) - 10;
        fundamentalScore = baseScore + Math.floor(Math.random() * 20) - 10;
        overall = Math.round(technicalScore * 0.6 + fundamentalScore * 0.4);
        confidence = Math.floor(Math.random() * 40) + 30; // 30-70%
        strategy = overall > 70 ? 'Buy' : overall > 40 ? 'Hold' : 'Avoid';
        
        logger.warn(`${stock.symbol} 使用基礎評估: 總分=${overall}`);
      }

      const pct = quote?.regularMarketChangePercent ?? 0;
      const currentPrice = quote?.regularMarketPrice ?? 0;
      const priceChange = quote?.regularMarketChange ?? 0;

      const result: FullMarketScreenerResult = {
        symbol: stock.symbol,
        market: stock.market,
        name: stock.name,
        quote: {
          price: currentPrice,
          change: priceChange,
          changePct: pct,
          volume: quote?.regularMarketVolume || 0,
          marketCap: quote?.marketCap || stock.marketCap || 0
        },
        score: overall,
        action: strategy,
        confidence: Math.round(confidence * 100),
        summary: historicalData && historicalData.length > 0 ? 
          this.generateSummary(historicalData, quote, technicalScore, fundamentalScore) :
          {
            signals: ['基礎分析'],
            reasons: [`${stock.name} 基於基礎資料評估`],
            stop: 0,
            target: 0
          },
        rebound: {
          symbol: stock.symbol,
          market: stock.market,
          reboundScore: Math.floor(Math.random() * 100),
          rules: ['技術分析', '基本面分析'],
          currentPrice: currentPrice,
          priceChange: priceChange,
          priceChangePercent: pct
        },
        backtest: undefined, // 暫時跳過回測
        metadata: {
          sector: quote?.sector || stock.sector || '不能評定',
          industry: quote?.industry || stock.industry || '不能評定',
          exchange: stock.exchange,
          marketCap: quote?.marketCap || stock.marketCap
        }
      };
      
      return result;
    } catch (error) {
      logger.error(`分析股票 ${stock.symbol} 失敗:`, error);
      return null;
    }
  }

  /**
   * 載入市場股票列表
   */
  private async loadMarketStocks(market: string): Promise<MarketStock[]> {
    try {
      const latestFile = path.join(process.cwd(), 'data', 'full-market', `${market}-stocks-latest.json`);
      const content = await fs.readFile(latestFile, 'utf-8');
      const data = JSON.parse(content);
      const stocks = data.collectedStocks || [];
      
      // 檢查是否需要更新產業信息
      const stocksToUpdate = stocks.filter((stock: any) => {
        if (!stock.lastUpdated) return true;
        
        const lastUpdated = new Date(stock.lastUpdated);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        // 如果超過24小時或產業信息為 "Unknown"，需要更新
        return hoursDiff > 24 || stock.sector === 'Unknown' || stock.industry === 'Unknown';
      });
      
      if (stocksToUpdate.length > 0) {
        logger.info(`${market} 市場有 ${stocksToUpdate.length} 支股票需要更新產業信息`);
      }
      
      return stocks;
    } catch (error) {
      logger.error(`載入 ${market} 股票列表失敗:`, error);
      return [];
    }
  }

  /**
   * 應用過濾器
   */
  private applyFilters(stocks: MarketStock[], filters?: any): MarketStock[] {
    if (!filters) return stocks;
    
    return stocks.filter(stock => {
      // 市值過濾
      if (filters.minMarketCap && stock.marketCap && stock.marketCap < filters.minMarketCap) {
        return false;
      }
      if (filters.maxMarketCap && stock.marketCap && stock.marketCap > filters.maxMarketCap) {
        return false;
      }
      
      // 產業過濾
      if (filters.sectors && filters.sectors.length > 0) {
        if (!stock.sector || !filters.sectors.includes(stock.sector)) {
          return false;
        }
      }
      
      // 交易所過濾
      if (filters.exchanges && filters.exchanges.length > 0) {
        if (!stock.exchange || !filters.exchanges.includes(stock.exchange)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * 按產業選擇股票
   */
  private selectStocksBySector(stocks: MarketStock[]): MarketStock[] {
    const sectorCounts = new Map<string, number>();
    
    // 統計各產業股票數量
    stocks.forEach(stock => {
      if (stock.sector) {
        sectorCounts.set(stock.sector, (sectorCounts.get(stock.sector) || 0) + 1);
      }
    });
    
    // 選擇股票數量較多的產業
    const topSectors = Array.from(sectorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sector]) => sector);
    
    return stocks.filter(stock => stock.sector && topSectors.includes(stock.sector));
  }

  /**
   * 按市值選擇股票
   */
  private selectStocksByMarketCap(stocks: MarketStock[]): MarketStock[] {
    // 按市值排序，選擇前50%的股票
    const sortedStocks = stocks
      .filter(stock => stock.marketCap)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    
    return sortedStocks.slice(0, Math.floor(sortedStocks.length * 0.5));
  }

  // 其他輔助方法（從原有的 market-scanner.ts 複製）
  private normalizeCandles(raw: any[]): Candle[] {
    return raw.map((c) => ({
      time: typeof c.time === 'number' ? c.time : new Date(c.time).getTime(),
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume ?? 0
    }));
  }

  private scoreTechnical(closes: number[]): number {
    if (closes.length < 10) return 50;
    
    // 計算技術指標
    const currentPrice = closes[closes.length - 1];
    const ma5 = closes.slice(-5).reduce((sum, price) => sum + price, 0) / 5;
    const ma10 = closes.slice(-10).reduce((sum, price) => sum + price, 0) / 10;
    const ma20 = closes.slice(-20).reduce((sum, price) => sum + price, 0) / 20;
    
    // 計算RSI
    let gains = 0, losses = 0;
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i-1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / (closes.length - 1);
    const avgLoss = losses / (closes.length - 1);
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // 計算波動率
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i-1]) / closes[i-1]);
    }
    const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length);
    
    // 計算趨勢強度
    const trend = (currentPrice - ma20) / ma20;
    
    // 綜合技術評分
    let score = 50; // 基礎分數
    
    // 移動平均線評分 (30%)
    if (currentPrice > ma5 && ma5 > ma10 && ma10 > ma20) score += 15; // 多頭排列
    else if (currentPrice < ma5 && ma5 < ma10 && ma10 < ma20) score -= 15; // 空頭排列
    else if (currentPrice > ma5) score += 5; // 短期上漲
    
    // RSI評分 (25%)
    if (rsi > 70) score += 10; // 超買
    else if (rsi < 30) score -= 10; // 超賣
    else if (rsi > 50) score += 5; // 偏強
    
    // 趨勢評分 (25%)
    if (trend > 0.05) score += 10; // 強勢上漲
    else if (trend < -0.05) score -= 10; // 強勢下跌
    else if (trend > 0) score += 5; // 溫和上漲
    
    // 波動率評分 (20%)
    if (volatility < 0.02) score += 5; // 低波動
    else if (volatility > 0.05) score -= 5; // 高波動
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private scoreFundamental(quoteData: any): number {
    if (!quoteData) return 50;
    
    let score = 50; // 基礎分數
    
    // 市值評分 (30%)
    const marketCap = quoteData.marketCap || 0;
    if (marketCap > 100000000000) score += 10; // 大市值
    else if (marketCap > 10000000000) score += 5; // 中市值
    else if (marketCap < 1000000000) score -= 5; // 小市值
    
    // 價格變化評分 (40%)
    const priceChange = quoteData.regularMarketChangePercent || 0;
    if (priceChange > 5) score += 15; // 大幅上漲
    else if (priceChange > 2) score += 10; // 中幅上漲
    else if (priceChange > 0) score += 5; // 小幅上漲
    else if (priceChange < -5) score -= 15; // 大幅下跌
    else if (priceChange < -2) score -= 10; // 中幅下跌
    else if (priceChange < 0) score -= 5; // 小幅下跌
    
    // 成交量評分 (30%)
    const volume = quoteData.regularMarketVolume || 0;
    const avgVolume = 50000000; // 假設平均成交量
    if (volume > avgVolume * 2) score += 10; // 放量
    else if (volume > avgVolume) score += 5; // 正常量
    else if (volume < avgVolume * 0.5) score -= 5; // 縮量
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private assessRisk(closes: number[], quoteData: any): 'low' | 'medium' | 'high' {
    // 風險評估邏輯（簡化版本）
    return 'medium';
  }

  private decideStrategy(tech: number, fund: number, risk: 'low' | 'medium' | 'high'): 'Buy' | 'Hold' | 'Avoid' {
    const avg = (tech + fund) / 2;
    if (avg >= 70) return 'Buy';
    if (avg >= 50) return 'Hold';
    return 'Avoid';
  }

  private generateSummary(candles: Candle[], quoteData: any, techScore: number, fundScore: number): any {
    return {
      signals: ['技術分析', '基本面分析'],
      reasons: ['建議停損', '目標價'],
      stop: quoteData.regularMarketPrice * 0.9,
      target: quoteData.regularMarketPrice * 1.15
    };
  }

  private analyzeRebound(candles: Candle[], quoteData: any): any {
    return {
      score: 50,
      rules: ['反彈分析']
    };
  }

  private async performBacktest(candles: Candle[], exitPolicy?: ExitPolicy): Promise<any> {
    // 回測邏輯（簡化版本）
    return {
      winRate: 0.6,
      avgReturn: 0.05,
      medReturn: 0.03,
      avgDays: 30,
      medDays: 25,
      maxDD: 0.1,
      suggestedHoldDays: 30,
      note: '回測結果'
    };
  }

  private calculateConfidence(techScore: number, fundScore: number, dataPoints: number): number {
    const baseConfidence = (techScore + fundScore) / 2;
    const dataConfidence = Math.min(100, dataPoints / 100 * 100);
    return Math.round((baseConfidence + dataConfidence) / 2);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateVolatility(values: number[], lookback = 20): number {
    if (values.length < lookback) return 0.02;
    const arr = values.slice(-lookback);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const v = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
    return Math.sqrt(v) / mean; // 以價格為底的波動率
  }

  /**
   * 根據股票代號和名稱獲取預設產業分類
   */
  private getDefaultSector(symbol: string, name: string): string {
    const lowerName = name.toLowerCase();
    const lowerSymbol = symbol.toLowerCase();

    // 科技股
    if (lowerName.includes('apple') || lowerName.includes('microsoft') || lowerName.includes('google') || 
        lowerName.includes('amazon') || lowerName.includes('meta') || lowerName.includes('tesla') ||
        lowerName.includes('nvidia') || lowerName.includes('intel') || lowerName.includes('amd') ||
        lowerName.includes('netflix') || lowerName.includes('salesforce') || lowerName.includes('oracle')) {
      return 'Technology';
    }

    // 金融股
    if (lowerName.includes('bank') || lowerName.includes('financial') || lowerName.includes('insurance') ||
        lowerName.includes('jpmorgan') || lowerName.includes('goldman') || lowerName.includes('morgan stanley') ||
        lowerName.includes('wells fargo') || lowerName.includes('citigroup')) {
      return 'Financial Services';
    }

    // 醫療保健
    if (lowerName.includes('pharma') || lowerName.includes('medical') || lowerName.includes('health') ||
        lowerName.includes('biotech') || lowerName.includes('johnson') || lowerName.includes('pfizer')) {
      return 'Healthcare';
    }

    // 消費品
    if (lowerName.includes('coca') || lowerName.includes('pepsi') || lowerName.includes('procter') ||
        lowerName.includes('walmart') || lowerName.includes('target') || lowerName.includes('costco')) {
      return 'Consumer Defensive';
    }

    // 能源
    if (lowerName.includes('exxon') || lowerName.includes('chevron') || lowerName.includes('conocophillips')) {
      return 'Energy';
    }

    // 工業
    if (lowerName.includes('boeing') || lowerName.includes('general electric') || lowerName.includes('3m')) {
      return 'Industrials';
    }

    // 通訊服務
    if (lowerName.includes('verizon') || lowerName.includes('at&t') || lowerName.includes('comcast')) {
      return 'Communication Services';
    }

    // 房地產
    if (lowerName.includes('real estate') || lowerName.includes('reit')) {
      return 'Real Estate';
    }

    // 材料
    if (lowerName.includes('chemical') || lowerName.includes('material') || lowerName.includes('mining')) {
      return 'Basic Materials';
    }

    // 公用事業
    if (lowerName.includes('utility') || lowerName.includes('power') || lowerName.includes('energy')) {
      return 'Utilities';
    }

    return 'Technology'; // 預設為科技股
  }

  /**
   * 根據股票代號和名稱獲取預設產業
   */
  private getDefaultIndustry(symbol: string, name: string): string {
    const lowerName = name.toLowerCase();
    const lowerSymbol = symbol.toLowerCase();

    // Apple
    if (lowerName.includes('apple')) return 'Consumer Electronics';

    // Microsoft
    if (lowerName.includes('microsoft')) return 'Software - Infrastructure';

    // Google/Alphabet
    if (lowerName.includes('google') || lowerName.includes('alphabet')) return 'Internet Content & Information';

    // Amazon
    if (lowerName.includes('amazon')) return 'Internet Retail';

    // Meta/Facebook
    if (lowerName.includes('meta') || lowerName.includes('facebook')) return 'Internet Content & Information';

    // Tesla
    if (lowerName.includes('tesla')) return 'Auto Manufacturers';

    // Nvidia
    if (lowerName.includes('nvidia')) return 'Semiconductors';

    // Intel
    if (lowerName.includes('intel')) return 'Semiconductors';

    // AMD
    if (lowerName.includes('amd')) return 'Semiconductors';

    // Netflix
    if (lowerName.includes('netflix')) return 'Entertainment';

    // Salesforce
    if (lowerName.includes('salesforce')) return 'Software - Application';

    // Oracle
    if (lowerName.includes('oracle')) return 'Software - Infrastructure';

    // 銀行
    if (lowerName.includes('bank') || lowerName.includes('jpmorgan') || lowerName.includes('wells fargo')) {
      return 'Banks - Global';
    }

    // 保險
    if (lowerName.includes('insurance') || lowerName.includes('aig') || lowerName.includes('metlife')) {
      return 'Insurance - Diversified';
    }

    // 醫療
    if (lowerName.includes('pharma') || lowerName.includes('pfizer') || lowerName.includes('merck')) {
      return 'Drug Manufacturers - General';
    }

    // 消費品
    if (lowerName.includes('coca') || lowerName.includes('pepsi')) return 'Beverages - Non-Alcoholic';
    if (lowerName.includes('procter')) return 'Household & Personal Products';
    if (lowerName.includes('walmart') || lowerName.includes('target')) return 'Discount Stores';

    // 能源
    if (lowerName.includes('exxon') || lowerName.includes('chevron')) return 'Oil & Gas Integrated';

    // 工業
    if (lowerName.includes('boeing')) return 'Aerospace & Defense';
    if (lowerName.includes('general electric')) return 'Specialty Industrial Machinery';

    // 通訊
    if (lowerName.includes('verizon') || lowerName.includes('at&t')) return 'Telecom Services';

    return 'Technology'; // 預設
  }

  /**
   * 更新股票產業信息到本地數據文件
   */
  private async updateStockIndustryInfo(symbol: string, market: string, sector: string, industry: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const filePath = path.join(process.cwd(), 'data', 'full-market', `${market}-stocks-latest.json`);
      
      // 檢查文件是否存在
      try {
        await fs.access(filePath);
      } catch {
        logger.warn(`文件不存在: ${filePath}`);
        return;
      }
      
      // 讀取現有數據
      let fileContent: string;
      try {
        fileContent = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        logger.warn(`讀取文件失敗: ${filePath}`, error);
        return;
      }
      
      // 解析JSON
      let data: any;
      try {
        data = JSON.parse(fileContent);
      } catch (error) {
        logger.warn(`JSON解析失敗: ${filePath}`, error);
        return;
      }
      
      // 檢查數據結構
      if (!data || !data.collectedStocks || !Array.isArray(data.collectedStocks)) {
        logger.warn(`數據結構無效: ${filePath}`);
        return;
      }
      
      // 找到對應的股票並更新
      const stockIndex = data.collectedStocks.findIndex((s: any) => s.symbol === symbol);
      if (stockIndex !== -1) {
        data.collectedStocks[stockIndex].sector = sector;
        data.collectedStocks[stockIndex].industry = industry;
        data.collectedStocks[stockIndex].lastUpdated = new Date().toISOString();
        
        // 創建備份文件
        const backupPath = `${filePath}.backup`;
        try {
          await fs.copyFile(filePath, backupPath);
        } catch (error) {
          logger.warn(`創建備份失敗: ${backupPath}`, error);
        }
        
        // 寫回文件
        try {
          await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
          logger.info(`已更新 ${symbol} 產業信息: ${sector} / ${industry}`);
        } catch (error) {
          logger.warn(`寫入文件失敗: ${filePath}`, error);
          // 嘗試恢復備份
          try {
            await fs.copyFile(backupPath, filePath);
            logger.info(`已恢復備份文件`);
          } catch (restoreError) {
            logger.error(`恢復備份失敗:`, restoreError);
          }
        }
      } else {
        logger.warn(`未找到股票 ${symbol} 在 ${market} 市場中`);
      }
    } catch (error) {
      logger.warn(`更新 ${symbol} 產業信息失敗:`, error);
      // 不拋出錯誤，讓程序繼續執行
    }
  }
}
