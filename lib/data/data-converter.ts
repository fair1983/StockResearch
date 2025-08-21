import { YahooFinanceData, HistoricalData } from './yahoo-finance-collector';
import { Candle } from '@/types';

/**
 * 數據轉換器 - 將 Yahoo Finance 數據轉換為應用程序格式
 */
export class DataConverter {
  
  /**
   * 將 Yahoo Finance 歷史數據轉換為 Candle 格式
   */
  static convertHistoricalToCandles(historicalData: HistoricalData): Candle[] {
    return historicalData.data.map(item => ({
      time: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    }));
  }

  /**
   * 將 Yahoo Finance 報價數據轉換為股票推薦格式
   */
  static convertQuoteToStockRecommendation(
    quoteData: YahooFinanceData,
    analysisResult?: any
  ) {
    return {
      symbol: quoteData.symbol,
      name: quoteData.name,
      market: quoteData.market,
      currentPrice: quoteData.regularMarketPrice,
      priceChange: quoteData.regularMarketChange,
      priceChangePercent: quoteData.regularMarketChangePercent,
      recommendedStrategy: analysisResult?.recommendedStrategy || 'AI分析策略',
      confidence: analysisResult?.confidence || 0.5,
      expectedReturn: analysisResult?.expectedReturn || 0.1,
      riskLevel: this.calculateRiskLevel(quoteData),
      reasoning: analysisResult?.reasoning || '基於市場數據分析',
      technicalSignals: {
        trend: this.calculateTrend(quoteData),
        momentum: this.calculateMomentum(quoteData),
        volatility: this.calculateVolatility(quoteData),
        support: quoteData.fiftyTwoWeekLow,
        resistance: quoteData.fiftyTwoWeekHigh
      },
      fundamentalScore: this.calculateFundamentalScore(quoteData),
      technicalScore: this.calculateTechnicalScore(quoteData),
      overallScore: this.calculateOverallScore(quoteData),
      lastUpdate: quoteData.lastUpdated,
      isAnalyzed: true // 標記為已分析
    };
  }

  /**
   * 計算風險等級
   */
  private static calculateRiskLevel(quoteData: YahooFinanceData): 'low' | 'medium' | 'high' {
    // 基於波動率和 Beta 值計算風險
    const volatility = this.calculateVolatility(quoteData);
    const beta = quoteData.beta || 1.0;
    
    if (volatility < 0.2 && beta < 1.0) return 'low';
    if (volatility > 0.4 || beta > 1.5) return 'high';
    return 'medium';
  }

  /**
   * 計算趨勢
   */
  private static calculateTrend(quoteData: YahooFinanceData): 'bullish' | 'bearish' | 'neutral' {
    const changePercent = quoteData.regularMarketChangePercent;
    
    // 更精確的趨勢判斷
    if (changePercent > 1.5) return 'bullish';
    if (changePercent < -1.5) return 'bearish';
    return 'neutral';
  }

  /**
   * 計算動量
   */
  private static calculateMomentum(quoteData: YahooFinanceData): number {
    // 基於價格變動百分比計算動量
    const changePercent = Math.abs(quoteData.regularMarketChangePercent);
    // 更精確的動量計算，考慮成交量
    let momentum = Math.min(1, changePercent / 8); // 標準化到 0-1
    
    // 如果有成交量數據，考慮成交量因素
    if (quoteData.regularMarketVolume) {
      // 這裡可以加入成交量分析，暫時保持簡單
      momentum = Math.min(1, momentum * 1.2);
    }
    
    return Math.round(momentum * 100) / 100; // 四捨五入到小數點第2位
  }

  /**
   * 計算波動率
   */
  private static calculateVolatility(quoteData: YahooFinanceData): number {
    // 基於 52 週高低點計算波動率
    const high = quoteData.fiftyTwoWeekHigh;
    const low = quoteData.fiftyTwoWeekLow;
    const current = quoteData.regularMarketPrice;
    
    if (high === low) return 0.1;
    
    const range = (high - low) / low;
    return Math.min(1, range);
  }

  /**
   * 計算基本面評分
   */
  private static calculateFundamentalScore(quoteData: YahooFinanceData): number {
    let score = 50; // 基礎分數

    // 基於 P/E 比率
    if (quoteData.peRatio) {
      if (quoteData.peRatio > 0 && quoteData.peRatio < 20) score += 10;
      else if (quoteData.peRatio >= 20 && quoteData.peRatio < 30) score += 5;
      else if (quoteData.peRatio >= 30) score -= 10;
    }

    // 基於股息率
    if (quoteData.dividendYield) {
      if (quoteData.dividendYield > 3) score += 10;
      else if (quoteData.dividendYield > 1) score += 5;
    }

    // 基於市值
    if (quoteData.marketCap) {
      if (quoteData.marketCap > 100000000000) score += 10; // 大盤股
      else if (quoteData.marketCap > 10000000000) score += 5; // 中盤股
    }

    // 基於 Beta 值
    if (quoteData.beta) {
      if (quoteData.beta < 1.0) score += 5; // 低風險
      else if (quoteData.beta > 1.5) score -= 5; // 高風險
    }

    // 四捨五入到小數點第2位
    return Math.round((Math.max(0, Math.min(100, score))) * 100) / 100;
  }

  /**
   * 計算技術面評分
   */
  private static calculateTechnicalScore(quoteData: YahooFinanceData): number {
    let score = 50; // 基礎分數

    // 基於價格變動
    const changePercent = quoteData.regularMarketChangePercent;
    if (changePercent > 0) {
      score += Math.min(20, changePercent * 2);
    } else {
      score -= Math.min(20, Math.abs(changePercent) * 2);
    }

    // 基於成交量
    if (quoteData.regularMarketVolume) {
      // 這裡需要歷史成交量數據來比較，暫時給基礎分數
      score += 10;
    }

    // 基於價格位置（相對於 52 週範圍）
    const high = quoteData.fiftyTwoWeekHigh;
    const low = quoteData.fiftyTwoWeekLow;
    const current = quoteData.regularMarketPrice;
    
    if (high !== low) {
      const position = (current - low) / (high - low);
      if (position > 0.8) score -= 10; // 接近高點
      else if (position < 0.2) score += 10; // 接近低點
    }

    // 四捨五入到小數點第2位
    return Math.round((Math.max(0, Math.min(100, score))) * 100) / 100;
  }

  /**
   * 計算綜合評分
   */
  private static calculateOverallScore(quoteData: YahooFinanceData): number {
    const fundamentalScore = this.calculateFundamentalScore(quoteData);
    const technicalScore = this.calculateTechnicalScore(quoteData);
    
    // 基本面 60%，技術面 40%
    const overallScore = fundamentalScore * 0.6 + technicalScore * 0.4;
    // 四捨五入到小數點第2位
    return Math.round(overallScore * 100) / 100;
  }

  /**
   * 批量轉換歷史數據
   */
  static convertMultipleHistoricalData(historicalDataList: HistoricalData[]): { [symbol: string]: Candle[] } {
    const result: { [symbol: string]: Candle[] } = {};
    
    for (const historicalData of historicalDataList) {
      if (historicalData) {
        result[historicalData.symbol] = this.convertHistoricalToCandles(historicalData);
      }
    }
    
    return result;
  }

  /**
   * 批量轉換報價數據
   */
  static convertMultipleQuoteData(quoteDataList: YahooFinanceData[]): any[] {
    return quoteDataList
      .filter(quoteData => quoteData !== null)
      .map(quoteData => this.convertQuoteToStockRecommendation(quoteData));
  }

  /**
   * 驗證數據完整性
   */
  static validateQuoteData(quoteData: YahooFinanceData): boolean {
    return !!(
      quoteData.symbol &&
      quoteData.name &&
      quoteData.regularMarketPrice &&
      quoteData.regularMarketPrice > 0 &&
      quoteData.lastUpdated
    );
  }

  /**
   * 驗證歷史數據完整性
   */
  static validateHistoricalData(historicalData: HistoricalData): boolean {
    return !!(
      historicalData.symbol &&
      historicalData.data &&
      historicalData.data.length > 0 &&
      historicalData.lastUpdated
    );
  }
}
