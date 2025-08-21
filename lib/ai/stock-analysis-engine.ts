import { Candle } from '@/types';
import { YahooFinanceCollector } from '@/lib/data/yahoo-finance-collector';
import { DataConverter } from '@/lib/data/data-converter';
import { HybridAnalyzer } from './core/hybrid-analyzer';
import { AnalysisInput, AnalysisOutput } from './interfaces/analyzer';

export interface TechnicalAnalysis {
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
  volatility: number;
  support: number;
  resistance: number;
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  volumeAnalysis: {
    averageVolume: number;
    volumeRatio: number;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
  };
  priceAnalysis: {
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    pricePosition: number; // 0-1, 相對於52週範圍的位置
  };
  winRate: number; // 基於技術指標的勝率預測
  confidence: number; // 分析信心度
}

export interface AIAnalysisResult {
  symbol: string;
  name: string;
  market: string;
  recommendedStrategy: string;
  confidence: number;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  technicalAnalysis: TechnicalAnalysis;
  fundamentalScore: number;
  technicalScore: number;
  overallScore: number;
  lastUpdate: string;
}

export class StockAnalysisEngine {
  /**
   * 分析單支股票
   */
  static async analyzeStock(symbol: string, market: string): Promise<AIAnalysisResult> {
    try {
      console.log(`開始分析股票: ${symbol}`);
      
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

      // 獲取報價數據
      console.log(`獲取 ${symbol} 報價數據...`);
      let quoteData = await collector.loadQuoteData(symbol, market as any);
      if (!quoteData || collector.isTimestampStale(quoteData.lastUpdated)) {
        console.log(`從 API 獲取 ${symbol} 報價數據...`);
        quoteData = await collector.getQuote(symbol, market as any);
        if (quoteData) {
          await collector.saveQuoteData(symbol, market as any, quoteData);
        }
      }

      if (!quoteData) {
        throw new Error(`無法獲取 ${symbol} 的報價數據`);
      }

      console.log(`報價數據獲取成功: ${quoteData.symbol}`);

      // 獲取歷史數據
      console.log(`獲取 ${symbol} 歷史數據...`);
      let historicalData = await collector.loadHistoricalData(symbol, market as any);
      if (!historicalData || collector.isTimestampStale(historicalData.lastUpdated)) {
        console.log(`從 API 獲取 ${symbol} 歷史數據...`);
        const period1 = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
        const period2 = Math.floor(Date.now() / 1000);
        historicalData = await collector.getHistoricalData(symbol, market as any, period1, period2);
        if (historicalData) {
          await collector.saveHistoricalData(symbol, market as any, historicalData);
        }
      }

      if (!historicalData) {
        throw new Error(`無法獲取 ${symbol} 的歷史數據`);
      }

      console.log(`歷史數據獲取成功，數據點: ${historicalData.data?.length || 0}`);

      // 轉換為 Candle 格式
      console.log(`轉換為 Candle 格式...`);
      const candles = DataConverter.convertHistoricalToCandles(historicalData);
      console.log(`Candle 數量: ${candles.length}`);

      // 進行技術分析
      console.log(`進行技術分析...`);
      const technicalAnalysis = this.performTechnicalAnalysis(candles, quoteData);

      // 生成 AI 分析結果
      console.log(`生成分析結果...`);
      const analysisResult = this.generateAnalysisResult(quoteData, technicalAnalysis);

      console.log(`分析完成: ${symbol}`);
      return analysisResult;
    } catch (error) {
      console.error(`分析股票 ${symbol} 失敗:`, error);
      throw error;
    }
  }

  /**
   * 批量分析股票
   */
  static async analyzeStocks(stocks: Array<{ symbol: string; market: string }>): Promise<AIAnalysisResult[]> {
    const results: AIAnalysisResult[] = [];
    
    for (const stock of stocks) {
      try {
        const result = await this.analyzeStock(stock.symbol, stock.market);
        results.push(result);
      } catch (error) {
        console.error(`分析股票 ${stock.symbol} 失敗:`, error);
        // 創建錯誤結果
        results.push(this.createErrorResult(stock.symbol, stock.market));
      }
    }

    return results;
  }

  /**
   * 執行技術分析
   */
  private static performTechnicalAnalysis(candles: Candle[], quoteData: any): TechnicalAnalysis {
    if (candles.length < 30) {
      throw new Error('歷史數據不足，無法進行技術分析');
    }

    // 計算 RSI
    const rsi = this.calculateRSI(candles, 14);

    // 計算 MACD
    const macd = this.calculateMACD(candles);

    // 分析成交量
    const volumeAnalysis = this.analyzeVolume(candles);

    // 分析價格
    const priceAnalysis = this.analyzePrice(candles, quoteData);

    // 計算趨勢
    const trend = this.calculateTrend(candles);

    // 計算動量
    const momentum = this.calculateMomentum(candles);

    // 計算波動率
    const volatility = this.calculateVolatility(candles);

    // 計算支撐和阻力
    const { support, resistance } = this.calculateSupportResistance(candles);

    // 創建臨時分析對象用於計算
    const tempAnalysis = {
      trend,
      momentum,
      volatility,
      support,
      resistance,
      rsi,
      macd,
      volumeAnalysis,
      priceAnalysis,
      winRate: 0,
      confidence: 0
    };

    // 計算勝率
    const winRate = this.calculateWinRate(candles, tempAnalysis);

    // 計算信心度
    const confidence = this.calculateConfidence(candles, tempAnalysis);

    return {
      trend,
      momentum,
      volatility,
      support,
      resistance,
      rsi,
      macd,
      volumeAnalysis,
      priceAnalysis,
      winRate,
      confidence
    };
  }

  /**
   * 計算 RSI
   */
  private static calculateRSI(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = candles[candles.length - i].close - candles[candles.length - i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.round(rsi * 100) / 100;
  }

  /**
   * 計算 MACD
   */
  private static calculateMACD(candles: Candle[]): { macd: number; signal: number; histogram: number } {
    const prices = candles.map(c => c.close);
    
    // 計算 EMA12 和 EMA26
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    
    const macd = ema12[ema12.length - 1] - ema26[ema26.length - 1];
    
    // 計算 MACD 的 EMA9 作為信號線
    const macdValues = ema12.map((v, i) => v - ema26[i]);
    const signal = this.calculateEMA(macdValues, 9)[macdValues.length - 1];
    
    const histogram = macd - signal;

    return {
      macd: Math.round(macd * 100) / 100,
      signal: Math.round(signal * 100) / 100,
      histogram: Math.round(histogram * 100) / 100
    };
  }

  /**
   * 計算 EMA
   */
  private static calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // 第一個 EMA 使用 SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);

    // 計算後續的 EMA
    for (let i = period; i < prices.length; i++) {
      const newEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(newEMA);
    }

    return ema;
  }

  /**
   * 分析成交量
   */
  private static analyzeVolume(candles: Candle[]): {
    averageVolume: number;
    volumeRatio: number;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    const recentVolumes = candles.slice(-10).map(c => c.volume || 0);
    const averageVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    
    const currentVolume = recentVolumes[recentVolumes.length - 1];
    const volumeRatio = currentVolume / averageVolume;

    // 判斷成交量趨勢
    const firstHalf = recentVolumes.slice(0, 5).reduce((sum, v) => sum + v, 0) / 5;
    const secondHalf = recentVolumes.slice(5).reduce((sum, v) => sum + v, 0) / 5;
    
    let volumeTrend: 'increasing' | 'decreasing' | 'stable';
    if (secondHalf > firstHalf * 1.1) {
      volumeTrend = 'increasing';
    } else if (secondHalf < firstHalf * 0.9) {
      volumeTrend = 'decreasing';
    } else {
      volumeTrend = 'stable';
    }

    return {
      averageVolume: Math.round(averageVolume),
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      volumeTrend
    };
  }

  /**
   * 分析價格
   */
  private static analyzePrice(candles: Candle[], quoteData: any): {
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    pricePosition: number;
  } {
    // 安全地獲取價格數據，提供默認值
    const currentPrice = quoteData?.regularMarketPrice || quoteData?.price || candles[candles.length - 1]?.close || 0;
    const priceChange = quoteData?.regularMarketChange || quoteData?.change || 0;
    const priceChangePercent = quoteData?.regularMarketChangePercent || quoteData?.changePercent || 0;
    
    // 計算價格在 52 週範圍內的位置
    const high = quoteData?.fiftyTwoWeekHigh || quoteData?.high || Math.max(...candles.map(c => c.high));
    const low = quoteData?.fiftyTwoWeekLow || quoteData?.low || Math.min(...candles.map(c => c.low));
    const pricePosition = high !== low ? (currentPrice - low) / (high - low) : 0.5;

    return {
      currentPrice: Math.round(currentPrice * 100) / 100,
      priceChange: Math.round(priceChange * 100) / 100,
      priceChangePercent: Math.round(priceChangePercent * 100) / 100,
      pricePosition: Math.round(pricePosition * 100) / 100
    };
  }

  /**
   * 計算趨勢
   */
  private static calculateTrend(candles: Candle[]): 'bullish' | 'bearish' | 'neutral' {
    const recentPrices = candles.slice(-20).map(c => c.close);
    const firstHalf = recentPrices.slice(0, 10).reduce((sum, p) => sum + p, 0) / 10;
    const secondHalf = recentPrices.slice(10).reduce((sum, p) => sum + p, 0) / 10;
    
    const changePercent = ((secondHalf - firstHalf) / firstHalf) * 100;
    
    if (changePercent > 2) return 'bullish';
    if (changePercent < -2) return 'bearish';
    return 'neutral';
  }

  /**
   * 計算動量
   */
  private static calculateMomentum(candles: Candle[]): number {
    const recentPrices = candles.slice(-10).map(c => c.close);
    const momentum = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
    return Math.round(Math.abs(momentum) * 100) / 100;
  }

  /**
   * 計算波動率
   */
  private static calculateVolatility(candles: Candle[]): number {
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const return_ = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
      returns.push(return_);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    return Math.round(volatility * 100) / 100;
  }

  /**
   * 計算支撐和阻力
   */
  private static calculateSupportResistance(candles: Candle[]): { support: number; resistance: number } {
    const prices = candles.map(c => c.close);
    const support = Math.min(...prices.slice(-20));
    const resistance = Math.max(...prices.slice(-20));
    
    return {
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100
    };
  }

  /**
   * 計算勝率
   */
  private static calculateWinRate(candles: Candle[], analysis: TechnicalAnalysis): number {
    let score = 50; // 基礎分數

    // RSI 分析
    if (analysis.rsi < 30) score += 10; // 超賣
    else if (analysis.rsi > 70) score -= 10; // 超買

    // MACD 分析
    if (analysis.macd.histogram > 0) score += 5; // MACD 上升
    else score -= 5; // MACD 下降

    // 成交量分析
    if (analysis.volumeAnalysis.volumeTrend === 'increasing') score += 5;
    else if (analysis.volumeAnalysis.volumeTrend === 'decreasing') score -= 5;

    // 趨勢分析
    if (analysis.trend === 'bullish') score += 10;
    else if (analysis.trend === 'bearish') score -= 10;

    // 價格位置分析
    if (analysis.priceAnalysis.pricePosition < 0.3) score += 5; // 接近支撐
    else if (analysis.priceAnalysis.pricePosition > 0.7) score -= 5; // 接近阻力

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 計算信心度
   */
  private static calculateConfidence(candles: Candle[], analysis: TechnicalAnalysis): number {
    let confidence = 50; // 基礎信心度

    // 數據質量
    if (candles.length >= 100) confidence += 10;
    else if (candles.length >= 50) confidence += 5;

    // 技術指標一致性
    const bullishSignals = [
      analysis.trend === 'bullish',
      analysis.macd.histogram > 0,
      analysis.volumeAnalysis.volumeTrend === 'increasing',
      analysis.rsi < 70
    ].filter(Boolean).length;

    const bearishSignals = [
      analysis.trend === 'bearish',
      analysis.macd.histogram < 0,
      analysis.volumeAnalysis.volumeTrend === 'decreasing',
      analysis.rsi > 30
    ].filter(Boolean).length;

    const signalStrength = Math.abs(bullishSignals - bearishSignals);
    confidence += signalStrength * 5;

    return Math.max(0, Math.min(100, confidence)) / 100;
  }

  /**
   * 生成分析結果
   */
  private static generateAnalysisResult(quoteData: any, technicalAnalysis: TechnicalAnalysis): AIAnalysisResult {
    // 根據技術分析生成策略建議
    const strategy = this.generateStrategy(technicalAnalysis);
    
    // 計算預期收益
    const expectedReturn = this.calculateExpectedReturn(technicalAnalysis);
    
    // 計算風險等級
    const riskLevel = this.calculateRiskLevel(technicalAnalysis);
    
    // 生成推薦理由
    const reasoning = this.generateReasoning(technicalAnalysis);
    
    // 計算分數
    const fundamentalScore = this.calculateFundamentalScore(quoteData);
    const technicalScore = Math.round(technicalAnalysis.winRate);
    const overallScore = Math.round((fundamentalScore * 0.4 + technicalScore * 0.6) * 100) / 100;

    return {
      symbol: quoteData?.symbol || 'UNKNOWN',
      name: quoteData?.name || quoteData?.longName || 'Unknown Stock',
      market: quoteData?.market || 'US',
      recommendedStrategy: strategy,
      confidence: technicalAnalysis.confidence,
      expectedReturn,
      riskLevel,
      reasoning,
      technicalAnalysis,
      fundamentalScore,
      technicalScore,
      overallScore,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * 生成策略建議
   */
  private static generateStrategy(analysis: TechnicalAnalysis): string {
    const signals = [];
    
    if (analysis.trend === 'bullish') signals.push('趨勢向上');
    if (analysis.macd.histogram > 0) signals.push('MACD 金叉');
    if (analysis.volumeAnalysis.volumeTrend === 'increasing') signals.push('成交量放大');
    if (analysis.rsi < 30) signals.push('RSI 超賣');
    
    if (signals.length >= 3) return '強烈買入';
    if (signals.length >= 2) return '買入';
    if (signals.length >= 1) return '觀望';
    return '賣出';
  }

  /**
   * 計算預期收益
   */
  private static calculateExpectedReturn(analysis: TechnicalAnalysis): number {
    let return_ = 0.05; // 基礎 5%
    
    if (analysis.trend === 'bullish') return_ += 0.05;
    if (analysis.macd.histogram > 0) return_ += 0.03;
    if (analysis.volumeAnalysis.volumeTrend === 'increasing') return_ += 0.02;
    if (analysis.rsi < 30) return_ += 0.03;
    
    return Math.round(return_ * 100) / 100;
  }

  /**
   * 計算風險等級
   */
  private static calculateRiskLevel(analysis: TechnicalAnalysis): 'low' | 'medium' | 'high' {
    let riskScore = 0;
    
    if (analysis.volatility > 0.3) riskScore += 2;
    if (analysis.volumeAnalysis.volumeRatio > 2) riskScore += 1;
    if (analysis.priceAnalysis.pricePosition > 0.8) riskScore += 1;
    
    if (riskScore >= 3) return 'high';
    if (riskScore >= 1) return 'medium';
    return 'low';
  }

  /**
   * 生成推薦理由
   */
  private static generateReasoning(analysis: TechnicalAnalysis): string {
    const reasons = [];
    
    if (analysis.trend === 'bullish') reasons.push('技術面趨勢向上');
    if (analysis.macd.histogram > 0) reasons.push('MACD 指標顯示動能增強');
    if (analysis.volumeAnalysis.volumeTrend === 'increasing') reasons.push('成交量持續放大');
    if (analysis.rsi < 30) reasons.push('RSI 顯示超賣，具備反彈機會');
    if (analysis.priceAnalysis.pricePosition < 0.3) reasons.push('價格接近支撐位');
    
    if (reasons.length === 0) {
      reasons.push('技術指標顯示中性，建議觀望');
    }
    
    return reasons.join('，') + '。';
  }

  /**
   * 計算基本面分數
   */
  private static calculateFundamentalScore(quoteData: any): number {
    let score = 50;
    
    // P/E 比率
    if (quoteData?.peRatio && quoteData.peRatio > 0 && quoteData.peRatio < 20) score += 10;
    
    // 股息率
    if (quoteData?.dividendYield && quoteData.dividendYield > 2) score += 10;
    
    // 市值
    if (quoteData?.marketCap && quoteData.marketCap > 100000000000) score += 10;
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * 創建錯誤結果
   */
  private static createErrorResult(symbol: string, market: string): AIAnalysisResult {
    return {
      symbol,
      name: symbol,
      market,
      recommendedStrategy: '分析失敗',
      confidence: 0,
      expectedReturn: 0,
      riskLevel: 'low',
      reasoning: '數據不足，無法進行分析',
      technicalAnalysis: {
        trend: 'neutral',
        momentum: 0,
        volatility: 0,
        support: 0,
        resistance: 0,
        rsi: 50,
        macd: { macd: 0, signal: 0, histogram: 0 },
        volumeAnalysis: { averageVolume: 0, volumeRatio: 0, volumeTrend: 'stable' },
        priceAnalysis: { currentPrice: 0, priceChange: 0, priceChangePercent: 0, pricePosition: 0.5 },
        winRate: 0,
        confidence: 0
      },
      fundamentalScore: 0,
      technicalScore: 0,
      overallScore: 0,
      lastUpdate: new Date().toISOString()
    };
  }
}
