'use client';

import { CandlestickData } from 'lightweight-charts';
import { Candle } from '@/types';

export class DataTransformer {
  /**
   * 將 timeframe 標準化為內部格式
   */
  static normalizeTimeframe(tf: string): { norm: 'D' | 'W' | 'M', isIntraday: boolean } {
    const t = (tf || '').toLowerCase().trim();
    if (t === '1d' || t === 'd' || t === 'day') return { norm: 'D', isIntraday: false };
    if (t === '1w' || t === 'w' || t === 'week') return { norm: 'W', isIntraday: false };
    // 分鐘線：5m/15m/60m/1m...
    if (/^\d+\s*m(in)?$/.test(t) || t === '1m') return { norm: 'D', isIntraday: true };
    // 月線常見別名
    if (t === '1mo' || t === '1mon' || t === '1month' || t === '1mth' || t === '1m' || t === '1M'.toLowerCase())
      return { norm: 'M', isIntraday: false };
    if (t === 'mo' || t === 'mon' || t === 'month') return { norm: 'M', isIntraday: false };

    return { norm: 'D', isIntraday: false };
  }

  /**
   * 將資料重採樣到指定的時間粒度
   */
  static resampleToTimeframe(data: Candle[], timeframe: string): Candle[] {
    const { norm } = this.normalizeTimeframe(timeframe);
    
    // 如果是日線，直接返回原始資料
    if (norm === 'D') return data;
    
    const resampled: Candle[] = [];
    const groupedData = new Map<string, Candle[]>();
    
    // 按時間分組
    data.forEach(candle => {
      let groupKey: string;
      
      if (norm === 'W') {
        // 週線：按週分組 (YYYY-WW)
        const date = new Date(candle.time + 'T00:00:00');
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        groupKey = `${year}-W${week.toString().padStart(2, '0')}`;
      } else if (norm === 'M') {
        // 月線：按月分組 (YYYY-MM)
        const date = new Date(candle.time + 'T00:00:00');
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        groupKey = `${year}-${month}`;
      } else {
        groupKey = candle.time; // 日線
      }
      
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, []);
      }
      groupedData.get(groupKey)!.push(candle);
    });
    
    // 聚合每個時間組的資料
    groupedData.forEach((candles, groupKey) => {
      if (candles.length === 0) return;
      
      // 按時間排序
      candles.sort((a, b) => a.time.localeCompare(b.time));
      
      const firstCandle = candles[0];
      const lastCandle = candles[candles.length - 1];
      
      const resampledCandle: Candle = {
        time: firstCandle.time, // 使用該時間組的第一個時間作為代表
        open: firstCandle.open,
        high: Math.max(...candles.map(c => c.high)),
        low: Math.min(...candles.map(c => c.low)),
        close: lastCandle.close,
        volume: candles.reduce((sum, c) => sum + (c.volume || 0), 0)
      };
      
      resampled.push(resampledCandle);
    });
    
    // 按時間排序
    resampled.sort((a, b) => a.time.localeCompare(b.time));
    
    return resampled;
  }

  /**
   * 取得日期是該年的第幾週
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * 將 Candle 資料轉換為 lightweight-charts 格式
   */
  static transformCandleData(data: Candle[], timeframe: string): CandlestickData[] {
    return data.map((candle: Candle) => {
      let time: any;
      
      if (timeframe === '1d' || timeframe === '1w' || timeframe === '1M') {
        // 日K/週K/月K：將 YYYY-MM-DD 轉換為 Unix timestamp
        const date = new Date(candle.time + 'T00:00:00');
        time = Math.floor(date.getTime() / 1000);
      } else {
        // 分K：將 YYYY-MM-DD HH:MM 轉換為 Unix timestamp
        const date = new Date(candle.time);
        time = Math.floor(date.getTime() / 1000);
      }
      
      return {
        time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      };
    });
  }

  /**
   * 建立時間對索引的映射，便於十字線查詢各指標值
   */
  static createTimeToIndexMap(chartData: CandlestickData[]): Map<number, number> {
    const timeToIndex = new Map<number, number>();
    chartData.forEach((d, i) => {
      if (typeof d.time === 'number') {
        timeToIndex.set(d.time as number, i);
      }
    });
    return timeToIndex;
  }

  /**
   * 驗證資料是否有效
   */
  static validateData(data: Candle[]): boolean {
    if (!data || data.length === 0) {
      return false;
    }

    // 檢查每個資料點是否有效
    for (const candle of data) {
      if (!candle.time || 
          typeof candle.open !== 'number' || 
          typeof candle.high !== 'number' || 
          typeof candle.low !== 'number' || 
          typeof candle.close !== 'number') {
        return false;
      }
    }

    return true;
  }

  /**
   * 取得資料範圍資訊
   */
  static getDataRangeInfo(data: Candle[]): {
    startDate: string;
    endDate: string;
    totalRecords: number;
    dateRange: string;
  } {
    if (!data || data.length === 0) {
      return {
        startDate: '',
        endDate: '',
        totalRecords: 0,
        dateRange: ''
      };
    }

    const startDate = data[0].time;
    const endDate = data[data.length - 1].time;
    const totalRecords = data.length;
    const dateRange = `${startDate} 至 ${endDate}`;

    return {
      startDate,
      endDate,
      totalRecords,
      dateRange
    };
  }
}
