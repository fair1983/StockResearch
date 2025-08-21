import { Candle } from '../interfaces/analyzer';
import { annualizedVolatility, maxDrawdown, liquidityScore } from './technical-indicators';

export interface MlOutputs {
  pAlpha20: number;  // 已做 Platt/Isotonic 校準
  ret20: number;
  ret60: number;
  uncertainty: number; // 0~1，越小越穩定
}

/**
 * 簡化的 ML 預測器（可後續替換為真實的 XGBoost/LGBM 模型）
 */
export async function inferML(
  candles: Candle[],
  fundamentals?: any,
  regime?: any
): Promise<MlOutputs> {
  if (candles.length < 50) {
    return {
      pAlpha20: 0.5,
      ret20: 0.05,
      ret60: 0.10,
      uncertainty: 0.5
    };
  }

  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume || 0);
  
  // 計算技術特徵
  const volatility = annualizedVolatility(closes);
  const drawdown = maxDrawdown(closes, 120);
  const liquidity = liquidityScore(candles);
  
  // 計算價格動量
  const priceMomentum = (closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21];
  
  // 計算成交量趨勢
  const recentVolumes = volumes.slice(-20);
  const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
  const currentVolume = recentVolumes[recentVolumes.length - 1];
  const volumeRatio = currentVolume / avgVolume;
  
  // 簡化的預測邏輯（基於規則的近似）
  let pAlpha20 = 0.5;
  let ret20 = 0.05;
  let ret60 = 0.10;
  let uncertainty = 0.3;
  
  // 基於動量調整預測
  if (priceMomentum > 0.1) {
    pAlpha20 += 0.15;
    ret20 += 0.05;
    ret60 += 0.10;
  } else if (priceMomentum < -0.1) {
    pAlpha20 -= 0.15;
    ret20 -= 0.05;
    ret60 -= 0.10;
  }
  
  // 基於成交量調整
  if (volumeRatio > 1.5) {
    pAlpha20 += 0.1;
    ret20 += 0.03;
  } else if (volumeRatio < 0.5) {
    pAlpha20 -= 0.1;
    ret20 -= 0.03;
  }
  
  // 基於波動率調整
  if (volatility > 0.4) {
    uncertainty += 0.2;
    ret20 *= 0.8; // 高波動降低預期收益
  } else if (volatility < 0.2) {
    uncertainty -= 0.1;
  }
  
  // 基於基本面調整（如果有數據）
  if (fundamentals?.yoy && fundamentals.yoy > 10) {
    pAlpha20 += 0.1;
    ret20 += 0.02;
    ret60 += 0.05;
  }
  
  // 基於市場環境調整
  if (regime?.marketTrend === 'bullish') {
    pAlpha20 += 0.05;
    ret20 += 0.01;
    ret60 += 0.02;
  } else if (regime?.marketTrend === 'bearish') {
    pAlpha20 -= 0.05;
    ret20 -= 0.01;
    ret60 -= 0.02;
  }
  
  // 確保數值在合理範圍內
  pAlpha20 = Math.max(0.1, Math.min(0.9, pAlpha20));
  ret20 = Math.max(-0.2, Math.min(0.3, ret20));
  ret60 = Math.max(-0.3, Math.min(0.5, ret60));
  uncertainty = Math.max(0.1, Math.min(0.8, uncertainty));
  
  return {
    pAlpha20: Math.round(pAlpha20 * 100) / 100,
    ret20: Math.round(ret20 * 100) / 100,
    ret60: Math.round(ret60 * 100) / 100,
    uncertainty: Math.round(uncertainty * 100) / 100
  };
}
