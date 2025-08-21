import { BaseAnalyzer, AnalysisContext, AnalysisResult } from './base-analyzer';

export class MomentumAnalyzer extends BaseAnalyzer {
  constructor() {
    super(
      '動量分析器',
      '分析股票動量指標，識別超買超賣和動量轉折點',
      1.0
    );
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    const { indicators } = context;
    
    if (!indicators) {
      return {
        score: 50,
        confidence: 30,
        signal: 'hold',
        reasoning: '缺少技術指標資料'
      };
    }

    // 分析 RSI
    const rsiAnalysis = this.analyzeRSI(indicators);
    
    // 分析 MACD
    const macdAnalysis = this.analyzeMACD(indicators);
    
    // 分析 KDJ
    const kdjAnalysis = this.analyzeKDJ(indicators);
    
    // 分析隨機指標
    const stochasticAnalysis = this.analyzeStochastic(indicators);
    
    // 綜合評分
    const score = this.calculateMomentumScore(rsiAnalysis, macdAnalysis, kdjAnalysis, stochasticAnalysis);
    const signal = this.determineSignal(score);
    const confidence = this.calculateConfidence(rsiAnalysis, macdAnalysis, kdjAnalysis, stochasticAnalysis);
    
    return {
      score,
      confidence,
      signal,
      reasoning: this.generateReasoning(rsiAnalysis, macdAnalysis, kdjAnalysis, stochasticAnalysis),
      metadata: {
        rsiAnalysis,
        macdAnalysis,
        kdjAnalysis,
        stochasticAnalysis
      }
    };
  }

  private analyzeRSI(indicators: any) {
    const { rsi } = indicators;
    if (!rsi || rsi.length < 5) return { score: 50, signal: 'neutral', value: 0 };

    const lastRSI = rsi[rsi.length - 1];
    if (isNaN(lastRSI)) return { score: 50, signal: 'neutral', value: 0 };

    // 超賣區域
    if (lastRSI < 30) {
      return { score: 80, signal: 'buy', value: lastRSI };
    }
    
    // 超買區域
    if (lastRSI > 70) {
      return { score: 20, signal: 'sell', value: lastRSI };
    }
    
    // 正常區域
    if (lastRSI > 50) {
      return { score: 65, signal: 'buy', value: lastRSI };
    } else {
      return { score: 35, signal: 'sell', value: lastRSI };
    }
  }

  private analyzeMACD(indicators: any) {
    const { macd } = indicators;
    if (!macd || !macd.macd || !macd.signal || !macd.histogram) {
      return { score: 50, signal: 'neutral', value: 0 };
    }

    const lastIndex = macd.macd.length - 1;
    if (lastIndex < 0) return { score: 50, signal: 'neutral', value: 0 };

    const macdValue = macd.macd[lastIndex];
    const signalValue = macd.signal[lastIndex];
    const histogramValue = macd.histogram[lastIndex];

    if (isNaN(macdValue) || isNaN(signalValue)) {
      return { score: 50, signal: 'neutral', value: 0 };
    }

    // MACD 金叉且柱狀圖為正
    if (macdValue > signalValue && histogramValue > 0) {
      return { score: 75, signal: 'buy', value: macdValue };
    }
    
    // MACD 死叉且柱狀圖為負
    if (macdValue < signalValue && histogramValue < 0) {
      return { score: 25, signal: 'sell', value: macdValue };
    }
    
    // 中性
    return { score: 50, signal: 'neutral', value: macdValue };
  }

  private analyzeKDJ(indicators: any) {
    const { kdj } = indicators;
    if (!kdj || !kdj.k || !kdj.d || !kdj.j) {
      return { score: 50, signal: 'neutral', value: 0 };
    }

    const lastIndex = kdj.k.length - 1;
    if (lastIndex < 0) return { score: 50, signal: 'neutral', value: 0 };

    const kValue = kdj.k[lastIndex];
    const dValue = kdj.d[lastIndex];
    const jValue = kdj.j[lastIndex];

    if (isNaN(kValue) || isNaN(dValue)) {
      return { score: 50, signal: 'neutral', value: 0 };
    }

    // KDJ 金叉
    if (kValue > dValue && kValue < 80) {
      return { score: 70, signal: 'buy', value: kValue };
    }
    
    // KDJ 死叉
    if (kValue < dValue && kValue > 20) {
      return { score: 30, signal: 'sell', value: kValue };
    }
    
    // 超買超賣
    if (kValue > 80) {
      return { score: 20, signal: 'sell', value: kValue };
    }
    
    if (kValue < 20) {
      return { score: 80, signal: 'buy', value: kValue };
    }
    
    return { score: 50, signal: 'neutral', value: kValue };
  }

  private analyzeStochastic(indicators: any) {
    const { stochastic } = indicators;
    if (!stochastic || !stochastic.k || !stochastic.d) {
      return { score: 50, signal: 'neutral', value: 0 };
    }

    const lastIndex = stochastic.k.length - 1;
    if (lastIndex < 0) return { score: 50, signal: 'neutral', value: 0 };

    const kValue = stochastic.k[lastIndex];
    const dValue = stochastic.d[lastIndex];

    if (isNaN(kValue) || isNaN(dValue)) {
      return { score: 50, signal: 'neutral', value: 0 };
    }

    // 隨機指標金叉
    if (kValue > dValue && kValue < 80) {
      return { score: 65, signal: 'buy', value: kValue };
    }
    
    // 隨機指標死叉
    if (kValue < dValue && kValue > 20) {
      return { score: 35, signal: 'sell', value: kValue };
    }
    
    // 超買超賣
    if (kValue > 80) {
      return { score: 25, signal: 'sell', value: kValue };
    }
    
    if (kValue < 20) {
      return { score: 75, signal: 'buy', value: kValue };
    }
    
    return { score: 50, signal: 'neutral', value: kValue };
  }

  private calculateMomentumScore(rsiAnalysis: any, macdAnalysis: any, kdjAnalysis: any, stochasticAnalysis: any): number {
    const rsiWeight = 0.3;
    const macdWeight = 0.3;
    const kdjWeight = 0.2;
    const stochasticWeight = 0.2;
    
    return (
      rsiAnalysis.score * rsiWeight +
      macdAnalysis.score * macdWeight +
      kdjAnalysis.score * kdjWeight +
      stochasticAnalysis.score * stochasticWeight
    );
  }

  private determineSignal(score: number): 'buy' | 'sell' | 'hold' {
    if (score >= 65) return 'buy';
    if (score <= 35) return 'sell';
    return 'hold';
  }

  private calculateConfidence(rsiAnalysis: any, macdAnalysis: any, kdjAnalysis: any, stochasticAnalysis: any): number {
    // 計算各指標的一致性
    const signals = [rsiAnalysis.signal, macdAnalysis.signal, kdjAnalysis.signal, stochasticAnalysis.signal];
    const buyCount = signals.filter(s => s === 'buy').length;
    const sellCount = signals.filter(s => s === 'sell').length;
    
    if (buyCount >= 3) return 85;
    if (sellCount >= 3) return 85;
    if (buyCount >= 2) return 70;
    if (sellCount >= 2) return 70;
    return 50;
  }

  private generateReasoning(rsiAnalysis: any, macdAnalysis: any, kdjAnalysis: any, stochasticAnalysis: any): string {
    const parts = [];
    
    if (rsiAnalysis.signal === 'buy') {
      parts.push(`RSI(${rsiAnalysis.value.toFixed(1)}) 顯示買入信號`);
    } else if (rsiAnalysis.signal === 'sell') {
      parts.push(`RSI(${rsiAnalysis.value.toFixed(1)}) 顯示賣出信號`);
    }
    
    if (macdAnalysis.signal === 'buy') {
      parts.push('MACD 金叉');
    } else if (macdAnalysis.signal === 'sell') {
      parts.push('MACD 死叉');
    }
    
    if (kdjAnalysis.signal === 'buy') {
      parts.push(`KDJ(${kdjAnalysis.value.toFixed(1)}) 金叉`);
    } else if (kdjAnalysis.signal === 'sell') {
      parts.push(`KDJ(${kdjAnalysis.value.toFixed(1)}) 死叉`);
    }
    
    if (stochasticAnalysis.signal === 'buy') {
      parts.push(`隨機指標(${stochasticAnalysis.value.toFixed(1)}) 金叉`);
    } else if (stochasticAnalysis.signal === 'sell') {
      parts.push(`隨機指標(${stochasticAnalysis.value.toFixed(1)}) 死叉`);
    }
    
    return `動量分析：${parts.join('，')}。`;
  }
}
