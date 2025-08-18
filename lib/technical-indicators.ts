import { Candle } from '@/types';

// 移動平均線 (MA)
export function calculateMA(data: Candle[], period: number): number[] {
  const ma: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      ma.push(sum / period);
    }
  }
  
  return ma;
}

// 指數移動平均線 (EMA)
export function calculateEMA(data: Candle[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i].close);
    } else {
      const newEMA = (data[i].close * multiplier) + (ema[i - 1] * (1 - multiplier));
      ema.push(newEMA);
    }
  }
  
  return ema;
}

// MACD
export function calculateMACD(data: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const ema12 = calculateEMA(data, fastPeriod);
  const ema26 = calculateEMA(data, slowPeriod);
  
  const macdLine = ema12.map((fast, i) => fast - ema26[i]);
  const signalLine = calculateEMA(macdLine.map((value, i) => ({ close: value } as Candle)), signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

// RSI
export function calculateRSI(data: Candle[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // 計算價格變化
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // 計算RSI
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(NaN);
    } else {
      const avgGain = gains.slice(i - period, i).reduce((acc, gain) => acc + gain, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((acc, loss) => acc + loss, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return rsi;
}

// 布林通道
export function calculateBollingerBands(data: Candle[], period: number = 20, stdDev: number = 2) {
  const sma = calculateMA(data, period);
  const upperBand: number[] = [];
  const lowerBand: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upperBand.push(NaN);
      lowerBand.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((acc, candle) => acc + Math.pow(candle.close - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      upperBand.push(mean + (standardDeviation * stdDev));
      lowerBand.push(mean - (standardDeviation * stdDev));
    }
  }
  
  return {
    upper: upperBand,
    middle: sma,
    lower: lowerBand
  };
}

// KDJ
export function calculateKDJ(data: Candle[], period: number = 9) {
  const k: number[] = [];
  const d: number[] = [];
  const j: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      k.push(50);
      d.push(50);
      j.push(50);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const high = Math.max(...slice.map(candle => candle.high));
      const low = Math.min(...slice.map(candle => candle.low));
      const close = data[i].close;
      
      const rsv = ((close - low) / (high - low)) * 100;
      
      const newK = (2/3) * (k[i - 1] || 50) + (1/3) * rsv;
      const newD = (2/3) * (d[i - 1] || 50) + (1/3) * newK;
      const newJ = 3 * newK - 2 * newD;
      
      k.push(newK);
      d.push(newD);
      j.push(newJ);
    }
  }
  
  return { k, d, j };
}

// 成交量
export function calculateVolume(data: Candle[]) {
  return data.map(candle => candle.volume);
}

// 主函數：計算所有技術指標
export function calculateAllIndicators(data: Candle[]) {
  return {
    ma5: calculateMA(data, 5),
    ma10: calculateMA(data, 10),
    ma20: calculateMA(data, 20),
    ema12: calculateEMA(data, 12),
    ema26: calculateEMA(data, 26),
    macd: calculateMACD(data),
    rsi: calculateRSI(data),
    bollinger: calculateBollingerBands(data),
    kdj: calculateKDJ(data),
    volume: calculateVolume(data)
  };
}
