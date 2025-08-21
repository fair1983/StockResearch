import { Candle } from '../interfaces/analyzer';
import { ema, rsi, macd, obv, adx } from './technical-indicators';

export interface TechRuleResult {
  score: number;
  support: number;
  resistance: number;
  notes: string[];
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
  volatility: number;
}

export function techRuleScore(candles: Candle[]): TechRuleResult {
  if (candles.length < 50) {
    return {
      score: 50,
      support: 0,
      resistance: 0,
      notes: ['數據不足，無法進行技術分析'],
      trend: 'neutral',
      momentum: 0,
      volatility: 0
    };
  }

  const closes = candles.map(c => c.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const rsiValues = rsi(closes, 14);
  const macdResult = macd(closes);
  const obvValues = obv(candles);
  const adxValues = adx(candles, 14);

  const last = closes.length - 1;
  const lastEma20 = ema20[ema20.length - 1];
  const lastEma50 = ema50[ema50.length - 1];
  const lastEma200 = ema200[ema200.length - 1];
  const lastRsi = rsiValues[rsiValues.length - 1];
  const lastMacd = macdResult.macd[macdResult.macd.length - 1];
  const lastHistogram = macdResult.histogram[macdResult.histogram.length - 1];
  const lastAdx = adxValues[adxValues.length - 1];

  let score = 50;
  const notes: string[] = [];

  // 趨勢一致性 (25分)
  if (lastEma20 > lastEma50 && lastEma50 > lastEma200) {
    score += 12;
    notes.push('均線多頭排列');
  } else if (lastEma20 < lastEma50 && lastEma50 < lastEma200) {
    score -= 12;
    notes.push('均線空頭排列');
  }

  // 價格位置 (10分)
  const currentPrice = closes[last];
  if (currentPrice > lastEma20) {
    score += 5;
    notes.push('價格站上20日均線');
  } else {
    score -= 5;
    notes.push('價格跌破20日均線');
  }

  // RSI 分析 (15分)
  if (lastRsi > 55 && lastRsi < 70) {
    score += 8;
    notes.push('RSI 強勢區間');
  } else if (lastRsi > 70) {
    score -= 5;
    notes.push('RSI 超買區間');
  } else if (lastRsi < 30) {
    score += 10;
    notes.push('RSI 超賣區間');
  } else if (lastRsi < 45) {
    score -= 8;
    notes.push('RSI 弱勢區間');
  }

  // MACD 分析 (15分)
  if (lastMacd > 0 && lastHistogram > 0) {
    score += 8;
    notes.push('MACD 零軸上方且柱狀圖為正');
  } else if (lastMacd < 0 && lastHistogram < 0) {
    score -= 8;
    notes.push('MACD 零軸下方且柱狀圖為負');
  } else if (lastHistogram > 0) {
    score += 4;
    notes.push('MACD 柱狀圖轉正');
  } else {
    score -= 4;
    notes.push('MACD 柱狀圖轉負');
  }

  // ADX 趨勢強度 (10分)
  if (lastAdx > 25) {
    score += 5;
    notes.push('ADX 顯示強趨勢');
  } else {
    score -= 3;
    notes.push('ADX 顯示弱趨勢');
  }

  // 成交量分析 (10分)
  const recentVolumes = candles.slice(-10).map(c => c.volume || 0);
  const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
  const currentVolume = recentVolumes[recentVolumes.length - 1];
  
  if (currentVolume > avgVolume * 1.5) {
    score += 5;
    notes.push('成交量異常放大');
  } else if (currentVolume < avgVolume * 0.5) {
    score -= 3;
    notes.push('成交量萎縮');
  }

  // OBV 趨勢 (10分)
  if (obvValues.length > 10) {
    const recentOBV = obvValues.slice(-10);
    const obvSlope = (recentOBV[recentOBV.length - 1] - recentOBV[0]) / recentOBV[0];
    
    if (obvSlope > 0.1) {
      score += 5;
      notes.push('OBV 上升趨勢');
    } else if (obvSlope < -0.1) {
      score -= 5;
      notes.push('OBV 下降趨勢');
    }
  }

  // 支撐/壓力計算
  const recent20 = candles.slice(-20);
  const support = Math.min(...recent20.map(c => c.low));
  const resistance = Math.max(...recent20.map(c => c.high));

  // 趨勢判斷
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (score >= 60) trend = 'bullish';
  else if (score <= 40) trend = 'bearish';

  // 動量計算
  const momentum = Math.abs((closes[last] - closes[last - 10]) / closes[last - 10]) * 100;

  // 波動率計算
  const volatility = Math.sqrt(
    closes.slice(-20).reduce((sum, close, i, arr) => {
      if (i === 0) return 0;
      return sum + Math.pow((close - arr[i - 1]) / arr[i - 1], 2);
    }, 0) / 19
  ) * 100;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    support: Math.round(support * 100) / 100,
    resistance: Math.round(resistance * 100) / 100,
    notes: notes.slice(0, 6), // 最多顯示6個理由
    trend,
    momentum: Math.round(momentum * 100) / 100,
    volatility: Math.round(volatility * 100) / 100
  };
}
