import { Candle } from '@/types';

export type ExitPolicy = 'TP15_SL3ATR_Trail' | 'EMA20_OR_20DAYS' | 'RSI_EXIT';

// 簡化的技術指標計算函數
function calcEMA(prices: number[], period: number): number[] {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < Math.min(period, prices.length); i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;
  
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
}

function calcRSI(prices: number[], period: number = 14): number[] {
  const rsi = [];
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  rsi[period] = 100 - (100 / (1 + avgGain / avgLoss));
  
  for (let i = period + 1; i < prices.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    rsi[i] = 100 - (100 / (1 + avgGain / avgLoss));
  }
  
  return rsi;
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

function highestClose(candles: Candle[], start: number, end: number): number {
  let highest = candles[start].close;
  for (let i = start + 1; i <= end && i < candles.length; i++) {
    if (candles[i].close > highest) {
      highest = candles[i].close;
    }
  }
  return highest;
}

function simulateExit(c: Candle[], i: number, p: ExitPolicy) {
  const entry = c[i].close;
  let trailStop = entry - 3 * (c[i].high - c[i].low); // 簡化的ATR近似
  let exitIdx = i;
  let pnl = 0;
  
  for (let k = i + 1; k < c.length; k++) {
    const px = c[k].close;
    
    if (p === 'TP15_SL3ATR_Trail') {
      // 更新追蹤停損
      const atr = calcATR(c, 14);
      const atrValue = atr[k] || (c[k].high - c[k].low);
      const highest = highestClose(c, i, k);
      trailStop = Math.max(trailStop, highest - 3 * atrValue);
      
      if (px >= entry * 1.15) { 
        exitIdx = k; 
        break; 
      }
      if (px <= trailStop) { 
        exitIdx = k; 
        break; 
      }
    } else if (p === 'EMA20_OR_20DAYS') {
      const ema20 = calcEMA(c.map(x => x.close), 20);
      if (px < ema20[k] || (k - i) >= 20) { 
        exitIdx = k; 
        break; 
      }
    } else { // RSI_EXIT
      const rsi = calcRSI(c.map(x => x.close), 14);
      if (rsi[k] >= 70 || rsi[k] <= 40) { 
        exitIdx = k; 
        break; 
      }
    }
    exitIdx = k;
  }
  
  pnl = +((c[exitIdx].close / entry - 1) * 100).toFixed(2);
  return { exitIdx, pnl, days: Math.max(1, exitIdx - i) };
}

export function backtest(candles: Candle[], entries: number[], policy: ExitPolicy) {
  const res = [];
  
  for (const e of entries) {
    if (e >= candles.length - 1) continue; // 跳過最後一個交易日
    
    const { exitIdx, pnl, days } = simulateExit(candles, e, policy);
    res.push({ entryIdx: e, exitIdx, pnl, days });
  }
  
  if (res.length === 0) {
    return {
      count: 0,
      avgReturn: 0,
      medReturn: 0,
      winRate: 0,
      avgDays: 0,
      medDays: 0,
      maxDD: 0,
      trades: []
    };
  }
  
  const pnls = res.map(r => r.pnl);
  const daysArr = res.map(r => r.days);
  const win = pnls.filter(x => x > 0).length;
  const loss = pnls.length - win;
  
  // 計算統計數據
  const avgReturn = +(pnls.reduce((a, b) => a + b, 0) / pnls.length).toFixed(2);
  const medReturn = pnls.sort((a, b) => a - b)[Math.floor(pnls.length / 2)] || 0;
  const winRate = +(win / res.length * 100).toFixed(1);
  const avgDays = Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length);
  const medDays = daysArr.sort((a, b) => a - b)[Math.floor(daysArr.length / 2)] || 0;
  
  // 計算最大回撤
  const maxDD = maxDrawdownFromTrades(pnls);
  
  return {
    count: res.length,
    avgReturn,
    medReturn,
    winRate,
    avgDays,
    medDays,
    maxDD,
    trades: res
  };
}

function maxDrawdownFromTrades(pnls: number[]): number {
  let maxDD = 0;
  let peak = 0;
  let runningTotal = 0;
  
  for (const pnl of pnls) {
    runningTotal += pnl;
    if (runningTotal > peak) {
      peak = runningTotal;
    }
    const drawdown = peak - runningTotal;
    if (drawdown > maxDD) {
      maxDD = drawdown;
    }
  }
  
  return +maxDD.toFixed(2);
}

// 輔助函數
function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  const sorted = arr.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

export interface BacktestResult {
  stats: {
    winRate: number;
    avgReturn: number;
    medReturn: number;
    avgDays: number;
    medDays: number;
    maxDD: number;
  };
  suggestedHoldDays: number;
  note: string;
}

export function generateBacktestSummary(
  symbol: string,
  policy: ExitPolicy,
  result: ReturnType<typeof backtest>
): BacktestResult {
  // 根據回測結果生成建議持有天數
  let suggestedHoldDays = result.medDays || 10;
  let note = '';
  
  if (policy === 'TP15_SL3ATR_Trail') {
    note = `依近2年歷史，建議 ${Math.max(5, suggestedHoldDays - 2)}–${suggestedHoldDays + 3} 個交易日區間動態觀察；若達 +15% 或跌破 3ATR 即出場。`;
  } else if (policy === 'EMA20_OR_20DAYS') {
    note = `依近2年歷史，建議 ${Math.max(10, suggestedHoldDays - 3)}–${Math.min(25, suggestedHoldDays + 5)} 個交易日；跌破 EMA20 或超過 20 日即出場。`;
  } else { // RSI_EXIT
    note = `依近2年歷史，建議 ${Math.max(5, suggestedHoldDays - 2)}–${suggestedHoldDays + 3} 個交易日；RSI > 70 獲利了結或 RSI < 40 防守離場。`;
  }
  
  return {
    stats: {
      winRate: result.winRate,
      avgReturn: result.avgReturn,
      medReturn: result.medReturn,
      avgDays: result.avgDays,
      medDays: result.medDays,
      maxDD: result.maxDD
    },
    suggestedHoldDays,
    note
  };
}
