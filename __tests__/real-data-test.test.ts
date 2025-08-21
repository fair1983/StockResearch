import { TechnicalIndicatorsCache } from '@/lib/technical-indicators-cache';
import { AIAnalysisOrchestrator } from '@/lib/ai-analysis/ai-analysis-orchestrator';
import { TrendAnalyzer } from '@/lib/ai-analysis/modules/trend-analyzer';
import { MomentumAnalyzer } from '@/lib/ai-analysis/modules/momentum-analyzer';
import { VolumeAnalyzer } from '@/lib/ai-analysis/modules/volume-analyzer';
import fs from 'fs';
import path from 'path';

// 讀取測試資料
function loadTestData() {
  const testDataPath = path.join(process.cwd(), 'test-data', 'test-stocks-data.json');
  const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
  return testData;
}

describe('真實資料測試', () => {
  let testData: any[];
  let indicatorsCache: TechnicalIndicatorsCache;
  let orchestrator: AIAnalysisOrchestrator;

  beforeAll(() => {
    testData = loadTestData();
    indicatorsCache = new TechnicalIndicatorsCache();
    orchestrator = new AIAnalysisOrchestrator();
  });

  describe('技術指標計算測試', () => {
    it('應該能夠為台積電計算技術指標', async () => {
      const tsmcData = testData.find(stock => stock.symbol === '2330.TW');
      expect(tsmcData).toBeDefined();
      expect(tsmcData.success).toBe(true);
      expect(tsmcData.data.length).toBeGreaterThan(20);

      const indicators = await indicatorsCache.calculateAndCacheIndicators(
        'TW',
        '2330',
        '1d',
        tsmcData.data
      );

      expect(indicators).toBeDefined();
      expect(indicators.ma5).toBeDefined();
      expect(indicators.ma10).toBeDefined();
      expect(indicators.ma20).toBeDefined();
      expect(indicators.rsi).toBeDefined();
      expect(indicators.macd).toBeDefined();
      expect(indicators.kdj).toBeDefined();
      expect(indicators.stochastic).toBeDefined();
      expect(indicators.obv).toBeDefined();
      expect(indicators.atr).toBeDefined();
      expect(indicators.bollinger).toBeDefined();

      // 檢查移動平均線
      expect(Array.isArray(indicators.ma5)).toBe(true);
      expect(Array.isArray(indicators.ma10)).toBe(true);
      expect(Array.isArray(indicators.ma20)).toBe(true);

      // 檢查 RSI
      expect(Array.isArray(indicators.rsi)).toBe(true);
      const lastRsi = indicators.rsi[indicators.rsi.length - 1];
      if (!isNaN(lastRsi)) {
        expect(lastRsi).toBeGreaterThanOrEqual(0);
        expect(lastRsi).toBeLessThanOrEqual(100);
      }

      // 檢查 MACD
      expect(indicators.macd.macd).toBeDefined();
      expect(indicators.macd.signal).toBeDefined();
      expect(indicators.macd.histogram).toBeDefined();

      console.log('台積電技術指標:', {
        rsi: indicators.rsi[indicators.rsi.length - 1],
        macd: indicators.macd,
        ma5: indicators.ma5[indicators.ma5.length - 1],
        ma20: indicators.ma20[indicators.ma20.length - 1]
      });
    });

    it('應該能夠為特斯拉計算技術指標', async () => {
      const teslaData = testData.find(stock => stock.symbol === 'TSLA');
      expect(teslaData).toBeDefined();
      expect(teslaData.success).toBe(true);
      expect(teslaData.data.length).toBeGreaterThan(20);

      const indicators = await indicatorsCache.calculateAndCacheIndicators(
        'US',
        'TSLA',
        '1d',
        teslaData.data
      );

      expect(indicators).toBeDefined();
      expect(indicators.ma5).toBeDefined();
      expect(indicators.ma10).toBeDefined();
      expect(indicators.ma20).toBeDefined();
      expect(indicators.rsi).toBeDefined();
      expect(indicators.macd).toBeDefined();

      console.log('特斯拉技術指標:', {
        rsi: indicators.rsi[indicators.rsi.length - 1],
        macd: indicators.macd,
        ma5: indicators.ma5[indicators.ma5.length - 1],
        ma20: indicators.ma20[indicators.ma20.length - 1]
      });
    });
  });

  describe('AI 分析測試', () => {
    it('應該能夠分析台積電的趨勢', async () => {
      const tsmcData = testData.find(stock => stock.symbol === '2330.TW');
      const trendAnalyzer = new TrendAnalyzer();

      const result = await trendAnalyzer.analyze({
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: tsmcData.data,
        indicators: await indicatorsCache.calculateAndCacheIndicators('TW', '2330', '1d', tsmcData.data),
        timestamp: new Date().toISOString()
      });

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
      expect(result.reasoning).toBeTruthy();

      console.log('台積電趨勢分析:', {
        score: result.score,
        confidence: result.confidence,
        signal: result.signal,
        reasoning: result.reasoning
      });
    });

    it('應該能夠分析特斯拉的動量', async () => {
      const teslaData = testData.find(stock => stock.symbol === 'TSLA');
      const momentumAnalyzer = new MomentumAnalyzer();

      const result = await momentumAnalyzer.analyze({
        market: 'US',
        symbol: 'TSLA',
        interval: '1d',
        data: teslaData.data,
        indicators: await indicatorsCache.calculateAndCacheIndicators('US', 'TSLA', '1d', teslaData.data),
        timestamp: new Date().toISOString()
      });

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
      expect(result.reasoning).toBeTruthy();

      console.log('特斯拉動量分析:', {
        score: result.score,
        confidence: result.confidence,
        signal: result.signal,
        reasoning: result.reasoning
      });
    });

    it('應該能夠分析台積電的成交量', async () => {
      const tsmcData = testData.find(stock => stock.symbol === '2330.TW');
      const volumeAnalyzer = new VolumeAnalyzer();

      const result = await volumeAnalyzer.analyze({
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: tsmcData.data,
        indicators: await indicatorsCache.calculateAndCacheIndicators('TW', '2330', '1d', tsmcData.data),
        timestamp: new Date().toISOString()
      });

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(['buy', 'sell', 'hold']).toContain(result.signal);
      expect(result.reasoning).toBeTruthy();

      console.log('台積電成交量分析:', {
        score: result.score,
        confidence: result.confidence,
        signal: result.signal,
        reasoning: result.reasoning
      });
    });
  });

  describe('完整 AI 分析協調器測試', () => {
    it('應該能夠對台積電進行完整分析', async () => {
      const tsmcData = testData.find(stock => stock.symbol === '2330.TW');
      
      const result = await orchestrator.analyzeStock('TW', '2330', '1d', tsmcData.data);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(100);
      expect(['buy', 'sell', 'hold']).toContain(result.overallSignal);
      expect(result.moduleResults).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.summary).toBeTruthy();

      console.log('台積電完整分析結果:', {
        overallScore: result.overallScore,
        overallConfidence: result.overallConfidence,
        overallSignal: result.overallSignal,
        moduleResults: Object.keys(result.moduleResults),
        summary: result.summary
      });

      // 檢查模組結果
      expect(result.moduleResults).toHaveProperty('趨勢分析器');
      expect(result.moduleResults).toHaveProperty('動量分析器');
      expect(result.moduleResults).toHaveProperty('成交量分析器');
    });

    it('應該能夠對特斯拉進行完整分析', async () => {
      const teslaData = testData.find(stock => stock.symbol === 'TSLA');
      
      const result = await orchestrator.analyzeStock('US', 'TSLA', '1d', teslaData.data);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(100);
      expect(['buy', 'sell', 'hold']).toContain(result.overallSignal);
      expect(result.moduleResults).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.summary).toBeTruthy();

      console.log('特斯拉完整分析結果:', {
        overallScore: result.overallScore,
        overallConfidence: result.overallConfidence,
        overallSignal: result.overallSignal,
        moduleResults: Object.keys(result.moduleResults),
        summary: result.summary
      });
    });
  });

  describe('資料品質測試', () => {
    it('應該驗證台積電資料的完整性', () => {
      const tsmcData = testData.find(stock => stock.symbol === '2330.TW');
      
      // 檢查資料結構
      tsmcData.data.forEach((candle, index) => {
        expect(candle).toHaveProperty('time');
        expect(candle).toHaveProperty('open');
        expect(candle).toHaveProperty('high');
        expect(candle).toHaveProperty('low');
        expect(candle).toHaveProperty('close');
        expect(candle).toHaveProperty('volume');

        // 檢查資料合理性
        expect(candle.high).toBeGreaterThanOrEqual(candle.low);
        expect(candle.open).toBeGreaterThan(0);
        expect(candle.close).toBeGreaterThan(0);
        expect(candle.volume).toBeGreaterThanOrEqual(0);

        // 檢查日期格式
        expect(candle.time).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      console.log(`台積電資料品質檢查通過: ${tsmcData.data.length} 筆資料`);
    });

    it('應該驗證特斯拉資料的完整性', () => {
      const teslaData = testData.find(stock => stock.symbol === 'TSLA');
      
      // 檢查資料結構
      teslaData.data.forEach((candle, index) => {
        expect(candle).toHaveProperty('time');
        expect(candle).toHaveProperty('open');
        expect(candle).toHaveProperty('high');
        expect(candle).toHaveProperty('low');
        expect(candle).toHaveProperty('close');
        expect(candle).toHaveProperty('volume');

        // 檢查資料合理性
        expect(candle.high).toBeGreaterThanOrEqual(candle.low);
        expect(candle.open).toBeGreaterThan(0);
        expect(candle.close).toBeGreaterThan(0);
        expect(candle.volume).toBeGreaterThanOrEqual(0);

        // 檢查日期格式
        expect(candle.time).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      console.log(`特斯拉資料品質檢查通過: ${teslaData.data.length} 筆資料`);
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內完成台積電分析', async () => {
      const tsmcData = testData.find(stock => stock.symbol === '2330.TW');
      
      const startTime = Date.now();
      
      await orchestrator.analyzeStock('TW', '2330', '1d', tsmcData.data);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(5000); // 應該在 5 秒內完成
      
      console.log(`台積電分析執行時間: ${executionTime}ms`);
    });

    it('應該在合理時間內完成特斯拉分析', async () => {
      const teslaData = testData.find(stock => stock.symbol === 'TSLA');
      
      const startTime = Date.now();
      
      await orchestrator.analyzeStock('US', 'TSLA', '1d', teslaData.data);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(5000); // 應該在 5 秒內完成
      
      console.log(`特斯拉分析執行時間: ${executionTime}ms`);
    });
  });
});
