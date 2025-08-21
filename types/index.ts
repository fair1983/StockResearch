export type Market = 'US' | 'TW';
export type TimeFrame = '1d' | '1w' | '1M' | '1m' | '5m' | '15m' | '30m' | '60m';

export interface Candle {
  time: string; // YYYY-MM-DD format
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  adj_close?: number;
}

export interface OHLCResponse {
  success: boolean;
  data: Candle[];
  metadata: {
    symbol: string;
    market: Market;
    timeframe: TimeFrame;
    totalRecords: number;
    earliestDate: string | null;
    latestDate: string | null;
    dataSource: string;
    executionTime: string;
  };
}

export interface ErrorResponse {
  error: string;
}

export interface AlphaVantageResponse {
  'Meta Data'?: {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)'?: {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. adjusted close': string;
      '6. volume': string;
      '7. dividend amount': string;
      '8. split coefficient': string;
    };
  };
  'Note'?: string; // Rate limit message
  'Error Message'?: string;
}

export interface TWSEStockData {
  date: string;
  volume: number;
  amount: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  transaction: number;
}

export interface StockRecommendation {
  symbol: string;
  name: string;
  market: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  recommendedStrategy: string;
  confidence: number;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  reasoning: string;
  technicalSignals: {
    trend: 'bullish' | 'bearish' | 'neutral';
    momentum: number;
    volatility: number;
    support: number;
    resistance: number;
  };
  fundamentalScore: number;
  technicalScore: number;
  overallScore: number;
  lastUpdate: string;
  isAnalyzed?: boolean;
}

// 日誌等級與類型
export type LogLevelName = 'off' | 'error' | 'warn' | 'info' | 'debug';
export type LogEntryLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogLevel {
  level: LogEntryLevel;
  timestamp: string;
  category: string;     // 保留原本 string，避免受限
  message: string;
  data?: any;
  tags?: string[];      // 例如: ['chart:init']
}

/** 共用基底（可設定等級） */
export interface LogCategoryBase {
  enabled: boolean;
  level?: LogLevelName;  // 類別預設等級（預設 info）
}

/** Frontend.chartRender 細分設定 */
export type FrontendChartRenderConfig = {
  enabled: boolean;
  level?: LogLevelName;
  init: boolean;
  indicators: boolean;
  resize: boolean;
  crosshair: boolean;
  cleanup: boolean;
  misc: boolean; // 與舊呼叫點相容（沒指定 tag 時）
};

/* === 各分類配置 === */
export interface ApiLogConfig extends LogCategoryBase {
  request: boolean;
  response: boolean;
  error: boolean;
  timing: boolean;
}

export interface YahooFinanceLogConfig extends LogCategoryBase {
  request: boolean;
  response: boolean;
  error: boolean;
  dataRange: boolean;
}

export interface FrontendLogConfig extends LogCategoryBase {
  dataFetch: boolean;
  chartRender: boolean | FrontendChartRenderConfig; // 相容 boolean
  error: boolean;
}

export interface SimpleTriLogConfig extends LogCategoryBase {
  info: boolean;
  warn: boolean;
  error: boolean;
}

export interface DataCollectionLogConfig extends LogCategoryBase {
  start: boolean;
  progress: boolean;
  complete: boolean;
  error: boolean;
  request: boolean;
  success: boolean;
  info: boolean;
}

export interface SchedulerLogConfig extends LogCategoryBase {
  info: boolean;
  warn: boolean;
  error: boolean;
  start: boolean;
  stop: boolean;
  complete: boolean;
}

export interface StockListLogConfig extends LogCategoryBase {
  info: boolean;
  warn: boolean;
  error: boolean;
}

export interface StockMetadataLogConfig extends LogCategoryBase {
  info: boolean;
  warn: boolean;
  error: boolean;
}

/** 總配置 */
export interface LogConfig {
  api: ApiLogConfig;
  yahooFinance: YahooFinanceLogConfig;
  frontend: FrontendLogConfig;
  system: { enabled: boolean; cache: boolean; performance: boolean; level?: LogLevelName };
  configuration: { enabled: boolean; info: boolean; error: boolean; level?: LogLevelName };
  ai: { enabled: boolean; analysis: boolean; error: boolean; level?: LogLevelName };
  monitor: { enabled: boolean; info: boolean; progress: boolean; complete: boolean; level?: LogLevelName };
  scheduler: SchedulerLogConfig;
  dataCollection: DataCollectionLogConfig;
  stockList: StockListLogConfig;
  stockMetadata: StockMetadataLogConfig;
}

