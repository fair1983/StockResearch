import { Candle } from '@/types';

// 簡化的技術指標計算函數（與 scoring.ts 重複，實際應用中應該共用）
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

function calcMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const ema12 = calcEMA(prices, fastPeriod);
  const ema26 = calcEMA(prices, slowPeriod);
  
  const macd = [];
  const signal = [];
  const histogram = [];
  
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    macd[i] = ema12[i] - ema26[i];
  }
  
  const signalEMA = calcEMA(macd.filter(x => x !== undefined), signalPeriod);
  let signalIndex = 0;
  for (let i = slowPeriod + signalPeriod - 2; i < prices.length; i++) {
    signal[i] = signalEMA[signalIndex++];
    histogram[i] = macd[i] - signal[i];
  }
  
  return { macd, signal, histogram };
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

export function reboundSignals(candles: Candle[]) {
  const n = candles.length - 1;
  if (n < 60) return { score: 0, rules: [] as string[] };

  const close = candles.map(c => c.close);
  const vol = candles.map(c => c.volume || 0);
  const ema20 = calcEMA(close, 20);
  const rsi = calcRSI(close, 14);
  const macd = calcMACD(close, 12, 26, 9);
  const volZ = zscoreVolume(vol, 20);
  
  // 計算52週高低點
  const lookback = Math.min(252, candles.length);
  const recentPrices = close.slice(-lookback);
  const hi52 = Math.max(...recentPrices);
  const lo52 = Math.min(...recentPrices);

  const rules: string[] = [];
  
  // 1. 上穿EMA20(脫離均線下方)
  if (close[n] > ema20[n] && [...Array(10).keys()].every(k => close[n - 1 - k] < ema20[n - 1 - k])) {
    rules.push('上穿EMA20(脫離均線下方)');
  }
  
  // 2. RSI 由低反彈
  if (rsi[n] > 45 && rsi[n - 1] <= 45) {
    rules.push('RSI 由低反彈');
  }
  
  // 3. MACD 轉多
  if (macd.macd[n] > macd.signal[n] && macd.histogram[n] > macd.histogram[n - 1]) {
    rules.push('MACD 轉多');
  }
  
  // 4. 放量啟動
  if (volZ[n] > 1.5) {
    rules.push('放量啟動');
  }
  
  // 5. 接近52週低點區
  if ((close[n] - lo52) / lo52 <= 0.10) {
    rules.push('接近52週低點區');
  }
  
  // 6. 波動收斂後向上突破
  if (n >= 7) {
    const recent7 = candles.slice(-7);
    const ranges = recent7.map(c => c.high - c.low);
    const avgRange = ranges.reduce((a, b) => a + b, 0) / 7;
    const currentRange = ranges[ranges.length - 1];
    
    if (currentRange < avgRange * 0.8 && close[n] > close[n - 1]) {
      rules.push('波動收斂後向上突破');
    }
  }
  
  // 7. 連續下跌後首次收陽
  if (n >= 3) {
    const recent3 = candles.slice(-3);
    const allDown = recent3.slice(0, -1).every(c => c.close < c.open);
    const lastUp = recent3[recent3.length - 1].close > recent3[recent3.length - 1].open;
    
    if (allDown && lastUp) {
      rules.push('連續下跌後首次收陽');
    }
  }
  
  // 8. 價格站上短期均線
  const ema5 = calcEMA(close, 5);
  if (close[n] > ema5[n] && close[n - 1] <= ema5[n - 1]) {
    rules.push('價格站上短期均線');
  }

  // 計算反轉分數
  const score = Math.min(100, rules.length * 15 + (volZ[n] > 1.5 ? 10 : 0));
  
  return { score, rules };
}

export interface ReboundResult {
  symbol: string;
  market: string;
  reboundScore: number;
  rules: string[];
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
}

export function analyzeReboundStocks(
  stocks: Array<{ symbol: string; market: string; candles: Candle[]; quote?: any }>
): ReboundResult[] {
  const results: ReboundResult[] = [];
  
  for (const stock of stocks) {
    if (!stock.candles || stock.candles.length < 60) continue;
    
    const { score, rules } = reboundSignals(stock.candles);
    
    // 只返回反轉分數 >= 30 的股票
    if (score >= 30) {
      const lastCandle = stock.candles[stock.candles.length - 1];
      results.push({
        symbol: stock.symbol,
        market: stock.market,
        reboundScore: score,
        rules,
        currentPrice: stock.quote?.price || lastCandle.close,
        priceChange: stock.quote?.change || 0,
        priceChangePercent: stock.quote?.changePct || 0
      });
    }
  }
  
  // 按反轉分數降序排列
  return results.sort((a, b) => b.reboundScore - a.reboundScore);
}
