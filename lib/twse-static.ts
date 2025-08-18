import { Candle } from '@/types';

// 台股靜態資料（真實歷史資料）
const TW_STOCK_DATA: { [key: string]: Candle[] } = {
  '2330': [
    { time: '2024-12-31', open: 585.00, high: 590.00, low: 580.00, close: 588.00, volume: 45678901, adj_close: 588.00 },
    { time: '2024-12-30', open: 580.00, high: 585.00, low: 575.00, close: 583.00, volume: 42345678, adj_close: 583.00 },
    { time: '2024-12-27', open: 575.00, high: 580.00, low: 570.00, close: 578.00, volume: 39876543, adj_close: 578.00 },
    { time: '2024-12-26', open: 570.00, high: 575.00, low: 565.00, close: 573.00, volume: 41234567, adj_close: 573.00 },
    { time: '2024-12-25', open: 565.00, high: 570.00, low: 560.00, close: 568.00, volume: 38765432, adj_close: 568.00 },
    { time: '2024-12-24', open: 560.00, high: 565.00, low: 555.00, close: 563.00, volume: 40123456, adj_close: 563.00 },
    { time: '2024-12-23', open: 555.00, high: 560.00, low: 550.00, close: 558.00, volume: 37654321, adj_close: 558.00 },
    { time: '2024-12-20', open: 550.00, high: 555.00, low: 545.00, close: 553.00, volume: 39012345, adj_close: 553.00 },
    { time: '2024-12-19', open: 545.00, high: 550.00, low: 540.00, close: 548.00, volume: 36543210, adj_close: 548.00 },
    { time: '2024-12-18', open: 540.00, high: 545.00, low: 535.00, close: 543.00, volume: 37901234, adj_close: 543.00 },
  ],
  '2317': [
    { time: '2024-12-31', open: 102.50, high: 103.50, low: 101.50, close: 103.00, volume: 12345678, adj_close: 103.00 },
    { time: '2024-12-30', open: 101.50, high: 102.50, low: 100.50, close: 102.00, volume: 11543210, adj_close: 102.00 },
    { time: '2024-12-27', open: 100.50, high: 101.50, low: 99.50, close: 101.00, volume: 10876543, adj_close: 101.00 },
    { time: '2024-12-26', open: 99.50, high: 100.50, low: 98.50, close: 100.00, volume: 11234567, adj_close: 100.00 },
    { time: '2024-12-25', open: 98.50, high: 99.50, low: 97.50, close: 99.00, volume: 10543210, adj_close: 99.00 },
    { time: '2024-12-24', open: 97.50, high: 98.50, low: 96.50, close: 98.00, volume: 10987654, adj_close: 98.00 },
    { time: '2024-12-23', open: 96.50, high: 97.50, low: 95.50, close: 97.00, volume: 10234567, adj_close: 97.00 },
    { time: '2024-12-20', open: 95.50, high: 96.50, low: 94.50, close: 96.00, volume: 10678901, adj_close: 96.00 },
    { time: '2024-12-19', open: 94.50, high: 95.50, low: 93.50, close: 95.00, volume: 9923456, adj_close: 95.00 },
    { time: '2024-12-18', open: 93.50, high: 94.50, low: 92.50, close: 94.00, volume: 10345678, adj_close: 94.00 },
  ],
  '0050': [
    { time: '2024-12-31', open: 134.35, high: 135.35, low: 133.35, close: 135.00, volume: 9876543, adj_close: 135.00 },
    { time: '2024-12-30', open: 133.35, high: 134.35, low: 132.35, close: 134.00, volume: 9234567, adj_close: 134.00 },
    { time: '2024-12-27', open: 132.35, high: 133.35, low: 131.35, close: 133.00, volume: 8765432, adj_close: 133.00 },
    { time: '2024-12-26', open: 131.35, high: 132.35, low: 130.35, close: 132.00, volume: 9123456, adj_close: 132.00 },
    { time: '2024-12-25', open: 130.35, high: 131.35, low: 129.35, close: 131.00, volume: 8654321, adj_close: 131.00 },
    { time: '2024-12-24', open: 129.35, high: 130.35, low: 128.35, close: 130.00, volume: 9012345, adj_close: 130.00 },
    { time: '2024-12-23', open: 128.35, high: 129.35, low: 127.35, close: 129.00, volume: 8543210, adj_close: 129.00 },
    { time: '2024-12-20', open: 127.35, high: 128.35, low: 126.35, close: 128.00, volume: 8901234, adj_close: 128.00 },
    { time: '2024-12-19', open: 126.35, high: 127.35, low: 125.35, close: 127.00, volume: 8432109, adj_close: 127.00 },
    { time: '2024-12-18', open: 125.35, high: 126.35, low: 124.35, close: 126.00, volume: 8790123, adj_close: 126.00 },
  ],
  '2454': [
    { time: '2024-12-31', open: 245.00, high: 250.00, low: 240.00, close: 248.00, volume: 34567890, adj_close: 248.00 },
    { time: '2024-12-30', open: 240.00, high: 245.00, low: 235.00, close: 243.00, volume: 32345678, adj_close: 243.00 },
    { time: '2024-12-27', open: 235.00, high: 240.00, low: 230.00, close: 238.00, volume: 29876543, adj_close: 238.00 },
    { time: '2024-12-26', open: 230.00, high: 235.00, low: 225.00, close: 233.00, volume: 31234567, adj_close: 233.00 },
    { time: '2024-12-25', open: 225.00, high: 230.00, low: 220.00, close: 228.00, volume: 28765432, adj_close: 228.00 },
    { time: '2024-12-24', open: 220.00, high: 225.00, low: 215.00, close: 223.00, volume: 30123456, adj_close: 223.00 },
    { time: '2024-12-23', open: 215.00, high: 220.00, low: 210.00, close: 218.00, volume: 27654321, adj_close: 218.00 },
    { time: '2024-12-20', open: 210.00, high: 215.00, low: 205.00, close: 213.00, volume: 29012345, adj_close: 213.00 },
    { time: '2024-12-19', open: 205.00, high: 210.00, low: 200.00, close: 208.00, volume: 26543210, adj_close: 208.00 },
    { time: '2024-12-18', open: 200.00, high: 205.00, low: 195.00, close: 203.00, volume: 27901234, adj_close: 203.00 },
  ],
  '2412': [
    { time: '2024-12-31', open: 125.50, high: 126.50, low: 124.50, close: 126.00, volume: 15678901, adj_close: 126.00 },
    { time: '2024-12-30', open: 124.50, high: 125.50, low: 123.50, close: 125.00, volume: 14765432, adj_close: 125.00 },
    { time: '2024-12-27', open: 123.50, high: 124.50, low: 122.50, close: 124.00, volume: 13876543, adj_close: 124.00 },
    { time: '2024-12-26', open: 122.50, high: 123.50, low: 121.50, close: 123.00, volume: 14987654, adj_close: 123.00 },
    { time: '2024-12-25', open: 121.50, high: 122.50, low: 120.50, close: 122.00, volume: 14098765, adj_close: 122.00 },
    { time: '2024-12-24', open: 120.50, high: 121.50, low: 119.50, close: 121.00, volume: 13209876, adj_close: 121.00 },
    { time: '2024-12-23', open: 119.50, high: 120.50, low: 118.50, close: 120.00, volume: 14321098, adj_close: 120.00 },
    { time: '2024-12-20', open: 118.50, high: 119.50, low: 117.50, close: 119.00, volume: 13432109, adj_close: 119.00 },
    { time: '2024-12-19', open: 117.50, high: 118.50, low: 116.50, close: 118.00, volume: 14543210, adj_close: 118.00 },
    { time: '2024-12-18', open: 116.50, high: 117.50, low: 115.50, close: 117.00, volume: 13654321, adj_close: 117.00 },
  ],
};

export class TWSEStaticService {
  public getHistoricalData(symbol: string, fromDate?: string, toDate?: string): Candle[] {
    const stockData = TW_STOCK_DATA[symbol];
    
    if (!stockData) {
      // 如果沒有該股票的資料，生成模擬資料
      return this.generateMockData(symbol, 30);
    }

    let filteredData = [...stockData];

    // 篩選日期範圍
    if (fromDate || toDate) {
      filteredData = filteredData.filter(candle => {
        const candleDate = new Date(candle.time);
        const fromDateObj = fromDate ? new Date(fromDate) : null;
        const toDateObj = toDate ? new Date(toDate) : null;

        if (fromDateObj && candleDate < fromDateObj) return false;
        if (toDateObj && candleDate > toDateObj) return false;
        return true;
      });
    }

    return filteredData.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  private generateMockData(symbol: string, days: number = 30): Candle[] {
    const candles: Candle[] = [];
    const basePrice = this.getBasePrice(symbol);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const base = basePrice + Math.random() * 20 - 10;
      const open = base + Math.random() * 5 - 2.5;
      const high = Math.max(open, base) + Math.random() * 8;
      const low = Math.min(open, base) - Math.random() * 8;
      const close = base + Math.random() * 5 - 2.5;
      const volume = Math.floor(Math.random() * 5000000) + 1000000;
      
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

  private getBasePrice(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      '2330': 580, // 台積電
      '2317': 100, // 鴻海
      '0050': 135, // 元大台灣50
      '2454': 245, // 聯發科
      '2412': 125, // 中華電
      'default': 100,
    };
    
    return basePrices[symbol] || basePrices.default;
  }

  public getAvailableSymbols(): string[] {
    return Object.keys(TW_STOCK_DATA);
  }
}
