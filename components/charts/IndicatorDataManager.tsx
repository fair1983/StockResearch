'use client';

import { IndicatorData } from './TechnicalIndicatorRenderer';
import { calculateAllIndicators } from '@/lib/technical-indicators';
import { logger } from '@/lib/logger';

export class IndicatorDataManager {
  /**
   * 獲取技術指標資料
   */
  static async getIndicatorData(
    market: string,
    symbol: string,
    interval: string,   // ← 已是標準化後的 'D' | 'W' | 'M'
    data: any[]
  ): Promise<IndicatorData> {
    try {
      // 嘗試從 API 獲取快取的指標資料
      const response = await fetch('/api/indicators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          market,
          symbol,
          interval,        // ← 直接用標準碼
          data,            // ← 傳重採樣後的資料
          forceRecalculate: false
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        logger.frontend.chartRender(`Indicators loaded from cache: ${result.data.cached ? 'Yes' : 'No'}`);
        return result.data.indicators;
      } else {
        // 如果 API 失敗，回退到本地計算
        logger.frontend.chartRender('Falling back to local indicators calculation');
        return this.calculateIndicatorsLocally(data);
      }
    } catch (error) {
      // 如果網路錯誤，回退到本地計算
      logger.frontend.chartRender('Network error, using local indicators calculation', error);
      return this.calculateIndicatorsLocally(data);
    }
  }

  /**
   * 本地計算技術指標
   */
  private static calculateIndicatorsLocally(data: any[]): IndicatorData {
    try {
      const indicators = calculateAllIndicators(data);
      logger.frontend.chartRender('Local indicators calculation completed');
      return indicators;
    } catch (error) {
      logger.frontend.chartRender('Local indicators calculation failed', error);
      return {};
    }
  }

  /**
   * 檢查指標資料是否有效
   */
  static validateIndicatorData(indicators: IndicatorData): boolean {
    if (!indicators) return false;

    // 檢查是否有任何指標資料
    const hasAnyData = Object.keys(indicators).some(key => {
      const value = (indicators as any)[key];
      if (Array.isArray(value)) {
        return value.length > 0 && value.some((v: any) => v !== null && v !== undefined && !isNaN(v));
      } else if (value && typeof value === 'object') {
        return Object.keys(value).some(subKey => {
          const subValue = value[subKey];
          return Array.isArray(subValue) && subValue.length > 0;
        });
      }
      return false;
    });

    return hasAnyData;
  }

  /**
   * 取得指標資料統計資訊
   */
  static getIndicatorStats(indicators: IndicatorData): {
    totalIndicators: number;
    availableIndicators: string[];
    dataPoints: number;
  } {
    const availableIndicators: string[] = [];
    let dataPoints = 0;

    // 檢查各種指標
    if (indicators.ma5 && indicators.ma5.length > 0) {
      availableIndicators.push('MA');
      dataPoints += indicators.ma5.length;
    }
    if (indicators.ema12 && indicators.ema12.length > 0) {
      availableIndicators.push('EMA');
      dataPoints += indicators.ema12.length;
    }
    if (indicators.rsi && indicators.rsi.length > 0) {
      availableIndicators.push('RSI');
      dataPoints += indicators.rsi.length;
    }
    if (indicators.macd && indicators.macd.macd && indicators.macd.macd.length > 0) {
      availableIndicators.push('MACD');
      dataPoints += indicators.macd.macd.length;
    }
    if (indicators.bollinger && indicators.bollinger.upper && indicators.bollinger.upper.length > 0) {
      availableIndicators.push('BOLL');
      dataPoints += indicators.bollinger.upper.length;
    }
    if (indicators.kdj && indicators.kdj.k && indicators.kdj.k.length > 0) {
      availableIndicators.push('KDJ');
      dataPoints += indicators.kdj.k.length;
    }
    if (indicators.stochastic && indicators.stochastic.k && indicators.stochastic.k.length > 0) {
      availableIndicators.push('STOCH');
      dataPoints += indicators.stochastic.k.length;
    }
    if (indicators.cci && indicators.cci.length > 0) {
      availableIndicators.push('CCI');
      dataPoints += indicators.cci.length;
    }
    if (indicators.atr && indicators.atr.length > 0) {
      availableIndicators.push('ATR');
      dataPoints += indicators.atr.length;
    }
    if (indicators.adx && indicators.adx.length > 0) {
      availableIndicators.push('ADX');
      dataPoints += indicators.adx.length;
    }
    if (indicators.obv && indicators.obv.length > 0) {
      availableIndicators.push('OBV');
      dataPoints += indicators.obv.length;
    }
    if (indicators.volume && indicators.volume.length > 0) {
      availableIndicators.push('VOL');
      dataPoints += indicators.volume.length;
    }

    return {
      totalIndicators: availableIndicators.length,
      availableIndicators,
      dataPoints
    };
  }
}
