import { Candle } from '../../types';

export interface StockCharacteristics {
  volatility: number;        // 波動率
  growthRate: number;        // 成長率
  dividendYield: number;     // 股息率
  marketCap: number;         // 市值
  beta: number;              // Beta值
  sector: string;            // 行業
  age: number;               // 上市年數
}

export interface StockClassification {
  type: 'growth' | 'value' | 'cyclical' | 'dividend' | 'unknown';
  confidence: number;
  characteristics: StockCharacteristics;
  reasoning: string;
}

export class StockClassifier {
  
  /**
   * 分析股票特徵
   */
  analyzeStockCharacteristics(data: Candle[]): StockCharacteristics {
    if (data.length < 50) {
      throw new Error('需要至少50個數據點進行分析');
    }

    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume || 0).filter(v => v > 0);
    
    // 計算波動率
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252);

    // 計算成長率（年化）
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const years = data.length / 252; // 假設一年252個交易日
    const growthRate = years > 0 ? Math.pow(endPrice / startPrice, 1 / years) - 1 : 0;

    // 計算Beta（相對於市場的波動）
    const beta = this.calculateBeta(returns);

    // 估算市值（基於價格和成交量）
    const avgVolume = volumes.length > 0 ? volumes.reduce((sum, v) => sum + v, 0) / volumes.length : 0;
    const avgPrice = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;
    const estimatedMarketCap = avgPrice * avgVolume * 100; // 粗略估算

    return {
      volatility,
      growthRate,
      dividendYield: 0, // 需要額外數據
      marketCap: estimatedMarketCap,
      beta,
      sector: 'unknown', // 需要額外數據
      age: years
    };
  }

  /**
   * 計算Beta值
   */
  private calculateBeta(returns: number[]): number {
    // 簡化計算，假設市場收益率為0
    const marketReturns = new Array(returns.length).fill(0.0001); // 假設市場每日0.01%收益
    
    const covariance = this.calculateCovariance(returns, marketReturns);
    const marketVariance = this.calculateVariance(marketReturns);
    
    return marketVariance > 0 ? covariance / marketVariance : 1;
  }

  /**
   * 計算協方差
   */
  private calculateCovariance(x: number[], y: number[]): number {
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      sum += (x[i] - meanX) * (y[i] - meanY);
    }
    
    return sum / x.length;
  }

  /**
   * 計算方差
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * 分類股票
   */
  classifyStock(data: Candle[], symbol: string): StockClassification {
    const characteristics = this.analyzeStockCharacteristics(data);
    
    let type: 'growth' | 'value' | 'cyclical' | 'dividend' | 'unknown' = 'unknown';
    let confidence = 0;
    let reasoning = '';

    // 成長股特徵
    if (characteristics.growthRate > 0.15 && characteristics.volatility > 0.3) {
      type = 'growth';
      confidence = Math.min(90, 60 + characteristics.growthRate * 100);
      reasoning = `高成長率(${(characteristics.growthRate * 100).toFixed(1)}%)和高波動率(${(characteristics.volatility * 100).toFixed(1)}%)`;
    }
    // 價值股特徵
    else if (characteristics.growthRate < 0.1 && characteristics.volatility < 0.25) {
      type = 'value';
      confidence = Math.min(85, 70 + (0.1 - characteristics.growthRate) * 200);
      reasoning = `低成長率(${(characteristics.growthRate * 100).toFixed(1)}%)和低波動率(${(characteristics.volatility * 100).toFixed(1)}%)`;
    }
    // 週期股特徵
    else if (characteristics.beta > 1.2 && characteristics.volatility > 0.25) {
      type = 'cyclical';
      confidence = Math.min(80, 60 + (characteristics.beta - 1) * 50);
      reasoning = `高Beta值(${characteristics.beta.toFixed(2)})和高波動率(${(characteristics.volatility * 100).toFixed(1)}%)`;
    }
    // 股息股特徵（需要股息數據）
    else if (characteristics.dividendYield > 0.03) {
      type = 'dividend';
      confidence = 75;
      reasoning = `高股息率(${(characteristics.dividendYield * 100).toFixed(1)}%)`;
    }
    // 無法確定
    else {
      type = 'unknown';
      confidence = 50;
      reasoning = '特徵不明顯，需要更多數據';
    }

    return {
      type,
      confidence,
      characteristics,
      reasoning
    };
  }

  /**
   * 根據股票類型推薦策略
   */
  recommendStrategy(classification: StockClassification) {
    const { type, confidence } = classification;
    
    switch (type) {
      case 'growth':
        return {
          strategy: 'buy_and_hold',
          confidence,
          reasoning: '成長股適合長期持有，避免頻繁交易錯失複利效應',
          parameters: {
            maxPositionSize: 0.3,
            stopLoss: 0.25, // 寬鬆止損
            takeProfit: 0.5, // 高止盈
            rsiThreshold: 85, // 提高RSI門檻
            maPeriod: 50 // 使用更長期的移動平均
          }
        };
        
      case 'value':
        return {
          strategy: 'ai_analysis',
          confidence,
          reasoning: '價值股適合我們的AI策略，技術指標較為有效',
          parameters: {
            maxPositionSize: 0.2,
            stopLoss: 0.15,
            takeProfit: 0.3,
            rsiThreshold: 70,
            maPeriod: 20
          }
        };
        
      case 'cyclical':
        return {
          strategy: 'ai_analysis',
          confidence,
          reasoning: '週期股波動較大，適合主動交易策略',
          parameters: {
            maxPositionSize: 0.15,
            stopLoss: 0.1,
            takeProfit: 0.25,
            rsiThreshold: 65,
            maPeriod: 10
          }
        };
        
      case 'dividend':
        return {
          strategy: 'dividend_focused',
          confidence,
          reasoning: '股息股適合長期持有獲取穩定收益',
          parameters: {
            maxPositionSize: 0.25,
            stopLoss: 0.2,
            takeProfit: 0.4,
            rsiThreshold: 80,
            maPeriod: 30
          }
        };
        
      default:
        return {
          strategy: 'ai_analysis',
          confidence: 50,
          reasoning: '使用默認策略，建議進一步分析',
          parameters: {
            maxPositionSize: 0.2,
            stopLoss: 0.15,
            takeProfit: 0.3,
            rsiThreshold: 70,
            maPeriod: 20
          }
        };
    }
  }
}
