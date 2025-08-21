import { AIAnalysisOrchestrator } from '@/lib/ai-analysis/ai-analysis-orchestrator';
import { TrendAnalyzer } from '@/lib/ai-analysis/modules/trend-analyzer';
import { MomentumAnalyzer } from '@/lib/ai-analysis/modules/momentum-analyzer';
import { VolumeAnalyzer } from '@/lib/ai-analysis/modules/volume-analyzer';
import { AnalysisContext } from '@/lib/ai-analysis/modules/base-analyzer';

// Mock TechnicalIndicatorsCache
jest.mock('@/lib/technical-indicators-cache', () => ({
  TechnicalIndicatorsCache: jest.fn().mockImplementation(() => ({
    calculateAndCacheIndicators: jest.fn().mockResolvedValue({
      ma: { ma5: 115, ma10: 110, ma20: 105, ma50: 100, ma200: 95 },
      rsi: 65,
      macd: { macd: 2.5, signal: 2.0, histogram: 0.5 },
      kdj: { k: 70, d: 65, j: 80 },
      stoch: { k: 75, d: 70 },
      obv: 1000000,
      atr: 8.5,
      boll: { upper: 130, middle: 115, lower: 100 }
    })
  }))
}));

// Mock Logger
jest.mock('@/lib/logger', () => ({
  logger: {
    aiAnalysis: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      request: jest.fn(),
      response: jest.fn()
    }
  }
}));

describe('AIAnalysisOrchestrator', () => {
  let orchestrator: AIAnalysisOrchestrator;
  let mockContext: AnalysisContext;

  beforeEach(() => {
    orchestrator = new AIAnalysisOrchestrator();
    
    mockContext = {
      market: 'TW',
      symbol: '2330',
      interval: '1d',
      data: [
        { date: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
        { date: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1200 },
        { date: '2024-01-03', open: 110, high: 120, low: 105, close: 115, volume: 1300 },
        { date: '2024-01-04', open: 115, high: 125, low: 110, close: 120, volume: 1400 },
        { date: '2024-01-05', open: 120, high: 130, low: 115, close: 125, volume: 1500 }
      ],
      indicators: {
        ma: { ma5: 115, ma10: 110, ma20: 105, ma50: 100, ma200: 95 },
        rsi: 65,
        macd: { macd: 2.5, signal: 2.0, histogram: 0.5 },
        kdj: { k: 70, d: 65, j: 80 },
        stoch: { k: 75, d: 70 },
        obv: 1000000,
        atr: 8.5,
        boll: { upper: 130, middle: 115, lower: 100 }
      },
      timestamp: new Date().toISOString()
    };
  });

  describe('基本功能測試', () => {
    it('應該正確初始化協調器', () => {
      const analyzers = orchestrator.getAnalyzersInfo();
      expect(analyzers).toHaveLength(3);
      expect(analyzers.map(a => a.name)).toContain('趨勢分析器');
      expect(analyzers.map(a => a.name)).toContain('動量分析器');
      expect(analyzers.map(a => a.name)).toContain('成交量分析器');
    });

    it('應該能夠執行完整的股票分析', async () => {
      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(100);
      expect(['buy', 'sell', 'hold']).toContain(result.overallSignal);
      expect(result.moduleResults).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.summary).toBeTruthy();
    });
  });

  describe('模組結果整合測試', () => {
    it('應該正確整合多個分析器的結果', async () => {
      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      expect(result.moduleResults).toHaveProperty('TrendAnalyzer');
      expect(result.moduleResults).toHaveProperty('MomentumAnalyzer');
      expect(result.moduleResults).toHaveProperty('VolumeAnalyzer');
      
      // 檢查每個模組的結果格式
      Object.values(result.moduleResults).forEach(moduleResult => {
        expect(moduleResult.score).toBeGreaterThanOrEqual(0);
        expect(moduleResult.score).toBeLessThanOrEqual(100);
        expect(moduleResult.confidence).toBeGreaterThanOrEqual(0);
        expect(moduleResult.confidence).toBeLessThanOrEqual(100);
        expect(['buy', 'sell', 'hold']).toContain(moduleResult.signal);
        expect(moduleResult.reasoning).toBeTruthy();
      });
    });

    it('應該計算正確的加權總分', async () => {
      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      // 驗證總分計算邏輯
      const expectedTotalWeight = 1.2 + 1.0 + 0.8; // 各模組權重總和
      const weightedScores = Object.values(result.moduleResults).map((moduleResult, index) => {
        const weights = [1.2, 1.0, 0.8];
        return moduleResult.score * weights[index];
      });
      const expectedScore = weightedScores.reduce((sum, score) => sum + score, 0) / expectedTotalWeight;
      
      expect(result.overallScore).toBeCloseTo(expectedScore, 1);
    });
  });

  describe('信號決策測試', () => {
    it('應該在強烈買入信號時產生買入建議', async () => {
      // 模擬所有模組都給出買入信號
      jest.spyOn(TrendAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 85,
        confidence: 90,
        signal: 'buy',
        reasoning: '強烈上升趨勢'
      });
      
      jest.spyOn(MomentumAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 80,
        confidence: 85,
        signal: 'buy',
        reasoning: '動量強勁'
      });
      
      jest.spyOn(VolumeAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 75,
        confidence: 80,
        signal: 'buy',
        reasoning: '成交量配合'
      });

      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      expect(result.overallSignal).toBe('buy');
      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.overallConfidence).toBeGreaterThan(80);
    });

    it('應該在強烈賣出信號時產生賣出建議', async () => {
      // 模擬所有模組都給出賣出信號
      jest.spyOn(TrendAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 20,
        confidence: 85,
        signal: 'sell',
        reasoning: '強烈下降趨勢'
      });
      
      jest.spyOn(MomentumAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 25,
        confidence: 80,
        signal: 'sell',
        reasoning: '動量疲弱'
      });
      
      jest.spyOn(VolumeAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 30,
        confidence: 75,
        signal: 'sell',
        reasoning: '成交量萎縮'
      });

      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      expect(result.overallSignal).toBe('sell');
      expect(result.overallScore).toBeLessThan(30);
      expect(result.overallConfidence).toBeGreaterThan(75);
    });

    it('應該在混合信號時產生持有建議', async () => {
      // 模擬混合信號
      jest.spyOn(TrendAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 60,
        confidence: 70,
        signal: 'buy',
        reasoning: '輕微上升趨勢'
      });
      
      jest.spyOn(MomentumAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 40,
        confidence: 65,
        signal: 'sell',
        reasoning: '動量轉弱'
      });
      
      jest.spyOn(VolumeAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 50,
        confidence: 60,
        signal: 'hold',
        reasoning: '成交量中性'
      });

      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      expect(result.overallSignal).toBe('hold');
      expect(result.overallScore).toBeGreaterThanOrEqual(40);
      expect(result.overallScore).toBeLessThanOrEqual(60);
      expect(result.overallConfidence).toBeLessThan(70); // 混合信號信心度較低
    });
  });

  describe('風險評估測試', () => {
    it('應該正確評估低風險情況', async () => {
      jest.spyOn(TrendAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 80,
        confidence: 90,
        signal: 'buy',
        reasoning: '穩定上升趨勢'
      });
      
      jest.spyOn(MomentumAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 75,
        confidence: 85,
        signal: 'buy',
        reasoning: '穩定動量'
      });
      
      jest.spyOn(VolumeAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 70,
        confidence: 80,
        signal: 'buy',
        reasoning: '穩定成交量'
      });

      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      expect(result.riskLevel).toBe('low');
    });

    it('應該正確評估高風險情況', async () => {
      jest.spyOn(TrendAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 30,
        confidence: 40,
        signal: 'sell',
        reasoning: '不穩定趨勢'
      });
      
      jest.spyOn(MomentumAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 25,
        confidence: 35,
        signal: 'sell',
        reasoning: '動量不穩定'
      });
      
      jest.spyOn(VolumeAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 35,
        confidence: 45,
        signal: 'sell',
        reasoning: '成交量異常'
      });

      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      expect(result.riskLevel).toBe('high');
    });
  });

  describe('建議生成測試', () => {
    it('應該生成適當的交易建議', async () => {
      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      result.recommendations.forEach(recommendation => {
        expect(recommendation).toHaveProperty('type');
        expect(recommendation).toHaveProperty('description');
        expect(recommendation).toHaveProperty('priority');
        expect(['high', 'medium', 'low']).toContain(recommendation.priority);
      });
    });

    it('應該根據信號強度調整建議優先級', async () => {
      // 模擬強烈買入信號
      jest.spyOn(TrendAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 90,
        confidence: 95,
        signal: 'buy',
        reasoning: '非常強烈的上升趨勢'
      });
      
      jest.spyOn(MomentumAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 85,
        confidence: 90,
        signal: 'buy',
        reasoning: '非常強勁的動量'
      });
      
      jest.spyOn(VolumeAnalyzer.prototype, 'analyze').mockResolvedValue({
        score: 80,
        confidence: 85,
        signal: 'buy',
        reasoning: '成交量強勁'
      });

      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      // 強烈信號應該產生高優先級建議
      const highPriorityRecommendations = result.recommendations.filter(r => r.priority === 'high');
      expect(highPriorityRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('批次分析測試', () => {
    it('應該能夠執行批次分析', async () => {
      const stocks = [
        { market: 'TW', symbol: '2330', interval: '1d' },
        { market: 'TW', symbol: '2317', interval: '1d' },
        { market: 'US', symbol: 'AAPL', interval: '1d' }
      ];

      const results = await orchestrator.batchAnalyze(stocks);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.overallScore).toBeLessThanOrEqual(100);
        expect(['buy', 'sell', 'hold']).toContain(result.overallSignal);
      });
    });

    it('應該在批次分析中處理錯誤', async () => {
      const stocks = [
        { market: 'TW', symbol: '2330', interval: '1d' },
        { market: 'INVALID', symbol: 'INVALID', interval: '1d' }, // 無效股票
        { market: 'US', symbol: 'AAPL', interval: '1d' }
      ];

      const results = await orchestrator.batchAnalyze(stocks);
      
      expect(results).toHaveLength(3);
      // 無效股票應該返回預設結果或錯誤處理
      expect(results[1]).toBeDefined();
    });
  });

  describe('模組管理測試', () => {
    it('應該能夠添加新的分析器', () => {
      const customAnalyzer = new TrendAnalyzer();
      orchestrator.addAnalyzer(customAnalyzer);
      
      const analyzers = orchestrator.getAnalyzersInfo();
      expect(analyzers.length).toBe(4); // 原本3個 + 新增1個
    });

    it('應該能夠移除分析器', () => {
      const analyzers = orchestrator.getAnalyzersInfo();
      const initialCount = analyzers.length;
      
      orchestrator.removeAnalyzer('TrendAnalyzer');
      
      const remainingAnalyzers = orchestrator.getAnalyzersInfo();
      expect(remainingAnalyzers.length).toBe(initialCount - 1);
      expect(remainingAnalyzers.find(a => a.name === '趨勢分析器')).toBeUndefined();
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內完成單一股票分析', async () => {
      const startTime = Date.now();
      
      await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(1000); // 應該在 1 秒內完成
    });

    it('應該在合理時間內完成批次分析', async () => {
      const stocks = Array.from({ length: 10 }, (_, i) => ({
        market: 'TW',
        symbol: `23${String(i).padStart(2, '0')}`,
        interval: '1d'
      }));

      const startTime = Date.now();
      
      await orchestrator.batchAnalyze(stocks);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(5000); // 應該在 5 秒內完成
    });
  });

  describe('錯誤處理測試', () => {
    it('應該處理分析器錯誤', async () => {
      jest.spyOn(TrendAnalyzer.prototype, 'analyze').mockRejectedValue(new Error('分析器錯誤'));
      
      const result = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      
      expect(result).toBeDefined();
      expect(result.overallSignal).toBe('hold'); // 錯誤時應該建議持有
      expect(result.overallConfidence).toBeLessThan(50); // 信心度應該很低
    });

    it('應該處理無效的股票數據', async () => {
      const result = await orchestrator.analyzeStock('TW', '2330', '1d', []);
      
      expect(result).toBeDefined();
      expect(result.overallSignal).toBe('hold');
      expect(result.overallConfidence).toBeLessThan(50);
    });
  });

  describe('市場適應性測試', () => {
    it('應該適應不同市場的數據', async () => {
      const twResult = await orchestrator.analyzeStock('TW', '2330', '1d', mockContext.data);
      const usResult = await orchestrator.analyzeStock('US', 'AAPL', '1d', mockContext.data);
      
      expect(twResult).toBeDefined();
      expect(usResult).toBeDefined();
      expect(['buy', 'sell', 'hold']).toContain(twResult.overallSignal);
      expect(['buy', 'sell', 'hold']).toContain(usResult.overallSignal);
    });
  });
});
