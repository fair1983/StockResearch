import { MomentumAnalyzer } from '@/lib/ai-analysis/modules/momentum-analyzer';
import { AnalysisContext } from '@/lib/ai-analysis/modules/base-analyzer';

describe('MomentumAnalyzer (簡化版)', () => {
  let analyzer: MomentumAnalyzer;

  beforeEach(() => {
    analyzer = new MomentumAnalyzer();
  });

  describe('基本功能測試', () => {
    it('應該正確初始化動量分析器', () => {
      const info = analyzer.getInfo();
      expect(info.name).toBe('動量分析器');
      expect(info.description).toContain('動量');
      expect(info.weight).toBe(1.0);
    });

    it('應該能夠執行完整的動量分析', async () => {
      const mockContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          rsi: 65,
          macd: {
            macd: 2.5,
            signal: 2.0,
            histogram: 0.5
          },
          kdj: {
            k: 70,
            d: 65,
            j: 80
          },
          stoch: {
            k: 75,
            d: 70
          }
        },
        timestamp: new Date().toISOString()
      };

      const result = await analyzer.analyze(mockContext);
      
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
      expect(result.reasoning).toBeTruthy();
    });
  });

  describe('RSI 分析測試', () => {
    it('應該處理超買 RSI 情況', async () => {
      const overboughtContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          rsi: 85, // 超買
          macd: { macd: 2.5, signal: 2.0, histogram: 0.5 },
          kdj: { k: 70, d: 65, j: 80 },
          stoch: { k: 75, d: 70 }
        },
        timestamp: new Date().toISOString()
      };

      const result = await analyzer.analyze(overboughtContext);
      
      expect(result).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('應該處理超賣 RSI 情況', async () => {
      const oversoldContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          rsi: 25, // 超賣
          macd: { macd: 2.5, signal: 2.0, histogram: 0.5 },
          kdj: { k: 70, d: 65, j: 80 },
          stoch: { k: 75, d: 70 }
        },
        timestamp: new Date().toISOString()
      };

      const result = await analyzer.analyze(oversoldContext);
      
      expect(result).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('MACD 分析測試', () => {
    it('應該處理 MACD 金叉情況', async () => {
      const goldenCrossContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          rsi: 65,
          macd: {
            macd: 3.0,
            signal: 2.5,
            histogram: 0.5 // 正值，表示金叉
          },
          kdj: { k: 70, d: 65, j: 80 },
          stoch: { k: 75, d: 70 }
        },
        timestamp: new Date().toISOString()
      };

      const result = await analyzer.analyze(goldenCrossContext);
      
      expect(result).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('應該處理 MACD 死叉情況', async () => {
      const deathCrossContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          rsi: 65,
          macd: {
            macd: 2.0,
            signal: 2.5,
            histogram: -0.5 // 負值，表示死叉
          },
          kdj: { k: 70, d: 65, j: 80 },
          stoch: { k: 75, d: 70 }
        },
        timestamp: new Date().toISOString()
      };

      const result = await analyzer.analyze(deathCrossContext);
      
      expect(result).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('指標缺失處理測試', () => {
    it('應該處理缺少 RSI 指標的情況', async () => {
      const missingRSIContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          macd: { macd: 2.5, signal: 2.0, histogram: 0.5 },
          kdj: { k: 70, d: 65, j: 80 },
          stoch: { k: 75, d: 70 }
          // 缺少 RSI
        },
        timestamp: new Date().toISOString()
      };

      const result = await analyzer.analyze(missingRSIContext);
      
      expect(result).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
    });

    it('應該處理缺少 MACD 指標的情況', async () => {
      const missingMACDContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          rsi: 65,
          kdj: { k: 70, d: 65, j: 80 },
          stoch: { k: 75, d: 70 }
          // 缺少 MACD
        },
        timestamp: new Date().toISOString()
      };

      const result = await analyzer.analyze(missingMACDContext);
      
      expect(result).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內完成分析', async () => {
      const mockContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          rsi: 65,
          macd: { macd: 2.5, signal: 2.0, histogram: 0.5 },
          kdj: { k: 70, d: 65, j: 80 },
          stoch: { k: 75, d: 70 }
        },
        timestamp: new Date().toISOString()
      };

      const startTime = Date.now();
      
      await analyzer.analyze(mockContext);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(100); // 應該在 100ms 內完成
    });
  });

  describe('信號一致性測試', () => {
    it('應該在相同數據下產生一致的信號', async () => {
      const mockContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          rsi: 65,
          macd: { macd: 2.5, signal: 2.0, histogram: 0.5 },
          kdj: { k: 70, d: 65, j: 80 },
          stoch: { k: 75, d: 70 }
        },
        timestamp: new Date().toISOString()
      };

      const result1 = await analyzer.analyze(mockContext);
      const result2 = await analyzer.analyze(mockContext);
      
      expect(result1.signal).toBe(result2.signal);
      expect(result1.score).toBeCloseTo(result2.score, 1);
      expect(result1.confidence).toBeCloseTo(result2.confidence, 1);
    });
  });

  describe('市場適應性測試', () => {
    it('應該適應不同市場的數據', async () => {
      const twContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 25 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          rsi: 65,
          macd: { macd: 2.5, signal: 2.0, histogram: 0.5 },
          kdj: { k: 70, d: 65, j: 80 },
          stoch: { k: 75, d: 70 }
        },
        timestamp: new Date().toISOString()
      };

      const usContext: AnalysisContext = {
        ...twContext,
        market: 'US',
        symbol: 'AAPL'
      };

      const twResult = await analyzer.analyze(twContext);
      const usResult = await analyzer.analyze(usContext);
      
      expect(twResult).toBeDefined();
      expect(usResult).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(twResult.signal);
      expect(['buy', 'sell', 'hold']).toContain(usResult.signal);
    });
  });
});
