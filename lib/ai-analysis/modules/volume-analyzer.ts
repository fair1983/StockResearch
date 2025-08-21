import { BaseAnalyzer, AnalysisContext, AnalysisResult } from './base-analyzer';

export class VolumeAnalyzer extends BaseAnalyzer {
  constructor() {
    super(
      '成交量分析器',
      '分析成交量變化，識別資金流向和市場情緒',
      0.8
    );
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { data, indicators } = context;
    
    if (!data || data.length < 20) {
      return {
        score: 50,
        confidence: 30,
        signal: 'hold',
        reasoning: '資料不足，無法進行成交量分析'
      };
    }

    // 分析成交量趨勢
    const volumeTrendAnalysis = this.analyzeVolumeTrend(data);
    
    // 分析價量關係
    const priceVolumeAnalysis = this.analyzePriceVolumeRelationship(data);
    
    // 分析 OBV
    const obvAnalysis = this.analyzeOBV(indicators);
    
    // 分析成交量異常
    const volumeAnomalyAnalysis = this.analyzeVolumeAnomalies(data);
    
    // 綜合評分
    const score = this.calculateVolumeScore(volumeTrendAnalysis, priceVolumeAnalysis, obvAnalysis, volumeAnomalyAnalysis);
    const signal = this.determineSignal(score);
    const confidence = this.calculateConfidence(volumeTrendAnalysis, priceVolumeAnalysis, obvAnalysis, volumeAnomalyAnalysis);
    
    return {
      score,
      confidence,
      signal,
      reasoning: this.generateReasoning(volumeTrendAnalysis, priceVolumeAnalysis, obvAnalysis, volumeAnomalyAnalysis),
      metadata: {
        volumeTrendAnalysis,
        priceVolumeAnalysis,
        obvAnalysis,
        volumeAnomalyAnalysis
      }
    };
  }

  private analyzeVolumeTrend(data: any[]) {
    if (data.length < 10) return { score: 50, trend: 'neutral' };

    const recentData = data.slice(-10);
    const volumes = recentData.map(d => d.volume);
    
    // 計算成交量變化率
    const volumeChange = (volumes[volumes.length - 1] - volumes[0]) / volumes[0] * 100;
    
    // 計算成交量移動平均
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;
    
    if (volumeChange > 20 && volumeRatio > 1.5) {
      return { score: 75, trend: 'increasing' };
    } else if (volumeChange < -20 && volumeRatio < 0.7) {
      return { score: 25, trend: 'decreasing' };
    } else {
      return { score: 50, trend: 'stable' };
    }
  }

  private analyzePriceVolumeRelationship(data: any[]) {
    if (data.length < 5) return { score: 50, relationship: 'neutral' };

    const recentData = data.slice(-5);
    let priceUpVolumeUp = 0;
    let priceUpVolumeDown = 0;
    let priceDownVolumeUp = 0;
    let priceDownVolumeDown = 0;

    for (let i = 1; i < recentData.length; i++) {
      const priceChange = recentData[i].close - recentData[i - 1].close;
      const volumeChange = recentData[i].volume - recentData[i - 1].volume;
      
      if (priceChange > 0 && volumeChange > 0) {
        priceUpVolumeUp++;
      } else if (priceChange > 0 && volumeChange < 0) {
        priceUpVolumeDown++;
      } else if (priceChange < 0 && volumeChange > 0) {
        priceDownVolumeUp++;
      } else if (priceChange < 0 && volumeChange < 0) {
        priceDownVolumeDown++;
      }
    }

    const total = recentData.length - 1;
    
    // 價量配合：價漲量增或價跌量縮
    if (priceUpVolumeUp / total > 0.6) {
      return { score: 80, relationship: 'positive' };
    } else if (priceDownVolumeDown / total > 0.6) {
      return { score: 20, relationship: 'negative' };
    } else if (priceUpVolumeDown / total > 0.4 || priceDownVolumeUp / total > 0.4) {
      return { score: 30, relationship: 'divergent' };
    } else {
      return { score: 50, relationship: 'neutral' };
    }
  }

  private analyzeOBV(indicators: any) {
    const { obv } = indicators;
    if (!obv || obv.length < 10) return { score: 50, trend: 'neutral' };

    const recentOBV = obv.slice(-10);
    const obvChange = (recentOBV[recentOBV.length - 1] - recentOBV[0]) / Math.abs(recentOBV[0]) * 100;
    
    // 計算 OBV 趨勢
    const obvSlope = this.calculateLinearRegressionSlope(recentOBV);
    
    if (obvChange > 5 && obvSlope > 0) {
      return { score: 75, trend: 'bullish' };
    } else if (obvChange < -5 && obvSlope < 0) {
      return { score: 25, trend: 'bearish' };
    } else {
      return { score: 50, trend: 'neutral' };
    }
  }

  private analyzeVolumeAnomalies(data: any[]) {
    if (data.length < 20) return { score: 50, anomaly: 'none' };

    const volumes = data.map(d => d.volume);
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const stdVolume = Math.sqrt(volumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / volumes.length);
    
    const recentVolumes = volumes.slice(-5);
    const currentVolume = recentVolumes[recentVolumes.length - 1];
    const volumeZScore = (currentVolume - avgVolume) / stdVolume;
    
    // 成交量異常放大
    if (volumeZScore > 2) {
      return { score: 70, anomaly: 'high_volume' };
    }
    
    // 成交量異常萎縮
    if (volumeZScore < -2) {
      return { score: 30, anomaly: 'low_volume' };
    }
    
    return { score: 50, anomaly: 'normal' };
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

  private calculateVolumeScore(volumeTrendAnalysis: any, priceVolumeAnalysis: any, obvAnalysis: any, volumeAnomalyAnalysis: any): number {
    const trendWeight = 0.3;
    const priceVolumeWeight = 0.3;
    const obvWeight = 0.2;
    const anomalyWeight = 0.2;
    
    return (
      volumeTrendAnalysis.score * trendWeight +
      priceVolumeAnalysis.score * priceVolumeWeight +
      obvAnalysis.score * obvWeight +
      volumeAnomalyAnalysis.score * anomalyWeight
    );
  }

  private determineSignal(score: number): 'buy' | 'sell' | 'hold' {
    if (score >= 65) return 'buy';
    if (score <= 35) return 'sell';
    return 'hold';
  }

  private calculateConfidence(volumeTrendAnalysis: any, priceVolumeAnalysis: any, obvAnalysis: any, volumeAnomalyAnalysis: any): number {
    // 計算各分析結果的一致性
    const bullishSignals = [];
    const bearishSignals = [];
    
    if (volumeTrendAnalysis.trend === 'increasing') bullishSignals.push('volume_trend');
    if (volumeTrendAnalysis.trend === 'decreasing') bearishSignals.push('volume_trend');
    
    if (priceVolumeAnalysis.relationship === 'positive') bullishSignals.push('price_volume');
    if (priceVolumeAnalysis.relationship === 'negative') bearishSignals.push('price_volume');
    
    if (obvAnalysis.trend === 'bullish') bullishSignals.push('obv');
    if (obvAnalysis.trend === 'bearish') bearishSignals.push('obv');
    
    if (volumeAnomalyAnalysis.anomaly === 'high_volume') bullishSignals.push('volume_anomaly');
    if (volumeAnomalyAnalysis.anomaly === 'low_volume') bearishSignals.push('volume_anomaly');
    
    if (bullishSignals.length >= 3) return 85;
    if (bearishSignals.length >= 3) return 85;
    if (bullishSignals.length >= 2) return 70;
    if (bearishSignals.length >= 2) return 70;
    return 50;
  }

  private generateReasoning(volumeTrendAnalysis: any, priceVolumeAnalysis: any, obvAnalysis: any, volumeAnomalyAnalysis: any): string {
    const parts = [];
    
    if (volumeTrendAnalysis.trend === 'increasing') {
      parts.push('成交量趨勢向上');
    } else if (volumeTrendAnalysis.trend === 'decreasing') {
      parts.push('成交量趨勢向下');
    }
    
    if (priceVolumeAnalysis.relationship === 'positive') {
      parts.push('價量配合良好');
    } else if (priceVolumeAnalysis.relationship === 'negative') {
      parts.push('價量背離');
    }
    
    if (obvAnalysis.trend === 'bullish') {
      parts.push('OBV 上升，資金流入');
    } else if (obvAnalysis.trend === 'bearish') {
      parts.push('OBV 下降，資金流出');
    }
    
    if (volumeAnomalyAnalysis.anomaly === 'high_volume') {
      parts.push('成交量異常放大');
    } else if (volumeAnomalyAnalysis.anomaly === 'low_volume') {
      parts.push('成交量異常萎縮');
    }
    
    return `成交量分析：${parts.join('，')}。`;
  }
}
