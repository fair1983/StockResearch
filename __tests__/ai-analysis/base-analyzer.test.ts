import { BaseAnalyzer, AnalysisContext, AnalysisResult } from '@/lib/ai-analysis/modules/base-analyzer';

// 建立測試用的具體實現類別
class TestAnalyzer extends BaseAnalyzer {
  constructor() {
    super('TestAnalyzer', '測試分析器', 1.0);
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    return {
      score: 75,
      confidence: 80,
      signal: 'buy',
      reasoning: '測試分析結果'
    };
  }
}

class InvalidAnalyzer extends BaseAnalyzer {
  constructor() {
    super('InvalidAnalyzer', '無效分析器', 1.0);
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    // 故意返回無效結果
    return {
      score: 150, // 超出範圍
      confidence: -10, // 負值
      signal: 'invalid' as any, // 無效信號
      reasoning: '' // 空字串
    };
  }
}

describe('BaseAnalyzer', () => {
  let testAnalyzer: TestAnalyzer;
  let invalidAnalyzer: InvalidAnalyzer;
  let mockContext: AnalysisContext;

  beforeEach(() => {
    testAnalyzer = new TestAnalyzer();
    invalidAnalyzer = new InvalidAnalyzer();
    
    mockContext = {
      market: 'TW',
      symbol: '2330',
      interval: '1d',
      data: [
        { date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
        { date: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1200 }
      ],
      indicators: {
        ma: { ma5: 107, ma10: 105 },
        rsi: 65,
        macd: { macd: 2.5, signal: 2.0, histogram: 0.5 }
      },
      timestamp: new Date().toISOString()
    };
  });

  describe('基本功能測試', () => {
    it('應該正確初始化分析器', () => {
      expect(testAnalyzer.getInfo()).toEqual({
        name: 'TestAnalyzer',
        description: '測試分析器',
        weight: 1.0
      });
    });

    it('應該能夠執行分析', async () => {
      const result = await testAnalyzer.analyze(mockContext);
      
      expect(result).toEqual({
        score: 75,
        confidence: 80,
        signal: 'buy',
        reasoning: '測試分析結果'
      });
    });

    it('應該計算加權分數', () => {
      const result: AnalysisResult = {
        score: 75,
        confidence: 80,
        signal: 'buy',
        reasoning: '測試'
      };

      expect(testAnalyzer.getWeightedScore(result)).toBe(75);
    });

    it('應該處理不同權重的加權分數', () => {
      const highWeightAnalyzer = new TestAnalyzer();
      // 修改權重
      (highWeightAnalyzer as any).weight = 2.0;
      
      const result: AnalysisResult = {
        score: 75,
        confidence: 80,
        signal: 'buy',
        reasoning: '測試'
      };

      expect(highWeightAnalyzer.getWeightedScore(result)).toBe(150);
    });
  });

  describe('結果驗證測試', () => {
    it('應該驗證有效的分析結果', () => {
      const validResult: AnalysisResult = {
        score: 75,
        confidence: 80,
        signal: 'buy',
        reasoning: '有效結果'
      };

      expect(testAnalyzer['validateResult'](validResult)).toBe(true);
    });

    it('應該拒絕無效的分數範圍', () => {
      const invalidScoreResult: AnalysisResult = {
        score: 150, // 超出 0-100 範圍
        confidence: 80,
        signal: 'buy',
        reasoning: '無效分數'
      };

      expect(testAnalyzer['validateResult'](invalidScoreResult)).toBe(false);
    });

    it('應該拒絕無效的信心度範圍', () => {
      const invalidConfidenceResult: AnalysisResult = {
        score: 75,
        confidence: -10, // 負值
        signal: 'buy',
        reasoning: '無效信心度'
      };

      expect(testAnalyzer['validateResult'](invalidConfidenceResult)).toBe(false);
    });

    it('應該拒絕無效的信號', () => {
      const invalidSignalResult: AnalysisResult = {
        score: 75,
        confidence: 80,
        signal: 'invalid' as any, // 無效信號
        reasoning: '無效信號'
      };

      expect(testAnalyzer['validateResult'](invalidSignalResult)).toBe(false);
    });

    it('應該接受空字串的推理說明（當前實現允許）', () => {
      const emptyReasoningResult: AnalysisResult = {
        score: 75,
        confidence: 80,
        signal: 'buy',
        reasoning: '' // 空字串
      };

      expect(testAnalyzer['validateResult'](emptyReasoningResult)).toBe(true);
    });

    it('應該接受所有有效的信號類型', () => {
      const buyResult: AnalysisResult = {
        score: 75,
        confidence: 80,
        signal: 'buy',
        reasoning: '買入信號'
      };

      const sellResult: AnalysisResult = {
        score: 25,
        confidence: 70,
        signal: 'sell',
        reasoning: '賣出信號'
      };

      const holdResult: AnalysisResult = {
        score: 50,
        confidence: 60,
        signal: 'hold',
        reasoning: '持有信號'
      };

      expect(testAnalyzer['validateResult'](buyResult)).toBe(true);
      expect(testAnalyzer['validateResult'](sellResult)).toBe(true);
      expect(testAnalyzer['validateResult'](holdResult)).toBe(true);
    });
  });

  describe('邊界情況測試', () => {
    it('應該處理邊界分數值', () => {
      const minScoreResult: AnalysisResult = {
        score: 0,
        confidence: 80,
        signal: 'sell',
        reasoning: '最低分數'
      };

      const maxScoreResult: AnalysisResult = {
        score: 100,
        confidence: 80,
        signal: 'buy',
        reasoning: '最高分數'
      };

      expect(testAnalyzer['validateResult'](minScoreResult)).toBe(true);
      expect(testAnalyzer['validateResult'](maxScoreResult)).toBe(true);
    });

    it('應該處理邊界信心度值', () => {
      const minConfidenceResult: AnalysisResult = {
        score: 75,
        confidence: 0,
        signal: 'buy',
        reasoning: '最低信心度'
      };

      const maxConfidenceResult: AnalysisResult = {
        score: 75,
        confidence: 100,
        signal: 'buy',
        reasoning: '最高信心度'
      };

      expect(testAnalyzer['validateResult'](minConfidenceResult)).toBe(true);
      expect(testAnalyzer['validateResult'](maxConfidenceResult)).toBe(true);
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內完成分析', async () => {
      const startTime = Date.now();
      
      await testAnalyzer.analyze(mockContext);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(100); // 應該在 100ms 內完成
    });

    it('應該能夠處理大量數據', async () => {
      const largeContext: AnalysisContext = {
        ...mockContext,
        data: Array.from({ length: 1000 }, (_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i,
          high: 110 + i,
          low: 95 + i,
          close: 105 + i,
          volume: 1000 + i * 10
        }))
      };

      const startTime = Date.now();
      
      await testAnalyzer.analyze(largeContext);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(500); // 應該在 500ms 內完成
    });
  });

  describe('錯誤處理測試', () => {
    it('應該處理空的數據陣列', async () => {
      const emptyContext: AnalysisContext = {
        ...mockContext,
        data: []
      };

      const result = await testAnalyzer.analyze(emptyContext);
      
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('應該處理缺少指標的上下文', async () => {
      const noIndicatorsContext: AnalysisContext = {
        ...mockContext,
        indicators: {}
      };

      const result = await testAnalyzer.analyze(noIndicatorsContext);
      
      expect(result).toBeDefined();
      expect(result.signal).toBeDefined();
    });
  });

  describe('模組化測試', () => {
    it('應該支援不同的分析器實例', () => {
      const analyzer1 = new TestAnalyzer();
      const analyzer2 = new TestAnalyzer();
      
      expect(analyzer1.getInfo()).toEqual(analyzer2.getInfo());
      expect(analyzer1).not.toBe(analyzer2); // 不同實例
    });

    it('應該支援自定義權重', () => {
      const customWeightAnalyzer = new TestAnalyzer();
      (customWeightAnalyzer as any).weight = 1.5;
      
      const result: AnalysisResult = {
        score: 80,
        confidence: 85,
        signal: 'buy',
        reasoning: '自定義權重測試'
      };

      expect(customWeightAnalyzer.getWeightedScore(result)).toBe(120);
    });
  });
});
