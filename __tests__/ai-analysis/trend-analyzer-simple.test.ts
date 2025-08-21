import { TrendAnalyzer } from '@/lib/ai-analysis/modules/trend-analyzer';
import { AnalysisContext } from '@/lib/ai-analysis/modules/base-analyzer';

describe('TrendAnalyzer (簡化版)', () => {
  let analyzer: TrendAnalyzer;

  beforeEach(() => {
    analyzer = new TrendAnalyzer();
  });

  describe('基本功能測試', () => {
    it('應該正確初始化趨勢分析器', () => {
      const info = analyzer.getInfo();
      expect(info.name).toBe('趨勢分析器');
      expect(info.description).toContain('趨勢');
      expect(info.weight).toBe(1.2);
    });

    it('應該能夠執行完整的趨勢分析', async () => {
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
          ma5: [115, 114, 113, 112, 111],
          ma10: [110, 109, 108, 107, 106],
          ma20: [105, 104, 103, 102, 101],
          ma50: [100, 99, 98, 97, 96],
          ma200: [95, 94, 93, 92, 91],
          atr: [8.5, 8.2, 8.8, 9.1, 8.9],
          boll: {
            upper: 130,
            middle: 115,
            lower: 100
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

  describe('數據不足處理測試', () => {
    it('應該處理數據不足的情況', async () => {
      const insufficientDataContext: AnalysisContext = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: Array.from({ length: 10 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        })),
        indicators: {
          ma5: [115, 114, 113, 112, 111],
          ma10: [110, 109, 108, 107, 106],
          ma20: [105, 104, 103, 102, 101],
          atr: [8.5, 8.2, 8.8, 9.1, 8.9]
        },
        timestamp: new Date().toISOString()
      };

      const result = await analyzer.analyze(insufficientDataContext);
      
      expect(result.signal).toBe('hold');
      expect(result.score).toBe(50);
      expect(result.confidence).toBe(30);
      expect(result.reasoning).toContain('資料不足');
    });
  });

  describe('指標缺失處理測試', () => {
    it('應該處理缺少移動平均線指標的情況', async () => {
      const missingMAContext: AnalysisContext = {
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
          atr: [8.5, 8.2, 8.8, 9.1, 8.9]
          // 缺少移動平均線指標
        },
        timestamp: new Date().toISOString()
      };

      const result = await analyzer.analyze(missingMAContext);
      
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
          ma5: [115, 114, 113, 112, 111],
          ma10: [110, 109, 108, 107, 106],
          ma20: [105, 104, 103, 102, 101],
          ma50: [100, 99, 98, 97, 96],
          ma200: [95, 94, 93, 92, 91],
          atr: [8.5, 8.2, 8.8, 9.1, 8.9]
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
          ma5: [115, 114, 113, 112, 111],
          ma10: [110, 109, 108, 107, 106],
          ma20: [105, 104, 103, 102, 101],
          ma50: [100, 99, 98, 97, 96],
          ma200: [95, 94, 93, 92, 91],
          atr: [8.5, 8.2, 8.8, 9.1, 8.9]
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
          ma5: [115, 114, 113, 112, 111],
          ma10: [110, 109, 108, 107, 106],
          ma20: [105, 104, 103, 102, 101],
          ma50: [100, 99, 98, 97, 96],
          ma200: [95, 94, 93, 92, 91],
          atr: [8.5, 8.2, 8.8, 9.1, 8.9]
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
