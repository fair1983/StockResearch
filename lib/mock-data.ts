import { Candle } from '@/types';

export class MockDataService {
  public static generateMockData(symbol: string, days: number = 100): Candle[] {
    const candles: Candle[] = [];
    const basePrice = symbol === '2330' ? 600 : symbol === '2317' ? 100 : 130;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const base = basePrice + Math.random() * 50 - 25;
      const open = base + Math.random() * 10 - 5;
      const high = Math.max(open, base) + Math.random() * 15;
      const low = Math.min(open, base) - Math.random() * 15;
      const close = base + Math.random() * 10 - 5;
      const volume = Math.floor(Math.random() * 10000000) + 1000000;
      
      candles.push({
        time: date.toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: volume,
        adj_close: parseFloat(close.toFixed(2)),
      });
    }
    
    return candles;
  }

  public static getMockData(symbol: string, market: string): Candle[] {
    if (market === 'TW') {
      return this.generateMockData(symbol, 60); // 最近 60 天
    } else {
      return this.generateMockData(symbol, 100); // 最近 100 天
    }
  }
}
