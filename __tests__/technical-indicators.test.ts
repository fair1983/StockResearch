import { 
  calculateMA, 
  calculateEMA, 
  calculateMACD, 
  calculateRSI, 
  calculateBollingerBands,
  calculateAllIndicators 
} from '@/lib/technical-indicators';
import { Candle } from '@/types';
import { measurePerformanceSync, clearPerformanceMetrics } from '@/lib/performance-monitor';

describe('Technical Indicators Tests', () => {
  let mockData: Candle[];

  beforeEach(() => {
    clearPerformanceMetrics();
    // 創建模擬的K線數據
    mockData = [
      { time: '2022-01-01', open: 100, high: 105, low: 98, close: 102, volume: 1000 },
      { time: '2022-01-02', open: 102, high: 108, low: 100, close: 106, volume: 1200 },
      { time: '2022-01-03', open: 106, high: 112, low: 104, close: 110, volume: 1100 },
      { time: '2022-01-04', open: 110, high: 115, low: 107, close: 113, volume: 1300 },
      { time: '2022-01-05', open: 113, high: 118, low: 110, close: 116, volume: 1400 },
      { time: '2022-01-06', open: 116, high: 120, low: 112, close: 118, volume: 1500 },
      { time: '2022-01-07', open: 118, high: 122, low: 115, close: 120, volume: 1600 },
      { time: '2022-01-08', open: 120, high: 125, low: 117, close: 123, volume: 1700 },
      { time: '2022-01-09', open: 123, high: 127, low: 120, close: 125, volume: 1800 },
      { time: '2022-01-10', open: 125, high: 130, low: 122, close: 128, volume: 1900 },
      { time: '2022-01-11', open: 128, high: 132, low: 125, close: 130, volume: 2000 },
      { time: '2022-01-12', open: 130, high: 135, low: 127, close: 133, volume: 2100 },
      { time: '2022-01-13', open: 133, high: 137, low: 130, close: 135, volume: 2200 },
      { time: '2022-01-14', open: 135, high: 140, low: 132, close: 138, volume: 2300 },
      { time: '2022-01-15', open: 138, high: 142, low: 135, close: 140, volume: 2400 }
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('移動平均線 (MA)', () => {
    test('應該能夠計算5日移動平均線', () => {
      const result = measurePerformanceSync('calculate-ma-5', () => {
        return calculateMA(mockData, 5);
      });

      expect(result).toHaveLength(mockData.length);
      
      // 前4個值應該是NaN
      for (let i = 0; i < 4; i++) {
        expect(result[i]).toBeNaN();
      }
      
      // 第5個值開始有實際計算結果
      expect(result[4]).toBeCloseTo(109.4, 1); // (102+106+110+113+116)/5
      expect(result[5]).toBeCloseTo(112.6, 1); // (106+110+113+116+118)/5
      expect(result[6]).toBeCloseTo(115.4, 1); // (110+113+116+118+120)/5
    });

    test('應該能夠處理週期大於數據長度的情況', () => {
      const shortData = mockData.slice(0, 3);
      const result = calculateMA(shortData, 5);
      
      expect(result).toHaveLength(3);
      expect(result.every(val => isNaN(val))).toBe(true);
    });

    test('應該能夠處理空數據', () => {
      const result = calculateMA([], 5);
      expect(result).toEqual([]);
    });
  });

  describe('指數移動平均線 (EMA)', () => {
    test('應該能夠計算12日EMA', () => {
      const result = measurePerformanceSync('calculate-ema-12', () => {
        return calculateEMA(mockData, 12);
      });

      expect(result).toHaveLength(mockData.length);
      
      // 第一個值應該等於第一個收盤價
      expect(result[0]).toBe(mockData[0].close);
      
      // 後續值應該有實際計算結果
      expect(result[1]).toBeGreaterThan(0);
      expect(result[result.length - 1]).toBeGreaterThan(0);
    });

    test('應該能夠處理單一數據點', () => {
      const singleData = [mockData[0]];
      const result = calculateEMA(singleData, 12);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockData[0].close);
    });
  });

  describe('MACD', () => {
    test('應該能夠計算MACD指標', () => {
      const result = measurePerformanceSync('calculate-macd', () => {
        return calculateMACD(mockData);
      });

      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('histogram');
      
      expect(result.macd).toHaveLength(mockData.length);
      expect(result.signal).toHaveLength(mockData.length);
      expect(result.histogram).toHaveLength(mockData.length);
    });

    test('應該能夠使用自定義參數計算MACD', () => {
      const result = calculateMACD(mockData, 5, 10, 3);
      
      expect(result.macd).toHaveLength(mockData.length);
      expect(result.signal).toHaveLength(mockData.length);
      expect(result.histogram).toHaveLength(mockData.length);
    });
  });

  describe('RSI', () => {
    test('應該能夠計算14日RSI', () => {
      const result = measurePerformanceSync('calculate-rsi-14', () => {
        return calculateRSI(mockData, 14);
      });

      expect(result).toHaveLength(mockData.length);
      
      // 前13個值應該是NaN
      for (let i = 0; i < 13; i++) {
        expect(result[i]).toBeNaN();
      }
      
      // 第14個值開始有實際計算結果
      // 由於我們的測試數據只有15個點，而RSI需要14個週期，所以第14個值(索引13)可能還是NaN
      // 讓我們檢查最後幾個值
      const lastValidIndex = result.findIndex(val => !isNaN(val));
      if (lastValidIndex !== -1) {
        expect(result[lastValidIndex]).toBeGreaterThanOrEqual(0);
        expect(result[lastValidIndex]).toBeLessThanOrEqual(100);
      }
      expect(result[result.length - 1]).toBeGreaterThanOrEqual(0);
      expect(result[result.length - 1]).toBeLessThanOrEqual(100);
    });

    test('應該能夠處理持續上漲的數據', () => {
      const risingData = mockData.map((candle, i) => ({
        ...candle,
        close: 100 + i * 2 // 持續上漲
      }));
      
      const result = calculateRSI(risingData, 5);
      
      // 在持續上漲的情況下，RSI應該接近100
      const lastRSI = result[result.length - 1];
      expect(lastRSI).toBeGreaterThan(80);
    });
  });

  describe('布林通道', () => {
    test('應該能夠計算布林通道', () => {
      const result = measurePerformanceSync('calculate-bollinger-bands', () => {
        return calculateBollingerBands(mockData, 20, 2);
      });

      expect(result).toHaveProperty('upper');
      expect(result).toHaveProperty('middle');
      expect(result).toHaveProperty('lower');
      
      expect(result.upper).toHaveLength(mockData.length);
      expect(result.middle).toHaveLength(mockData.length);
      expect(result.lower).toHaveLength(mockData.length);
    });

    test('應該能夠使用自定義參數計算布林通道', () => {
      const result = calculateBollingerBands(mockData, 10, 1.5);
      
      expect(result.upper).toHaveLength(mockData.length);
      expect(result.middle).toHaveLength(mockData.length);
      expect(result.lower).toHaveLength(mockData.length);
    });

    test('布林通道的上下軌應該圍繞中軌', () => {
      const result = calculateBollingerBands(mockData, 10, 2);
      
      for (let i = 9; i < result.upper.length; i++) {
        if (!isNaN(result.upper[i]) && !isNaN(result.middle[i]) && !isNaN(result.lower[i])) {
          expect(result.upper[i]).toBeGreaterThan(result.middle[i]);
          expect(result.middle[i]).toBeGreaterThan(result.lower[i]);
        }
      }
    });
  });

  describe('綜合指標計算', () => {
    test('應該能夠計算所有指標', () => {
      const result = measurePerformanceSync('calculate-all-indicators', () => {
        return calculateAllIndicators(mockData);
      });

      expect(result).toHaveProperty('ma5');
      expect(result).toHaveProperty('ma10');
      expect(result).toHaveProperty('ma20');
      expect(result).toHaveProperty('ema12');
      expect(result).toHaveProperty('ema26');
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('rsi');
      expect(result).toHaveProperty('bollinger');
      expect(result).toHaveProperty('kdj');
      expect(result).toHaveProperty('stochastic');
      expect(result).toHaveProperty('cci');
      expect(result).toHaveProperty('atr');
      expect(result).toHaveProperty('adx');
      expect(result).toHaveProperty('obv');
      expect(result).toHaveProperty('volume');
      
      // 驗證各個指標都有數據
      expect(result.ma5).toHaveLength(mockData.length);
      expect(result.ma10).toHaveLength(mockData.length);
      expect(result.ma20).toHaveLength(mockData.length);
      expect(result.ema12).toHaveLength(mockData.length);
      expect(result.ema26).toHaveLength(mockData.length);
      expect(result.macd).toHaveProperty('macd');
      expect(result.macd).toHaveProperty('signal');
      expect(result.macd).toHaveProperty('histogram');
      expect(result.rsi).toHaveLength(mockData.length);
      expect(result.bollinger).toHaveProperty('upper');
      expect(result.bollinger).toHaveProperty('middle');
      expect(result.bollinger).toHaveProperty('lower');
    });

    test('應該能夠處理邊界情況', () => {
      const shortData = mockData.slice(0, 5);
      const result = calculateAllIndicators(shortData);
      
      // 即使數據不足，也應該返回所有指標結構
      expect(result).toHaveProperty('ma5');
      expect(result).toHaveProperty('ma10');
      expect(result).toHaveProperty('ma20');
      expect(result).toHaveProperty('ema12');
      expect(result).toHaveProperty('ema26');
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('rsi');
      expect(result).toHaveProperty('bollinger');
      expect(result).toHaveProperty('kdj');
      expect(result).toHaveProperty('stochastic');
      expect(result).toHaveProperty('cci');
      expect(result).toHaveProperty('atr');
      expect(result).toHaveProperty('adx');
      expect(result).toHaveProperty('obv');
      expect(result).toHaveProperty('volume');
    });
  });

  describe('效能測試', () => {
    test('大量數據的計算效能', () => {
      // 創建大量數據
      const largeData: Candle[] = [];
      for (let i = 0; i < 1000; i++) {
        largeData.push({
          time: new Date(1640995200000 + i * 86400000).toISOString().split('T')[0],
          open: 100 + Math.random() * 20,
          high: 100 + Math.random() * 30,
          low: 100 + Math.random() * 10,
          close: 100 + Math.random() * 25,
          volume: 1000 + Math.random() * 1000
        });
      }

      const result = measurePerformanceSync('large-data-calculation', () => {
        return calculateAllIndicators(largeData);
      });

      expect(result).toBeDefined();
      expect(result.ma20).toHaveLength(largeData.length);
    });
  });

  describe('數據驗證', () => {
    test('應該能夠處理無效數據', () => {
      const invalidData = [
        { time: '2022-01-01', open: NaN, high: 105, low: 98, close: 102, volume: 1000 },
        { time: '2022-01-02', open: 102, high: Infinity, low: 100, close: 106, volume: 1200 },
        { time: '2022-01-03', open: 106, high: 112, low: -Infinity, close: 110, volume: 1100 }
      ];

      // 應該不會拋出錯誤
      expect(() => calculateMA(invalidData, 2)).not.toThrow();
      expect(() => calculateEMA(invalidData, 2)).not.toThrow();
      expect(() => calculateRSI(invalidData, 2)).not.toThrow();
    });

    test('應該能夠處理零值和負值', () => {
      const zeroData = [
        { time: '2022-01-01', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { time: '2022-01-02', open: -1, high: -1, low: -1, close: -1, volume: 0 }
      ];

      expect(() => calculateMA(zeroData, 2)).not.toThrow();
      expect(() => calculateEMA(zeroData, 2)).not.toThrow();
    });
  });
});
