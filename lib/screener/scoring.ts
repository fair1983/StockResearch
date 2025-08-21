import { Candle } from '@/types';

export interface Fundamentals {
  pe?: number;
  ps?: number;
  margin?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  dividendYield?: number;
}

export type FactorScores = {
  trend: number;
  momentum: number;
  volume: number;
  risk: number;
  fundamental: number;
};

export type Decision = 'Buy' | 'Hold' | 'Avoid';

const WEIGHTS = {
  trend: 0.30,       // 趨勢強度：>EMA50/200、EMA斜率、ADX
  momentum: 0.25,    // 動能：RSI區間(45~70最佳)、MACD柱增加、ROC
  volume: 0.15,      // 量能：成交量Z-score、OBV斜率
  risk: 0.15,        // 風險：ATR%低、乖離不過度、缺口風險
  fundamental: 0.15, // 基本面：PE/PS/毛利/ROE/負債比（缺值時降權/插補）
};

// 簡化的技術指標計算函數
function calcEMA(prices: number[], period: number): number[] {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // 第一個EMA使用前period個收盤價的平均值
  let sum = 0;
  for (let i = 0; i < Math.min(period, prices.length); i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;
  
  // 計算後續的EMA
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

function calcRSI(prices: number[], period: number = 14): number[] {
  const rsi = [];
  const gains = [];
  const losses = [];
  
  // 計算價格變化
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  // 計算第一個RSI
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  rsi[period] = 100 - (100 / (1 + avgGain / avgLoss));
  
  // 計算後續的RSI
  for (let i = period + 1; i < prices.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    rsi[i] = 100 - (100 / (1 + avgGain / avgLoss));
  }
  
  return rsi;
}

function calcMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const ema12 = calcEMA(prices, fastPeriod);
  const ema26 = calcEMA(prices, slowPeriod);
  
  const macd = [];
  const signal = [];
  const histogram = [];
  
  // 計算MACD線
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    macd[i] = ema12[i] - ema26[i];
  }
  
  // 計算信號線
  const signalEMA = calcEMA(macd.filter(x => x !== undefined), signalPeriod);
  let signalIndex = 0;
  for (let i = slowPeriod + signalPeriod - 2; i < prices.length; i++) {
    signal[i] = signalEMA[signalIndex++];
    histogram[i] = macd[i] - signal[i];
  }
  
  return { macd, signal, histogram };
}

function calcADX(candles: Candle[], period: number = 14): number[] {
  const adx = [];
  
  // 簡化版本：使用價格變化來估算趨勢強度
  for (let i = period; i < candles.length; i++) {
    const recentCandles = candles.slice(i - period, i);
    const priceChanges = recentCandles.map(c => c.close - c.open);
    const avgChange = priceChanges.reduce((a, b) => a + Math.abs(b), 0) / period;
    const currentChange = Math.abs(candles[i].close - candles[i].open);
    
    // 簡化的ADX計算
    adx[i] = Math.min(100, (currentChange / avgChange) * 25);
  }
  
  return adx;
}

function calcATR(candles: Candle[], period: number = 14): number[] {
  const atr = [];
  
  for (let i = period; i < candles.length; i++) {
    const recentCandles = candles.slice(i - period, i);
    const trueRanges = recentCandles.map(c => {
      const highLow = c.high - c.low;
      const highClose = Math.abs(c.high - (candles[i - 1]?.close || c.close));
      const lowClose = Math.abs(c.low - (candles[i - 1]?.close || c.close));
      return Math.max(highLow, highClose, lowClose);
    });
    
    atr[i] = trueRanges.reduce((a, b) => a + b, 0) / period;
  }
  
  return atr;
}

function zscoreVolume(volumes: number[], period: number = 20): number[] {
  const zscore = [];
  
  for (let i = period; i < volumes.length; i++) {
    const recentVolumes = volumes.slice(i - period, i);
    const mean = recentVolumes.reduce((a, b) => a + b, 0) / period;
    const variance = recentVolumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    zscore[i] = stdDev > 0 ? (volumes[i] - mean) / stdDev : 0;
  }
  
  return zscore;
}

function obvSlope(candles: Candle[], period: number = 20): number {
  if (candles.length < period) return 0;
  
  const recentCandles = candles.slice(-period);
  let obv = 0;
  const obvValues = [];
  
  for (let i = 1; i < recentCandles.length; i++) {
    const currentClose = recentCandles[i].close;
    const prevClose = recentCandles[i - 1].close;
    const volume = recentCandles[i].volume || 0;
    
    if (currentClose > prevClose) {
      obv += volume;
    } else if (currentClose < prevClose) {
      obv -= volume;
    }
    
    obvValues.push(obv);
  }
  
  // 計算斜率（簡化為線性回歸）
  if (obvValues.length < 2) return 0;
  
  const n = obvValues.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = obvValues.reduce((a, b) => a + b, 0);
  const sumXY = obvValues.reduce((a, b, i) => a + (i * b), 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

function normalizeFundamentals(f: Fundamentals): number {
  // 依行業/市值範圍做標準化，這裡給簡版
  let s = 50;
  if (f.pe && f.pe > 0 && f.pe < 25) s += 10;
  if (f.margin && f.margin > 15) s += 10;
  if (f.returnOnEquity && f.returnOnEquity > 15) s += 15;
  if (f.debtToEquity && f.debtToEquity < 80) s += 10;
  if (f.dividendYield && f.dividendYield > 1) s += 5;
  return Math.min(100, Math.max(0, s));
}

export function scoreStock(
  candles: Candle[], 
  f: Fundamentals | undefined, 
  opts?: { weights?: Partial<typeof WEIGHTS> }
) {
  if (candles.length < 50) {
    return {
      total: 0,
      decision: 'Avoid' as Decision,
      scores: { trend: 0, momentum: 0, volume: 0, risk: 0, fundamental: 0 },
      signals: ['數據不足']
    };
  }

  const close = candles.map(c => c.close);
  const vol = candles.map(c => c.volume ?? 0);
  const ema20 = calcEMA(close, 20);
  const ema50 = calcEMA(close, 50);
  const ema200 = calcEMA(close, 200);
  const rsi = calcRSI(close, 14);
  const macd = calcMACD(close, 12, 26, 9);
  const adx = calcADX(candles, 14);
  const atr = calcATR(candles, 14);
  const volZ = zscoreVolume(vol, 20);
  const obvK = obvSlope(candles, 20);

  const last = close.length - 1;
  const atrp = atr[last] / (close[last] || 1) * 100;

  // 趨勢評分
  const trend = 
    (close[last] > ema50[last] ? 35 : 0) +
    (close[last] > ema200[last] ? 35 : 0) +
    (ema50[last] > ema200[last] ? 15 : 0) +
    (adx[last] >= 20 ? 15 : 0);

  // 動能評分
  const momentum = 
    (rsi[last] >= 50 && rsi[last] <= 70 ? 40 : rsi[last] > 70 ? 25 : 10) +
    (macd.histogram[last] > 0 ? 30 : 0) +
    (macd.histogram[last] > macd.histogram[last - 1] ? 30 : 0);

  // 量能評分
  const volumeScore = 
    (volZ[last] > 1.5 ? 60 : volZ[last] > 0.5 ? 40 : 20) +
    (obvK > 0 ? 40 : 20);

  // 風險評分
  const riskScore = 
    (atrp <= 4 ? 40 : atrp <= 8 ? 30 : atrp <= 12 ? 15 : 5) +
    (Math.abs((close[last] - ema20[last]) / (ema20[last] || 1) * 100) <= 8 ? 60 : 30);

  // 基本面評分
  const fundamental = f ? normalizeFundamentals(f) : 50;
  const weights = { ...WEIGHTS, ...(opts?.weights || {}) };

  // 總分計算
  const total = Math.round(
    trend * weights.trend + 
    momentum * weights.momentum + 
    volumeScore * weights.volume +
    riskScore * weights.risk + 
    fundamental * weights.fundamental
  );

  // 決策邏輯
  const decision: Decision =
    total >= 60 && atrp <= 8 && (momentum >= 50 || trend >= 60) ? 'Buy'
    : total >= 45 ? 'Hold' : 'Avoid';

  // 信號生成
  const signals: string[] = [];
  if (close[last] > ema50[last] && close[last] > ema200[last]) signals.push('多頭趨勢');
  if (rsi[last] >= 50 && rsi[last] <= 70) signals.push('RSI 中高區間');
  if (macd.histogram[last] > 0 && macd.histogram[last] > macd.histogram[last - 1]) signals.push('MACD 柱轉強');
  if (volZ[last] > 1.5) signals.push('放量上攻');
  if (atrp <= 8) signals.push('波動受控');

  return {
    total,
    decision,
    scores: { trend, momentum, volume: volumeScore, risk: riskScore, fundamental },
    signals
  };
}

export function summarizeForCard(
  symbol: string, 
  r: ReturnType<typeof scoreStock>, 
  lastClose: number
) {
  const stop = +(lastClose * 0.93).toFixed(2);    // 7% 風控示意，可換 2.5*ATR
  const target = +(lastClose * 1.15).toFixed(2);  // 15% 目標，與出場策略一致
  const confidence = Math.min(100,
    (r.scores.trend >= 60 ? 30 : 15) + 
    (r.scores.momentum >= 50 ? 30 : 10) + 
    (r.scores.risk >= 50 ? 40 : 20)
  );
  
  return {
    action: r.decision,
    score: r.total,
    confidence,
    signals: r.signals,
    reasons: [`建議停損 ${stop}`, `目標價 ${target}`],
    stop,
    target,
  };
}
