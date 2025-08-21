import { TechnicalIndicatorsCache } from './technical-indicators-cache';
import { logger } from './logger';

export interface AnalysisResult {
  symbol: string;
  market: string;
  interval: string;
  timestamp: string;
  analysis: {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number; // 0-100
    signals: Signal[];
    summary: string;
    recommendations: Recommendation[];
  };
}

export interface Signal {
  type: 'buy' | 'sell' | 'hold';
  indicator: string;
  value: number;
  threshold: number;
  confidence: number; // 0-100
  description: string;
}

export interface Recommendation {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
}

export interface MarketCondition {
  overallTrend: 'bullish' | 'bearish' | 'neutral';
  volatility: 'low' | 'medium' | 'high';
  volume: 'low' | 'medium' | 'high';
  momentum: 'weak' | 'moderate' | 'strong';
}

export class AIAnalysisEngine {
  private indicatorsCache: TechnicalIndicatorsCache;

  constructor() {
    this.indicatorsCache = new TechnicalIndicatorsCache();
  }

  /**
   * 分析單一股票的技術指標
   */
  async analyzeStock(
    market: string, 
    symbol: string, 
    interval: string = '1d',
    data?: any
  ): Promise<AnalysisResult> {
    try {
      logger.ai.analysis(`Starting AI analysis for ${market}/${symbol}/${interval}`);

      // 取得技術指標資料
      let indicators;
      if (data) {
        indicators = await this.indicatorsCache.calculateAndCacheIndicators(market, symbol, interval, data);
      } else {
        // 從快取讀取
        indicators = await this.indicatorsCache.getCachedIndicators(market, symbol, interval, []);
        if (!indicators) {
          throw new Error('No indicators data available');
        }
      }

      // 執行 AI 分析
      const analysis = await this.performAnalysis(indicators, market, symbol, interval);

      const result: AnalysisResult = {
        symbol,
        market,
        interval,
        timestamp: new Date().toISOString(),
        analysis
      };

      logger.ai.analysis(`AI analysis completed for ${market}/${symbol}/${interval}`);
      return result;

    } catch (error) {
      logger.ai.error(`AI analysis failed for ${market}/${symbol}/${interval}`, error);
      throw error;
    }
  }

  /**
   * 執行 AI 分析邏輯
   */
  private async performAnalysis(
    indicators: any, 
    market: string, 
    symbol: string, 
    interval: string
  ): Promise<AnalysisResult['analysis']> {
    const signals: Signal[] = [];
    let bullishCount = 0;
    let bearishCount = 0;
    let totalConfidence = 0;

    // 分析移動平均線
    const maSignals = this.analyzeMovingAverages(indicators);
    signals.push(...maSignals);
    maSignals.forEach(signal => {
      if (signal.type === 'buy') bullishCount++;
      else if (signal.type === 'sell') bearishCount++;
      totalConfidence += signal.confidence;
    });

    // 分析 RSI
    const rsiSignals = this.analyzeRSI(indicators);
    signals.push(...rsiSignals);
    rsiSignals.forEach(signal => {
      if (signal.type === 'buy') bullishCount++;
      else if (signal.type === 'sell') bearishCount++;
      totalConfidence += signal.confidence;
    });

    // 分析 MACD
    const macdSignals = this.analyzeMACD(indicators);
    signals.push(...macdSignals);
    macdSignals.forEach(signal => {
      if (signal.type === 'buy') bullishCount++;
      else if (signal.type === 'sell') bearishCount++;
      totalConfidence += signal.confidence;
    });

    // 分析布林通道
    const bollSignals = this.analyzeBollingerBands(indicators);
    signals.push(...bollSignals);
    bollSignals.forEach(signal => {
      if (signal.type === 'buy') bullishCount++;
      else if (signal.type === 'sell') bearishCount++;
      totalConfidence += signal.confidence;
    });

    // 分析 KDJ
    const kdjSignals = this.analyzeKDJ(indicators);
    signals.push(...kdjSignals);
    kdjSignals.forEach(signal => {
      if (signal.type === 'buy') bullishCount++;
      else if (signal.type === 'sell') bearishCount++;
      totalConfidence += signal.confidence;
    });

    // 判斷整體趨勢
    const trend = this.determineTrend(bullishCount, bearishCount);
    const strength = Math.min(100, Math.abs(bullishCount - bearishCount) * 20);
    const avgConfidence = signals.length > 0 ? totalConfidence / signals.length : 0;

    // 生成建議
    const recommendations = this.generateRecommendations(signals, trend, strength, avgConfidence);

    // 生成摘要
    const summary = this.generateSummary(signals, trend, strength, market, symbol);

    return {
      trend,
      strength,
      signals,
      summary,
      recommendations
    };
  }

  /**
   * 分析移動平均線
   */
  private analyzeMovingAverages(indicators: any): Signal[] {
    const signals: Signal[] = [];
    const { ma5, ma10, ma20 } = indicators;

    if (ma5 && ma10 && ma20) {
      const lastIndex = ma5.length - 1;
      if (lastIndex >= 0) {
        const ma5Value = ma5[lastIndex];
        const ma10Value = ma10[lastIndex];
        const ma20Value = ma20[lastIndex];

        if (!isNaN(ma5Value) && !isNaN(ma10Value) && !isNaN(ma20Value)) {
          // 黃金交叉：MA5 > MA10 > MA20
          if (ma5Value > ma10Value && ma10Value > ma20Value) {
            signals.push({
              type: 'buy',
              indicator: 'MA',
              value: ma5Value,
              threshold: ma20Value,
              confidence: 75,
              description: '移動平均線呈多頭排列，趨勢向上'
            });
          }
          // 死亡交叉：MA5 < MA10 < MA20
          else if (ma5Value < ma10Value && ma10Value < ma20Value) {
            signals.push({
              type: 'sell',
              indicator: 'MA',
              value: ma5Value,
              threshold: ma20Value,
              confidence: 75,
              description: '移動平均線呈空頭排列，趨勢向下'
            });
          }
        }
      }
    }

    return signals;
  }

  /**
   * 分析 RSI
   */
  private analyzeRSI(indicators: any): Signal[] {
    const signals: Signal[] = [];
    const { rsi } = indicators;

    if (rsi && rsi.length > 0) {
      const lastRSI = rsi[rsi.length - 1];
      if (!isNaN(lastRSI)) {
        if (lastRSI < 30) {
          signals.push({
            type: 'buy',
            indicator: 'RSI',
            value: lastRSI,
            threshold: 30,
            confidence: 80,
            description: 'RSI 超賣，可能反彈'
          });
        } else if (lastRSI > 70) {
          signals.push({
            type: 'sell',
            indicator: 'RSI',
            value: lastRSI,
            threshold: 70,
            confidence: 80,
            description: 'RSI 超買，可能回調'
          });
        }
      }
    }

    return signals;
  }

  /**
   * 分析 MACD
   */
  private analyzeMACD(indicators: any): Signal[] {
    const signals: Signal[] = [];
    const { macd } = indicators;

    if (macd && macd.macd && macd.signal && macd.histogram) {
      const lastIndex = macd.macd.length - 1;
      if (lastIndex >= 0) {
        const macdValue = macd.macd[lastIndex];
        const signalValue = macd.signal[lastIndex];
        const histogramValue = macd.histogram[lastIndex];

        if (!isNaN(macdValue) && !isNaN(signalValue)) {
          // MACD 金叉
          if (macdValue > signalValue && histogramValue > 0) {
            signals.push({
              type: 'buy',
              indicator: 'MACD',
              value: macdValue,
              threshold: signalValue,
              confidence: 70,
              description: 'MACD 金叉，動量向上'
            });
          }
          // MACD 死叉
          else if (macdValue < signalValue && histogramValue < 0) {
            signals.push({
              type: 'sell',
              indicator: 'MACD',
              value: macdValue,
              threshold: signalValue,
              confidence: 70,
              description: 'MACD 死叉，動量向下'
            });
          }
        }
      }
    }

    return signals;
  }

  /**
   * 分析布林通道
   */
  private analyzeBollingerBands(indicators: any): Signal[] {
    const signals: Signal[] = [];
    const { bollinger } = indicators;

    if (bollinger && bollinger.upper && bollinger.lower) {
      const lastIndex = bollinger.upper.length - 1;
      if (lastIndex >= 0) {
        const upperValue = bollinger.upper[lastIndex];
        const lowerValue = bollinger.lower[lastIndex];

        if (!isNaN(upperValue) && !isNaN(lowerValue)) {
          // 價格接近下軌，可能反彈
          signals.push({
            type: 'buy',
            indicator: 'BOLL',
            value: lowerValue,
            threshold: upperValue,
            confidence: 60,
            description: '價格接近布林通道下軌，可能反彈'
          });
        }
      }
    }

    return signals;
  }

  /**
   * 分析 KDJ
   */
  private analyzeKDJ(indicators: any): Signal[] {
    const signals: Signal[] = [];
    const { kdj } = indicators;

    if (kdj && kdj.k && kdj.d && kdj.j) {
      const lastIndex = kdj.k.length - 1;
      if (lastIndex >= 0) {
        const kValue = kdj.k[lastIndex];
        const dValue = kdj.d[lastIndex];
        const jValue = kdj.j[lastIndex];

        if (!isNaN(kValue) && !isNaN(dValue)) {
          // KDJ 金叉
          if (kValue > dValue && kValue < 80) {
            signals.push({
              type: 'buy',
              indicator: 'KDJ',
              value: kValue,
              threshold: dValue,
              confidence: 65,
              description: 'KDJ 金叉，動量向上'
            });
          }
          // KDJ 死叉
          else if (kValue < dValue && kValue > 20) {
            signals.push({
              type: 'sell',
              indicator: 'KDJ',
              value: kValue,
              threshold: dValue,
              confidence: 65,
              description: 'KDJ 死叉，動量向下'
            });
          }
        }
      }
    }

    return signals;
  }

  /**
   * 判斷整體趨勢
   */
  private determineTrend(bullishCount: number, bearishCount: number): 'bullish' | 'bearish' | 'neutral' {
    const diff = bullishCount - bearishCount;
    if (diff > 1) return 'bullish';
    if (diff < -1) return 'bearish';
    return 'neutral';
  }

  /**
   * 生成投資建議
   */
  private generateRecommendations(
    signals: Signal[], 
    trend: string, 
    strength: number, 
    confidence: number
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (trend === 'bullish' && strength > 50) {
      recommendations.push({
        action: 'buy',
        confidence: Math.min(confidence, 85),
        reasoning: `技術指標顯示強烈買入信號，${signals.length} 個指標支持上漲趨勢`,
        riskLevel: strength > 80 ? 'low' : 'medium',
        timeframe: '短期 (1-2週)'
      });
    } else if (trend === 'bearish' && strength > 50) {
      recommendations.push({
        action: 'sell',
        confidence: Math.min(confidence, 85),
        reasoning: `技術指標顯示強烈賣出信號，${signals.length} 個指標支持下跌趨勢`,
        riskLevel: strength > 80 ? 'low' : 'medium',
        timeframe: '短期 (1-2週)'
      });
    } else {
      recommendations.push({
        action: 'hold',
        confidence: 60,
        reasoning: '技術指標信號不明確，建議觀望',
        riskLevel: 'medium',
        timeframe: '短期 (1週)'
      });
    }

    return recommendations;
  }

  /**
   * 生成分析摘要
   */
  private generateSummary(
    signals: Signal[], 
    trend: string, 
    strength: number, 
    market: string, 
    symbol: string
  ): string {
    const trendText = trend === 'bullish' ? '看漲' : trend === 'bearish' ? '看跌' : '中性';
    const strengthText = strength > 80 ? '強烈' : strength > 50 ? '中等' : '微弱';
    
    return `${market}/${symbol} 目前呈現${strengthText}的${trendText}趨勢。共檢測到 ${signals.length} 個技術信號，其中買入信號 ${signals.filter(s => s.type === 'buy').length} 個，賣出信號 ${signals.filter(s => s.type === 'sell').length} 個。建議根據風險承受能力謹慎操作。`;
  }

  /**
   * 批量分析多個股票
   */
  async batchAnalyze(
    stocks: Array<{ market: string; symbol: string; interval?: string }>
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (const stock of stocks) {
      try {
        const result = await this.analyzeStock(
          stock.market, 
          stock.symbol, 
          stock.interval || '1d'
        );
        results.push(result);
        
        // 避免過於頻繁的請求
        await this.delay(100);
      } catch (error) {
        logger.ai.error(`Batch analysis failed for ${stock.market}/${stock.symbol}`, error);
      }
    }

    return results;
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
