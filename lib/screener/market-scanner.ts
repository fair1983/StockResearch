import { YahooFinanceCollector } from '@/lib/data/yahoo-finance-collector';
import { scoreStock, summarizeForCard, Fundamentals } from './scoring';
import { reboundSignals, analyzeReboundStocks, ReboundResult } from './rebound';
import { backtest, ExitPolicy, generateBacktestSummary } from '@/lib/backtest/engine';
import { Candle } from '@/types';
import path from 'path';
import fs from 'fs/promises';

export interface ScreenerResult {
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
    score: number;
    rules: string[];
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
}

export interface MarketScannerConfig {
  markets: string[];
  limit?: number;
  mode?: 'full' | 'quick';
  includeBacktest?: boolean;
  exitPolicy?: ExitPolicy;
}

export class MarketScanner {
  private collector: YahooFinanceCollector;
  
  // 預設股票列表（可擴展）
  private static readonly DEFAULT_STOCKS = {
    US: [
      'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA', 'AMZN', 'META', 'BRK-B', 'UNH', 'JNJ',
      'V', 'PG', 'HD', 'MA', 'DIS', 'PYPL', 'NFLX', 'ADBE', 'CRM', 'INTC'
    ],
    TW: [
      '2330.TW', '2317.TW', '2454.TW', '2412.TW', '2881.TW', '1301.TW', '1303.TW',
      '2002.TW', '1216.TW', '2207.TW', '2308.TW', '2882.TW', '2303.TW', '3008.TW'
    ]
  };

  constructor() {
    this.collector = new YahooFinanceCollector({
      baseDir: 'data/yahoo-finance',
      markets: {
        US: { name: 'United States', symbols: MarketScanner.DEFAULT_STOCKS.US },
        TW: { name: 'Taiwan', symbols: MarketScanner.DEFAULT_STOCKS.TW }
      }
    });
  }

  /**
   * 全市場掃描
   */
  async scanMarkets(config: MarketScannerConfig): Promise<ScreenerResult[]> {
    console.log(`開始掃描市場: ${config.markets.join(', ')}`);
    
    const results: ScreenerResult[] = [];
    
    for (const market of config.markets) {
      const marketResults = await this.scanMarket(market, config);
      results.push(...marketResults);
    }
    
    // 按分數降序排列
    results.sort((a, b) => b.score - a.score);
    
    // 限制結果數量
    if (config.limit) {
      return results.slice(0, config.limit);
    }
    
    return results;
  }

  /**
   * 掃描單一市場
   */
  private async scanMarket(market: string, config: MarketScannerConfig): Promise<ScreenerResult[]> {
    const symbols = MarketScanner.DEFAULT_STOCKS[market as keyof typeof MarketScanner.DEFAULT_STOCKS] || [];
    const results: ScreenerResult[] = [];
    
    console.log(`掃描 ${market} 市場，共 ${symbols.length} 支股票`);
    
    // 並發處理，限制並發數
    const concurrency = 5;
    const batches = [];
    
    for (let i = 0; i < symbols.length; i += concurrency) {
      batches.push(symbols.slice(i, i + concurrency));
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map(symbol => 
        this.analyzeStock(symbol, market, config).catch(error => {
          console.error(`分析 ${symbol} 失敗:`, error);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as ScreenerResult[]);
      
      // 避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  /**
   * 分析單支股票
   */
  private async analyzeStock(
    symbol: string, 
    market: string, 
    config: MarketScannerConfig
  ): Promise<ScreenerResult | null> {
    try {
      // 1. 獲取報價數據
      const quoteData = await this.collector.getQuote(symbol, market as any);
      if (!quoteData) {
        console.warn(`無法獲取 ${symbol} 報價數據`);
        return null;
      }

      // 2. 獲取歷史數據
      const historicalData = await this.collector.getHistoricalByRange(symbol, market as any, '2y');
      if (!historicalData || historicalData.data.length < 50) {
        console.warn(`無法獲取 ${symbol} 歷史數據或數據不足`);
        return null;
      }

      // 3. 轉換為 Candle 格式
      const candles: Candle[] = historicalData.data.map(d => ({
        time: new Date(d.date).getTime(),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume
      }));

      // 4. 多因子評分
      const scoringResult = scoreStock(candles, undefined); // 暫時不包含基本面數據
      const lastClose = candles[candles.length - 1].close;
      const summary = summarizeForCard(symbol, scoringResult, lastClose);

      // 5. 反轉雷達
      const reboundResult = reboundSignals(candles);

      // 6. 回測（可選）
      let backtestResult = undefined;
      if (config.includeBacktest && config.exitPolicy) {
        // 生成進場點（簡化：每月第一個交易日）
        const entries = this.generateEntryPoints(candles);
        const backtestData = backtest(candles, entries, config.exitPolicy);
        backtestResult = generateBacktestSummary(symbol, config.exitPolicy, backtestData);
      }

      return {
        symbol,
        market,
        name: quoteData.longName || symbol,
        quote: {
          price: quoteData.regularMarketPrice || lastClose,
          change: quoteData.regularMarketChange || 0,
          changePct: quoteData.regularMarketChangePercent || 0,
          volume: quoteData.regularMarketVolume,
          marketCap: quoteData.marketCap
        },
        score: scoringResult.total,
        action: scoringResult.decision,
        confidence: summary.confidence,
        summary: {
          signals: summary.signals,
          reasons: summary.reasons,
          stop: summary.stop,
          target: summary.target
        },
        rebound: {
          score: reboundResult.score,
          rules: reboundResult.rules
        },
        backtest: backtestResult
      };

    } catch (error) {
      console.error(`分析 ${symbol} 時發生錯誤:`, error);
      return null;
    }
  }

  /**
   * 生成進場點（簡化版本）
   */
  private generateEntryPoints(candles: Candle[]): number[] {
    const entries: number[] = [];
    const monthlyDates = new Set<string>();
    
    // 找出每月的第一個交易日
    for (let i = 0; i < candles.length; i++) {
      const date = new Date(candles[i].time);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlyDates.has(monthKey)) {
        monthlyDates.add(monthKey);
        entries.push(i);
      }
    }
    
    return entries.slice(0, -1); // 排除最後一個月
  }

  /**
   * 反轉雷達掃描
   */
  async scanReboundStocks(markets: string[]): Promise<ReboundResult[]> {
    const allStocks: Array<{ symbol: string; market: string; candles: Candle[]; quote?: any }> = [];
    
    for (const market of markets) {
      const symbols = MarketScanner.DEFAULT_STOCKS[market as keyof typeof MarketScanner.DEFAULT_STOCKS] || [];
      
      for (const symbol of symbols) {
        try {
          const historicalData = await this.collector.getHistoricalByRange(symbol, market as any, '2y');
          if (historicalData && historicalData.data.length >= 60) {
            const candles: Candle[] = historicalData.data.map(d => ({
              time: new Date(d.date).getTime(),
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume
            }));
            
            const quoteData = await this.collector.getQuote(symbol, market as any);
            
            allStocks.push({
              symbol,
              market,
              candles,
              quote: quoteData ? {
                price: quoteData.regularMarketPrice,
                change: quoteData.regularMarketChange,
                changePct: quoteData.regularMarketChangePercent
              } : undefined
            });
          }
        } catch (error) {
          console.error(`處理 ${symbol} 反轉雷達時發生錯誤:`, error);
        }
      }
    }
    
    return analyzeReboundStocks(allStocks);
  }

  /**
   * 保存掃描結果
   */
  async saveScanResults(results: ScreenerResult[], market: string): Promise<void> {
    const outputDir = path.join(process.cwd(), 'data', 'screeners');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `${market}-latest.json`);
    const output = {
      generatedAt: new Date().toISOString(),
      market,
      total: results.length,
      buy: results.filter(r => r.action === 'Buy').length,
      hold: results.filter(r => r.action === 'Hold').length,
      avoid: results.filter(r => r.action === 'Avoid').length,
      avgScore: +(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2),
      results
    };
    
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`掃描結果已保存到 ${outputPath}`);
  }
}
