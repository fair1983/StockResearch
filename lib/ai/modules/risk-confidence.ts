import { annualizedVolatility, maxDrawdown, liquidityScore } from './technical-indicators';
import { Candle } from '../interfaces/analyzer';

/**
 * 計算風險等級
 */
export function calculateRiskLevel(
  candles: Candle[],
  volatility?: number,
  drawdown?: number,
  liquidity?: number
): '低風險' | '中風險' | '高風險' {
  if (candles.length < 20) return '中風險';
  
  const vol = volatility || annualizedVolatility(candles.map(c => c.close));
  const dd = drawdown || maxDrawdown(candles.map(c => c.close), 120);
  const liq = liquidity || liquidityScore(candles);
  
  // 風險評分系統
  let riskScore = 0;
  
  // 波動率評分 (40%)
  if (vol < 0.25) riskScore += 40;
  else if (vol < 0.35) riskScore += 30;
  else if (vol < 0.45) riskScore += 20;
  else riskScore += 10;
  
  // 最大回檔評分 (30%)
  if (dd < 0.15) riskScore += 30;
  else if (dd < 0.25) riskScore += 20;
  else if (dd < 0.35) riskScore += 10;
  else riskScore += 0;
  
  // 流動性評分 (30%)
  if (liq > 80) riskScore += 30;
  else if (liq > 60) riskScore += 20;
  else if (liq > 40) riskScore += 10;
  else riskScore += 0;
  
  // 根據總分判斷風險等級
  if (riskScore >= 80) return '低風險';
  if (riskScore >= 50) return '中風險';
  return '高風險';
}

/**
 * 計算信心度
 */
export function calculateConfidence(
  mlUncertainty: number,
  featureCoverage: number = 0.9,
  regimeStable: boolean = true,
  dataQuality: number = 0.8
): number {
  // 基礎信心度
  let confidence = 70;
  
  // ML 不確定度影響 (40%)
  confidence -= 40 * mlUncertainty;
  
  // 特徵覆蓋度影響 (20%)
  confidence += 20 * featureCoverage;
  
  // 市場環境穩定性影響 (15%)
  if (regimeStable) {
    confidence += 15;
  } else {
    confidence -= 10;
  }
  
  // 數據質量影響 (25%)
  confidence += 25 * dataQuality;
  
  // 確保在合理範圍內
  return Math.max(10, Math.min(95, Math.round(confidence)));
}

/**
 * 計算相對動量分數
 */
export function calculateRelativeMomentum(
  candles: Candle[],
  benchmarkCandles?: Candle[]
): number {
  if (candles.length < 60) return 50;
  
  const stockReturns = (candles[candles.length - 1].close - candles[candles.length - 61].close) / candles[candles.length - 61].close;
  
  if (!benchmarkCandles || benchmarkCandles.length < 60) {
    // 沒有基準數據，基於絕對動量評分
    if (stockReturns > 0.2) return 80;
    if (stockReturns > 0.1) return 70;
    if (stockReturns > 0.05) return 60;
    if (stockReturns > 0) return 55;
    if (stockReturns > -0.05) return 45;
    if (stockReturns > -0.1) return 40;
    return 30;
  }
  
  const benchmarkReturns = (benchmarkCandles[benchmarkCandles.length - 1].close - benchmarkCandles[benchmarkCandles.length - 61].close) / benchmarkCandles[benchmarkCandles.length - 61].close;
  const relativeReturn = stockReturns - benchmarkReturns;
  
  // 基於相對表現評分
  if (relativeReturn > 0.1) return 90;
  if (relativeReturn > 0.05) return 80;
  if (relativeReturn > 0.02) return 70;
  if (relativeReturn > 0) return 60;
  if (relativeReturn > -0.02) return 50;
  if (relativeReturn > -0.05) return 40;
  if (relativeReturn > -0.1) return 30;
  return 20;
}
