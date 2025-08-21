export type Market = 'US' | 'TW' | 'JP' | 'HK' | 'CN';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Fundamentals {
  pe?: number;
  ps?: number;
  peg?: number;
  margin?: number;
  yoy?: number;
  fcfMargin?: number;
  revenue?: number;
  netIncome?: number;
  debtToEquity?: number;
  returnOnEquity?: number;
  dividendYield?: number;
}

export interface Regime {
  indexAbove200: boolean;
  breadth50: number;
  vix: number;
  marketTrend: 'bullish' | 'bearish' | 'neutral';
}

export interface AnalysisInput {
  market: Market;
  symbol: string;
  candles: Candle[];            // 至少含近 400 根日K
  weekly?: Candle[];
  monthly?: Candle[];
  fundamentals?: Fundamentals;
  benchmark?: { symbol: string; candles: Candle[] }; // 如 SPY / 0050
  regime?: Regime;
}

export interface Scores {
  techRule: number;         // 0–100
  fundamental: number;      // 0–100
  relMomentum: number;      // 0–100
  pAlpha20: number;         // 0–1 (校準後)
  expectedRet20: number;    // 以日為單位 20 日預估
  expectedRet60: number;
  riskVolatility: number;   // 年化波動%
  riskDrawdown: number;     // 最近 N 日最大回檔%
  liquidityScore: number;   // 0–100
}

export interface AnalysisOutput {
  symbol: string;
  name: string;
  market: string;
  overall: number;          // 0–100
  confidence: number;       // 0–100
  expectedReturn: number;   // 以 20 日為主，%
  riskLevel: '低風險' | '中風險' | '高風險';
  supportResistance?: { support: number; resistance: number };
  decision: 'Buy' | 'Accumulate' | 'Hold' | 'Avoid' | 'Reduce';
  reasons: string[];        // 要點
  debug?: Scores;           // 方便檢視
  summary: string;          // 人類可讀摘要
  technicalSignals: {
    trend: 'bullish' | 'bearish' | 'neutral';
    momentum: number;
    volatility: number;
    support: number;
    resistance: number;
  };
  lastUpdate: string;
}
