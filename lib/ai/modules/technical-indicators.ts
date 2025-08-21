import { Candle } from '../interfaces/analyzer';

/**
 * 計算 EMA (Exponential Moving Average)
 */
export function ema(arr: number[], n: number): number[] {
  if (arr.length < n) return [];
  
  const multiplier = 2 / (n + 1);
  const emaValues: number[] = [];
  
  // 第一個 EMA 使用 SMA
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += arr[i];
  }
  emaValues.push(sum / n);
  
  // 計算後續的 EMA
  for (let i = n; i < arr.length; i++) {
    const newEMA = (arr[i] - emaValues[emaValues.length - 1]) * multiplier + emaValues[emaValues.length - 1];
    emaValues.push(newEMA);
  }
  
  return emaValues;
}

/**
 * 計算 RSI (Relative Strength Index)
 */
export function rsi(closes: number[], n: number = 14): number[] {
  if (closes.length < n + 1) return [];
  
  const rsiValues: number[] = [];
  
  for (let i = n; i < closes.length; i++) {
    let gains = 0;
    let losses = 0;
    
    for (let j = i - n + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / n;
    const avgLoss = losses / n;
    
    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      rsiValues.push(rsi);
    }
  }
  
  return rsiValues;
}

/**
 * 計算 MACD
 */
export function macd(closes: number[], fast: number = 12, slow: number = 26, signal: number = 9): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  
  if (emaFast.length === 0 || emaSlow.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }
  
  const macdLine: number[] = [];
  const minLength = Math.min(emaFast.length, emaSlow.length);
  
  for (let i = 0; i < minLength; i++) {
    const fastIndex = emaFast.length - minLength + i;
    const slowIndex = emaSlow.length - minLength + i;
    macdLine.push(emaFast[fastIndex] - emaSlow[slowIndex]);
  }
  
  const signalLine = ema(macdLine, signal);
  const histogram: number[] = [];
  
  for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

/**
 * 計算 OBV (On-Balance Volume)
 */
export function obv(candles: Candle[]): number[] {
  if (candles.length < 2) return [];
  
  const obvValues: number[] = [0]; // 從 0 開始，符合 TradingView 標準
  
  for (let i = 1; i < candles.length; i++) {
    const prevOBV = obvValues[i - 1];
    const currentClose = candles[i].close;
    const prevClose = candles[i - 1].close;
    const currentVolume = candles[i].volume || 0;
    
    if (currentClose > prevClose) {
      obvValues.push(prevOBV + currentVolume);
    } else if (currentClose < prevClose) {
      obvValues.push(prevOBV - currentVolume);
    } else {
      obvValues.push(prevOBV);
    }
  }
  
  return obvValues;
}

/**
 * 計算 ADX (Average Directional Index)
 */
export function adx(candles: Candle[], n: number = 14): number[] {
  if (candles.length < n + 1) return [];
  
  const adxValues: number[] = [];
  
  for (let i = n; i < candles.length; i++) {
    let plusDM = 0;
    let minusDM = 0;
    let trueRange = 0;
    
    for (let j = i - n + 1; j <= i; j++) {
      const highDiff = candles[j].high - candles[j - 1].high;
      const lowDiff = candles[j - 1].low - candles[j].low;
      
      if (highDiff > lowDiff && highDiff > 0) {
        plusDM += highDiff;
      }
      if (lowDiff > highDiff && lowDiff > 0) {
        minusDM += lowDiff;
      }
      
      const tr1 = candles[j].high - candles[j].low;
      const tr2 = Math.abs(candles[j].high - candles[j - 1].close);
      const tr3 = Math.abs(candles[j].low - candles[j - 1].close);
      trueRange += Math.max(tr1, tr2, tr3);
    }
    
    const plusDI = (plusDM / trueRange) * 100;
    const minusDI = (minusDM / trueRange) * 100;
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    
    adxValues.push(dx);
  }
  
  return adxValues;
}

/**
 * 計算年化波動率
 */
export function annualizedVolatility(closes: number[]): number {
  if (closes.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  // 年化（假設 252 個交易日）
  return volatility * Math.sqrt(252);
}

/**
 * 計算最大回檔
 */
export function maxDrawdown(closes: number[], period: number = 120): number {
  if (closes.length < period) return 0;
  
  const recentCloses = closes.slice(-period);
  let maxDrawdown = 0;
  let peak = recentCloses[0];
  
  for (let i = 1; i < recentCloses.length; i++) {
    if (recentCloses[i] > peak) {
      peak = recentCloses[i];
    } else {
      const drawdown = (peak - recentCloses[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  
  return maxDrawdown;
}

/**
 * 計算流動性分數
 */
export function liquidityScore(candles: Candle[]): number {
  if (candles.length < 20) return 50;
  
  const recentCandles = candles.slice(-20);
  const avgVolume = recentCandles.reduce((sum, c) => sum + (c.volume || 0), 0) / recentCandles.length;
  const avgPrice = recentCandles.reduce((sum, c) => sum + c.close, 0) / recentCandles.length;
  const avgValue = avgVolume * avgPrice;
  
  // 基於平均成交金額評分
  if (avgValue > 1000000000) return 90; // > 10億
  if (avgValue > 100000000) return 80;  // > 1億
  if (avgValue > 10000000) return 70;   // > 1000萬
  if (avgValue > 1000000) return 60;    // > 100萬
  if (avgValue > 100000) return 50;     // > 10萬
  if (avgValue > 10000) return 40;      // > 1萬
  return 30; // < 1萬
}
