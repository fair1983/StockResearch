import { AnalysisResult, Signal } from './ai-analysis-engine';
import { logger } from './logger';

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: 'trend_following' | 'mean_reversion' | 'momentum' | 'breakout';
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: 'short' | 'medium' | 'long';
  entryConditions: StrategyCondition[];
  exitConditions: StrategyCondition[];
  stopLoss: number; // 百分比
  takeProfit: number; // 百分比
  confidence: number; // 0-100
  backtestScore?: number; // 回測分數
}

export interface StrategyCondition {
  indicator: string;
  operator: '>' | '<' | '==' | '>=' | '<=';
  value: number;
  description: string;
}

export interface StrategyRecommendation {
  strategy: TradingStrategy;
  currentSignal: 'buy' | 'sell' | 'hold';
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  riskRewardRatio: number;
}

export class AIStrategyGenerator {
  private readonly strategies: TradingStrategy[] = [
    // 趨勢跟隨策略
    {
      id: 'trend_ma_cross',
      name: '移動平均線交叉策略',
      description: '利用短期和長期移動平均線的交叉來捕捉趨勢',
      type: 'trend_following',
      riskLevel: 'medium',
      timeframe: 'medium',
      entryConditions: [
        {
          indicator: 'MA5',
          operator: '>',
          value: 0,
          description: 'MA5 > MA20 (黃金交叉)'
        },
        {
          indicator: 'RSI',
          operator: '<',
          value: 70,
          description: 'RSI < 70 (非超買)'
        }
      ],
      exitConditions: [
        {
          indicator: 'MA5',
          operator: '<',
          value: 0,
          description: 'MA5 < MA20 (死亡交叉)'
        }
      ],
      stopLoss: 5,
      takeProfit: 15,
      confidence: 70
    },
    {
      id: 'macd_momentum',
      name: 'MACD 動量策略',
      description: '利用 MACD 指標的動量變化來捕捉趨勢轉折點',
      type: 'momentum',
      riskLevel: 'medium',
      timeframe: 'short',
      entryConditions: [
        {
          indicator: 'MACD',
          operator: '>',
          value: 0,
          description: 'MACD > Signal (金叉)'
        },
        {
          indicator: 'MACD_HIST',
          operator: '>',
          value: 0,
          description: 'MACD 柱狀圖為正'
        }
      ],
      exitConditions: [
        {
          indicator: 'MACD',
          operator: '<',
          value: 0,
          description: 'MACD < Signal (死叉)'
        }
      ],
      stopLoss: 3,
      takeProfit: 10,
      confidence: 65
    },
    // 均值回歸策略
    {
      id: 'rsi_mean_reversion',
      name: 'RSI 均值回歸策略',
      description: '利用 RSI 的超買超賣信號進行反向操作',
      type: 'mean_reversion',
      riskLevel: 'high',
      timeframe: 'short',
      entryConditions: [
        {
          indicator: 'RSI',
          operator: '<',
          value: 30,
          description: 'RSI < 30 (超賣)'
        }
      ],
      exitConditions: [
        {
          indicator: 'RSI',
          operator: '>',
          value: 70,
          description: 'RSI > 70 (超買)'
        }
      ],
      stopLoss: 8,
      takeProfit: 12,
      confidence: 60
    },
    {
      id: 'bollinger_reversion',
      name: '布林通道回歸策略',
      description: '利用價格在布林通道邊界的回歸特性',
      type: 'mean_reversion',
      riskLevel: 'medium',
      timeframe: 'short',
      entryConditions: [
        {
          indicator: 'BOLL_LOWER',
          operator: '>',
          value: 0,
          description: '價格接近下軌'
        }
      ],
      exitConditions: [
        {
          indicator: 'BOLL_MIDDLE',
          operator: '>',
          value: 0,
          description: '價格回歸中軌'
        }
      ],
      stopLoss: 6,
      takeProfit: 8,
      confidence: 55
    },
    // 突破策略
    {
      id: 'breakout_volume',
      name: '成交量突破策略',
      description: '結合價格突破和成交量確認的突破策略',
      type: 'breakout',
      riskLevel: 'high',
      timeframe: 'short',
      entryConditions: [
        {
          indicator: 'VOLUME',
          operator: '>',
          value: 0,
          description: '成交量放大'
        },
        {
          indicator: 'PRICE',
          operator: '>',
          value: 0,
          description: '價格突破阻力位'
        }
      ],
      exitConditions: [
        {
          indicator: 'VOLUME',
          operator: '<',
          value: 0,
          description: '成交量萎縮'
        }
      ],
      stopLoss: 7,
      takeProfit: 20,
      confidence: 50
    }
  ];

  /**
   * 根據分析結果生成策略建議
   */
  generateStrategies(analysis: AnalysisResult): StrategyRecommendation[] {
    try {
      logger.ai.analysis(`Generating strategies for ${analysis.market}/${analysis.symbol}`);

      const recommendations: StrategyRecommendation[] = [];
      const signals = analysis.analysis.signals;

      // 為每個適用策略生成建議
      for (const strategy of this.strategies) {
        const recommendation = this.evaluateStrategy(strategy, signals, analysis);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      // 按信心度排序
      recommendations.sort((a, b) => b.strategy.confidence - a.strategy.confidence);

      logger.ai.analysis(`Generated ${recommendations.length} strategy recommendations`);
      return recommendations;

    } catch (error) {
      logger.ai.error(`Strategy generation failed for ${analysis.market}/${analysis.symbol}`, error);
      return [];
    }
  }

  /**
   * 評估單一策略的適用性
   */
  private evaluateStrategy(
    strategy: TradingStrategy, 
    signals: Signal[], 
    analysis: AnalysisResult
  ): StrategyRecommendation | null {
    // 檢查入場條件
    const entryMatch = this.checkConditions(strategy.entryConditions, signals);
    if (!entryMatch.matched) {
      return null;
    }

    // 檢查出場條件
    const exitMatch = this.checkConditions(strategy.exitConditions, signals);
    
    // 確定當前信號
    let currentSignal: 'buy' | 'sell' | 'hold' = 'hold';
    if (entryMatch.matched && !exitMatch.matched) {
      currentSignal = strategy.type === 'mean_reversion' ? 'buy' : 'buy';
    } else if (exitMatch.matched) {
      currentSignal = 'sell';
    }

    // 計算風險報酬比
    const riskRewardRatio = strategy.takeProfit / strategy.stopLoss;

    // 生成推理說明
    const reasoning = this.generateReasoning(strategy, signals, analysis);

    return {
      strategy,
      currentSignal,
      reasoning,
      riskRewardRatio
    };
  }

  /**
   * 檢查策略條件是否滿足
   */
  private checkConditions(conditions: StrategyCondition[], signals: Signal[]): { matched: boolean; score: number } {
    let matchedConditions = 0;
    let totalConditions = conditions.length;

    for (const condition of conditions) {
      const signal = signals.find(s => s.indicator === condition.indicator);
      if (signal) {
        let conditionMet = false;
        
        switch (condition.operator) {
          case '>':
            conditionMet = signal.value > condition.value;
            break;
          case '<':
            conditionMet = signal.value < condition.value;
            break;
          case '>=':
            conditionMet = signal.value >= condition.value;
            break;
          case '<=':
            conditionMet = signal.value <= condition.value;
            break;
          case '==':
            conditionMet = Math.abs(signal.value - condition.value) < 0.01;
            break;
        }

        if (conditionMet) {
          matchedConditions++;
        }
      }
    }

    const score = totalConditions > 0 ? (matchedConditions / totalConditions) * 100 : 0;
    return {
      matched: matchedConditions >= totalConditions * 0.7, // 70% 條件滿足即認為匹配
      score
    };
  }

  /**
   * 生成策略推理說明
   */
  private generateReasoning(
    strategy: TradingStrategy, 
    signals: Signal[], 
    analysis: AnalysisResult
  ): string {
    const relevantSignals = signals.filter(s => 
      strategy.entryConditions.some(c => c.indicator === s.indicator) ||
      strategy.exitConditions.some(c => c.indicator === s.indicator)
    );

    const buySignals = relevantSignals.filter(s => s.type === 'buy').length;
    const sellSignals = relevantSignals.filter(s => s.type === 'sell').length;

    let reasoning = `${strategy.name} 適用於當前市場狀況。`;

    if (buySignals > sellSignals) {
      reasoning += ` 檢測到 ${buySignals} 個買入信號，${sellSignals} 個賣出信號，整體偏向多頭。`;
    } else if (sellSignals > buySignals) {
      reasoning += ` 檢測到 ${sellSignals} 個賣出信號，${buySignals} 個買入信號，整體偏向空頭。`;
    } else {
      reasoning += ` 買賣信號平衡，建議觀望。`;
    }

    reasoning += ` 風險報酬比為 1:${(strategy.takeProfit / strategy.stopLoss).toFixed(1)}，建議止損 ${strategy.stopLoss}%，目標獲利 ${strategy.takeProfit}%。`;

    return reasoning;
  }

  /**
   * 生成自定義策略
   */
  generateCustomStrategy(
    analysis: AnalysisResult,
    preferences: {
      riskLevel: 'low' | 'medium' | 'high';
      timeframe: 'short' | 'medium' | 'long';
      type: 'trend_following' | 'mean_reversion' | 'momentum' | 'breakout';
    }
  ): TradingStrategy {
    const signals = analysis.analysis.signals;
    const strongSignals = signals.filter(s => s.confidence > 70);

    // 根據偏好和信號生成策略
    const strategy: TradingStrategy = {
      id: `custom_${Date.now()}`,
      name: '自定義策略',
      description: '基於當前技術指標生成的個性化策略',
      type: preferences.type,
      riskLevel: preferences.riskLevel,
      timeframe: preferences.timeframe,
      entryConditions: [],
      exitConditions: [],
      stopLoss: this.calculateStopLoss(preferences.riskLevel),
      takeProfit: this.calculateTakeProfit(preferences.riskLevel, preferences.timeframe),
      confidence: this.calculateConfidence(strongSignals)
    };

    // 根據強信號生成條件
    strongSignals.forEach(signal => {
      if (signal.type === 'buy') {
        strategy.entryConditions.push({
          indicator: signal.indicator,
          operator: '>',
          value: signal.threshold,
          description: `${signal.indicator} 顯示買入信號`
        });
      } else if (signal.type === 'sell') {
        strategy.exitConditions.push({
          indicator: signal.indicator,
          operator: '<',
          value: signal.threshold,
          description: `${signal.indicator} 顯示賣出信號`
        });
      }
    });

    return strategy;
  }

  /**
   * 計算止損比例
   */
  private calculateStopLoss(riskLevel: string): number {
    switch (riskLevel) {
      case 'low': return 3;
      case 'medium': return 5;
      case 'high': return 8;
      default: return 5;
    }
  }

  /**
   * 計算目標獲利比例
   */
  private calculateTakeProfit(riskLevel: string, timeframe: string): number {
    let base = 10;
    
    switch (riskLevel) {
      case 'low': base = 8; break;
      case 'medium': base = 12; break;
      case 'high': base = 20; break;
    }

    switch (timeframe) {
      case 'short': return base * 0.8;
      case 'medium': return base;
      case 'long': return base * 1.5;
      default: return base;
    }
  }

  /**
   * 計算策略信心度
   */
  private calculateConfidence(strongSignals: Signal[]): number {
    if (strongSignals.length === 0) return 30;
    
    const avgConfidence = strongSignals.reduce((sum, s) => sum + s.confidence, 0) / strongSignals.length;
    const signalCount = Math.min(strongSignals.length, 5); // 最多考慮5個信號
    
    return Math.min(90, avgConfidence * (signalCount / 5));
  }

  /**
   * 取得所有預設策略
   */
  getAllStrategies(): TradingStrategy[] {
    return this.strategies;
  }

  /**
   * 根據類型篩選策略
   */
  getStrategiesByType(type: string): TradingStrategy[] {
    return this.strategies.filter(s => s.type === type);
  }

  /**
   * 根據風險等級篩選策略
   */
  getStrategiesByRisk(riskLevel: string): TradingStrategy[] {
    return this.strategies.filter(s => s.riskLevel === riskLevel);
  }
}
