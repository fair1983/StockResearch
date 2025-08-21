import { Candle } from '../../types';
import { StockClassifier, StockClassification } from './stock-classifier';

/**
 * 策略分析結果介面
 */
export interface StrategyAnalysisResult {
  symbol: string;
  name: string;
  market: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  recommendedStrategy: string;
  confidence: number;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  technicalSignals: TechnicalSignals;
  fundamentalScore: number;
  technicalScore: number;
  overallScore: number;
  lastUpdate: string;
}

/**
 * 技術信號介面
 */
export interface TechnicalSignals {
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
  volatility: number;
  support: number;
  resistance: number;
}

/**
 * 策略分析器 - 負責分析股票並推薦策略
 */
export class StrategyAnalyzer {
  private classifier: StockClassifier;

  constructor() {
    this.classifier = new StockClassifier();
  }

  /**
   * 分析股票並生成推薦
   */
  async analyzeStock(
    symbol: string,
    name: string,
    market: string,
    data: Candle[]
  ): Promise<StrategyAnalysisResult> {
    try {
      // 驗證輸入數據
      this.validateInputData(data);

      // 分析股票特徵
      const classification = this.classifier.classifyStock(data, symbol);
      
      // 計算技術指標
      const technicalSignals = this.calculateTechnicalSignals(data);
      
      // 生成策略推薦
      const strategyRecommendation = this.generateStrategyRecommendation(
        classification,
        technicalSignals,
        symbol
      );

      // 計算評分
      const scores = this.calculateScores(classification, technicalSignals);

      // 生成當前價格資訊
      const priceInfo = this.extractPriceInfo(data);

      return {
        symbol,
        name,
        market,
        ...priceInfo,
        ...strategyRecommendation,
        technicalSignals,
        ...scores,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`股票分析失敗 (${symbol}): ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 驗證輸入數據
   */
  private validateInputData(data: Candle[]): void {
    if (!data || data.length === 0) {
      throw new Error('股票數據為空');
    }

    if (data.length < 50) {
      throw new Error('需要至少50個數據點進行分析');
    }

    // 檢查數據完整性
    const invalidData = data.filter(d => 
      !d.close || 
      !d.high || 
      !d.low || 
      !d.open ||
      d.close <= 0
    );

    if (invalidData.length > 0) {
      throw new Error(`發現 ${invalidData.length} 個無效數據點`);
    }
  }

  /**
   * 計算技術信號
   */
  private calculateTechnicalSignals(data: Candle[]): TechnicalSignals {
    const prices = data.map(d => d.close);
    const recentPrices = prices.slice(-20); // 最近20個交易日
    
    // 計算趨勢
    const trend = this.calculateTrend(recentPrices);
    
    // 計算動量
    const momentum = this.calculateMomentum(prices);
    
    // 計算波動率
    const volatility = this.calculateVolatility(prices);
    
    // 計算支撐和阻力位
    const { support, resistance } = this.calculateSupportResistance(prices);

    return {
      trend,
      momentum,
      volatility,
      support,
      resistance
    };
  }

  /**
   * 計算趨勢
   */
  private calculateTrend(prices: number[]): 'bullish' | 'bearish' | 'neutral' {
    if (prices.length < 2) return 'neutral';
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = (lastPrice - firstPrice) / firstPrice;
    
    if (change > 0.05) return 'bullish'; // 上漲超過5%
    if (change < -0.05) return 'bearish'; // 下跌超過5%
    return 'neutral';
  }

  /**
   * 計算動量
   */
  private calculateMomentum(prices: number[]): number {
    if (prices.length < 14) return 0.5;
    
    const recentPrices = prices.slice(-14);
    const olderPrices = prices.slice(-28, -14);
    
    if (olderPrices.length === 0) return 0.5;
    
    const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
    
    const momentum = (recentAvg - olderAvg) / olderAvg;
    
    // 標準化到 0-1 範圍
    return Math.max(0, Math.min(1, (momentum + 0.2) / 0.4));
  }

  /**
   * 計算波動率
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252); // 年化波動率
  }

  /**
   * 計算支撐和阻力位
   */
  private calculateSupportResistance(prices: number[]): { support: number; resistance: number } {
    const recentPrices = prices.slice(-50); // 最近50個交易日
    const min = Math.min(...recentPrices);
    const max = Math.max(...recentPrices);
    const current = prices[prices.length - 1];
    
    // 支撐位：當前價格的90%
    const support = Math.min(current * 0.9, min);
    
    // 阻力位：當前價格的110%
    const resistance = Math.max(current * 1.1, max);
    
    return { support, resistance };
  }

  /**
   * 生成策略推薦
   */
  private generateStrategyRecommendation(
    classification: StockClassification,
    technicalSignals: TechnicalSignals,
    symbol: string
  ): {
    recommendedStrategy: string;
    confidence: number;
    expectedReturn: number;
    riskLevel: 'low' | 'medium' | 'high';
    reasoning: string;
  } {
    // 基於股票分類和技術信號選擇策略
    let strategy = 'buy_and_hold';
    let confidence = classification.confidence;
    let reasoning = classification.reasoning;

    // 根據股票類型選擇策略
    switch (classification.type) {
      case 'growth':
        strategy = 'buy_and_hold';
        reasoning += ' → 成長股適合長期持有策略';
        break;
      case 'value':
        strategy = 'mean_reversion';
        reasoning += ' → 價值股適合均值回歸策略';
        break;
      case 'cyclical':
        strategy = 'momentum';
        reasoning += ' → 週期股適合動量策略';
        break;
      case 'dividend':
        strategy = 'dividend_focused';
        reasoning += ' → 股息股適合股息策略';
        break;
      default:
        strategy = 'ai_analysis';
        reasoning += ' → 使用AI分析策略';
    }

    // 根據技術信號調整策略
    if (technicalSignals.trend === 'bullish' && technicalSignals.momentum > 0.7) {
      if (strategy === 'buy_and_hold') {
        strategy = 'momentum';
        reasoning += '，技術指標顯示強勢動量';
      }
    } else if (technicalSignals.trend === 'bearish' && technicalSignals.momentum < 0.3) {
      if (strategy === 'momentum') {
        strategy = 'mean_reversion';
        reasoning += '，技術指標顯示超賣';
      }
    }

    // 計算預期收益和風險
    const expectedReturn = this.calculateExpectedReturn(classification, technicalSignals, strategy);
    const riskLevel = this.calculateRiskLevel(classification, technicalSignals);

    // 調整信心度
    confidence = Math.min(95, confidence + (technicalSignals.momentum - 0.5) * 20);

    return {
      recommendedStrategy: this.getStrategyDisplayName(strategy),
      confidence: confidence / 100,
      expectedReturn,
      riskLevel,
      reasoning
    };
  }

  /**
   * 計算預期收益
   */
  private calculateExpectedReturn(
    classification: StockClassification,
    technicalSignals: TechnicalSignals,
    strategy: string
  ): number {
    let baseReturn = classification.characteristics.growthRate;
    
    // 根據策略調整
    switch (strategy) {
      case 'buy_and_hold':
        return baseReturn * 0.9;
      case 'momentum':
        return baseReturn * 1.2;
      case 'mean_reversion':
        return baseReturn * 0.7;
      case 'dividend_focused':
        return baseReturn * 0.8;
      case 'ai_analysis':
        return baseReturn * 1.0;
      default:
        return baseReturn;
    }
  }

  /**
   * 計算風險等級
   */
  private calculateRiskLevel(
    classification: StockClassification,
    technicalSignals: TechnicalSignals
  ): 'low' | 'medium' | 'high' {
    const volatility = technicalSignals.volatility;
    const beta = classification.characteristics.beta;
    
    if (volatility < 0.2 && beta < 1.0) return 'low';
    if (volatility > 0.4 || beta > 1.5) return 'high';
    return 'medium';
  }

  /**
   * 計算評分
   */
  private calculateScores(
    classification: StockClassification,
    technicalSignals: TechnicalSignals
  ): {
    fundamentalScore: number;
    technicalScore: number;
    overallScore: number;
  } {
    // 基本面評分
    const fundamentalScore = Math.min(100, Math.max(0,
      classification.confidence * 0.4 +
      (classification.characteristics.growthRate * 100) * 0.3 +
      (1 - classification.characteristics.volatility) * 100 * 0.3
    ));

    // 技術面評分
    const technicalScore = Math.min(100, Math.max(0,
      (technicalSignals.momentum * 100) * 0.4 +
      (technicalSignals.trend === 'bullish' ? 80 : technicalSignals.trend === 'neutral' ? 60 : 40) * 0.3 +
      (1 - technicalSignals.volatility) * 100 * 0.3
    ));

    // 綜合評分
    const overallScore = Math.round((fundamentalScore * 0.6 + technicalScore * 0.4));

    return {
      fundamentalScore: Math.round(fundamentalScore),
      technicalScore: Math.round(technicalScore),
      overallScore
    };
  }

  /**
   * 提取價格資訊
   */
  private extractPriceInfo(data: Candle[]): {
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
  } {
    const currentPrice = data[data.length - 1].close;
    const previousPrice = data[data.length - 2]?.close || currentPrice;
    const priceChange = currentPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice) * 100;

    return {
      currentPrice,
      priceChange,
      priceChangePercent
    };
  }

  /**
   * 獲取策略顯示名稱
   */
  private getStrategyDisplayName(strategy: string): string {
    const strategyNames: Record<string, string> = {
      'buy_and_hold': '買入持有策略',
      'momentum': '動量突破策略',
      'mean_reversion': '均值回歸策略',
      'dividend_focused': '股息策略',
      'ai_analysis': 'AI分析策略'
    };
    
    return strategyNames[strategy] || strategy;
  }
}
