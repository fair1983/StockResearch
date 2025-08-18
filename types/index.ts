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

// 日誌配置類型
export interface LogConfig {
  // API 相關日誌
  api: {
    enabled: boolean;
    request: boolean;
    response: boolean;
    error: boolean;
    timing: boolean;
  };
  // Yahoo Finance 相關日誌
  yahooFinance: {
    enabled: boolean;
    request: boolean;
    response: boolean;
    error: boolean;
    dataRange: boolean;
  };
  // 前端相關日誌
  frontend: {
    enabled: boolean;
    dataFetch: boolean;
    chartRender: boolean;
    error: boolean;
  };
  // 系統相關日誌
  system: {
    enabled: boolean;
    cache: boolean;
    performance: boolean;
  };
}

export interface LogLevel {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: string;
  category: string;
  message: string;
  data?: any;
}
