import { Candle } from '@/types';

export interface AnalysisContext {
  market: string;
  symbol: string;
  interval: string;
  data: Candle[];
  indicators: any;
  timestamp: string;
}

export interface AnalysisResult {
  score: number; // 0-100 分數
  confidence: number; // 0-100 信心度
  signal: 'buy' | 'sell' | 'hold';
  reasoning: string;
  metadata?: any;
}

export abstract class BaseAnalyzer {
  protected name: string;
  protected description: string;
  protected weight: number; // 權重，用於綜合評分

  constructor(name: string, description: string, weight: number = 1.0) {
    this.name = name;
    this.description = description;
    this.weight = weight;
  }

  /**
   * 執行分析
   */
  abstract analyze(context: AnalysisContext): Promise<AnalysisResult>;

  /**
   * 取得分析器資訊
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description,
      weight: this.weight
    };
  }

  /**
   * 計算加權分數
   */
  getWeightedScore(result: AnalysisResult): number {
    return result.score * this.weight;
  }

  /**
   * 驗證分析結果
   */
  protected validateResult(result: AnalysisResult): boolean {
    return (
      result.score >= 0 && result.score <= 100 &&
      result.confidence >= 0 && result.confidence <= 100 &&
      ['buy', 'sell', 'hold'].includes(result.signal) &&
      typeof result.reasoning === 'string'
    );
  }
}
