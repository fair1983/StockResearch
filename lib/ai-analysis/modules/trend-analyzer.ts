import { BaseAnalyzer, AnalysisContext, AnalysisResult } from './base-analyzer';

export class TrendAnalyzer extends BaseAnalyzer {
  constructor() {
    super(
      '趨勢分析器',
      '分析股票價格趨勢方向和強度，識別趨勢轉折點',
      1.2
    );
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { data, indicators } = context;
    
    if (!data || data.length < 20) {
      return {
        score: 50,
        confidence: 30,
        signal: 'hold',
        reasoning: '資料不足，無法進行趨勢分析'
      };
    }

    // 分析移動平均線趨勢
    const maAnalysis = this.analyzeMovingAverages(indicators);
    
    // 分析價格趨勢
    const priceAnalysis = this.analyzePriceTrend(data);
    
    // 分析趨勢強度
    const strengthAnalysis = this.analyzeTrendStrength(data, indicators);
    
    // 綜合評分
    const score = this.calculateTrendScore(maAnalysis, priceAnalysis, strengthAnalysis);
    const signal = this.determineSignal(score);
    const confidence = this.calculateConfidence(maAnalysis, priceAnalysis, strengthAnalysis);
    
    return {
      score,
      confidence,
      signal,
      reasoning: this.generateReasoning(maAnalysis, priceAnalysis, strengthAnalysis),
      metadata: {
        maAnalysis,
        priceAnalysis,
        strengthAnalysis
      }
    };
  }

  private analyzeMovingAverages(indicators: any) {
    const { ma5, ma10, ma20 } = indicators;
    if (!ma5 || !ma10 || !ma20) return { score: 50, trend: 'neutral' };

    const lastIndex = ma5.length - 1;
    if (lastIndex < 0) return { score: 50, trend: 'neutral' };

    const ma5Value = ma5[lastIndex];
    const ma10Value = ma10[lastIndex];
    const ma20Value = ma20[lastIndex];

    if (isNaN(ma5Value) || isNaN(ma10Value) || isNaN(ma20Value)) {
      return { score: 50, trend: 'neutral' };
    }

    // 多頭排列：MA5 > MA10 > MA20
    if (ma5Value > ma10Value && ma10Value > ma20Value) {
      return { score: 80, trend: 'bullish' };
    }
    
    // 空頭排列：MA5 < MA10 < MA20
    if (ma5Value < ma10Value && ma10Value < ma20Value) {
      return { score: 20, trend: 'bearish' };
    }
    
    // 混合排列
    return { score: 50, trend: 'neutral' };
  }

  private analyzePriceTrend(data: any[]) {
    if (data.length < 10) return { score: 50, trend: 'neutral' };

    const recentData = data.slice(-10);
    const closes = recentData.map(d => d.close);
    
    // 計算線性回歸斜率
    const slope = this.calculateLinearRegressionSlope(closes);
    
    if (slope > 0.5) {
      return { score: 75, trend: 'bullish' };
    } else if (slope < -0.5) {
      return { score: 25, trend: 'bearish' };
    } else {
      return { score: 50, trend: 'neutral' };
    }
  }

  private analyzeTrendStrength(data: any[], indicators: any) {
    const { atr } = indicators;
    if (!atr || atr.length < 5) return { score: 50, strength: 'medium' };

    const recentATR = atr.slice(-5);
    const avgATR = recentATR.reduce((sum: number, val: number) => sum + val, 0) / recentATR.length;
    
    // 計算價格變化率
    const recentPrices = data.slice(-5).map(d => d.close);
    const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100;
    
    const volatility = avgATR / recentPrices[0] * 100;
    
    if (Math.abs(priceChange) > 10 && volatility > 2) {
      return { score: 80, strength: 'strong' };
    } else if (Math.abs(priceChange) > 5 && volatility > 1) {
      return { score: 65, strength: 'moderate' };
    } else {
      return { score: 40, strength: 'weak' };
    }
  }

  private calculateLinearRegressionSlope(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, xVal, i) => sum + xVal * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateTrendScore(maAnalysis: any, priceAnalysis: any, strengthAnalysis: any): number {
    const maWeight = 0.4;
    const priceWeight = 0.4;
    const strengthWeight = 0.2;
    
    return (
      maAnalysis.score * maWeight +
      priceAnalysis.score * priceWeight +
      strengthAnalysis.score * strengthWeight
    );
  }

  private determineSignal(score: number): 'buy' | 'sell' | 'hold' {
    if (score >= 70) return 'buy';
    if (score <= 30) return 'sell';
    return 'hold';
  }

  private calculateConfidence(maAnalysis: any, priceAnalysis: any, strengthAnalysis: any): number {
    // 計算各分析結果的一致性
    const trends = [maAnalysis.trend, priceAnalysis.trend];
    const bullishCount = trends.filter(t => t === 'bullish').length;
    const bearishCount = trends.filter(t => t === 'bearish').length;
    
    if (bullishCount === 2) return 85;
    if (bearishCount === 2) return 85;
    if (bullishCount === 1 || bearishCount === 1) return 65;
    return 50;
  }

  private generateReasoning(maAnalysis: any, priceAnalysis: any, strengthAnalysis: any): string {
    const parts = [];
    
    if (maAnalysis.trend === 'bullish') {
      parts.push('移動平均線呈多頭排列');
    } else if (maAnalysis.trend === 'bearish') {
      parts.push('移動平均線呈空頭排列');
    }
    
    if (priceAnalysis.trend === 'bullish') {
      parts.push('價格趨勢向上');
    } else if (priceAnalysis.trend === 'bearish') {
      parts.push('價格趨勢向下');
    }
    
    parts.push(`趨勢強度${strengthAnalysis.strength}`);
    
    return `趨勢分析：${parts.join('，')}。`;
  }
}
