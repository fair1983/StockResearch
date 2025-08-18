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

// 隨機指標 (Stochastic Oscillator)
export function calculateStochastic(data: Candle[], kPeriod: number = 14, dPeriod: number = 3) {
  const k: number[] = [];
  const d: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      k.push(NaN);
      d.push(NaN);
    } else {
      const slice = data.slice(i - kPeriod + 1, i + 1);
      const high = Math.max(...slice.map(candle => candle.high));
      const low = Math.min(...slice.map(candle => candle.low));
      const close = data[i].close;
      
      const kValue = ((close - low) / (high - low)) * 100;
      k.push(kValue);
      
      // 計算 %D (K的移動平均)
      if (i >= kPeriod + dPeriod - 2) {
        const kSlice = k.slice(i - dPeriod + 1, i + 1);
        const dValue = kSlice.reduce((acc, val) => acc + val, 0) / dPeriod;
        d.push(dValue);
      } else {
        d.push(NaN);
      }
    }
  }
  
  return { k, d };
}

// CCI (Commodity Channel Index)
export function calculateCCI(data: Candle[], period: number = 20): number[] {
  const cci: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      cci.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const typicalPrices = slice.map(candle => (candle.high + candle.low + candle.close) / 3);
      const sma = typicalPrices.reduce((acc, price) => acc + price, 0) / period;
      
      const meanDeviation = typicalPrices.reduce((acc, price) => acc + Math.abs(price - sma), 0) / period;
      
      const currentTypicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      cci.push(meanDeviation !== 0 ? (currentTypicalPrice - sma) / (0.015 * meanDeviation) : 0);
    }
  }
  
  return cci;
}

// ATR (Average True Range)
export function calculateATR(data: Candle[], period: number = 14): number[] {
  const atr: number[] = [];
  const trueRanges: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trueRanges.push(data[i].high - data[i].low);
      atr.push(trueRanges[0]);
    } else {
      const highLow = data[i].high - data[i].low;
      const highPrevClose = Math.abs(data[i].high - data[i - 1].close);
      const lowPrevClose = Math.abs(data[i].low - data[i - 1].close);
      
      const trueRange = Math.max(highLow, highPrevClose, lowPrevClose);
      trueRanges.push(trueRange);
      
      if (i < period) {
        const avgTR = trueRanges.slice(0, i + 1).reduce((acc, tr) => acc + tr, 0) / (i + 1);
        atr.push(avgTR);
      } else {
        const prevATR = atr[i - 1];
        const newATR = ((prevATR * (period - 1)) + trueRange) / period;
        atr.push(newATR);
      }
    }
  }
  
  return atr;
}

// ADX (Average Directional Index)
export function calculateADX(data: Candle[], period: number = 14) {
  const adx: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  
  // 計算 TR 和 DM
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
      plusDM.push(0);
      minusDM.push(0);
    } else {
      const highDiff = data[i].high - data[i - 1].high;
      const lowDiff = data[i - 1].low - data[i].low;
      
      const trueRange = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      tr.push(trueRange);
      
      if (highDiff > lowDiff && highDiff > 0) {
        plusDM.push(highDiff);
      } else {
        plusDM.push(0);
      }
      
      if (lowDiff > highDiff && lowDiff > 0) {
        minusDM.push(lowDiff);
      } else {
        minusDM.push(0);
      }
    }
  }
  
  // 計算 ADX
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      adx.push(NaN);
    } else {
      const trSum = tr.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
      const plusDMSum = plusDM.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
      const minusDMSum = minusDM.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
      
      const plusDI = (plusDMSum / trSum) * 100;
      const minusDI = (minusDMSum / trSum) * 100;
      
      const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
      adx.push(dx);
    }
  }
  
  return adx;
}

// OBV (On Balance Volume)
export function calculateOBV(data: Candle[]): number[] {
  const obv: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      obv.push(data[i].volume);
    } else {
      const prevOBV = obv[i - 1];
      const currentClose = data[i].close;
      const prevClose = data[i - 1].close;
      const currentVolume = data[i].volume;
      
      if (currentClose > prevClose) {
        obv.push(prevOBV + currentVolume);
      } else if (currentClose < prevClose) {
        obv.push(prevOBV - currentVolume);
      } else {
        obv.push(prevOBV);
      }
    }
  }
  
  return obv;
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
    stochastic: calculateStochastic(data),
    cci: calculateCCI(data),
    atr: calculateATR(data),
    adx: calculateADX(data),
    obv: calculateOBV(data),
    volume: calculateVolume(data)
  };
}
