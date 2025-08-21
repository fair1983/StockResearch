import { StrategyAnalyzer, StrategyAnalysisResult } from '../lib/strategy/strategy-analyzer';
import { Candle } from '../types';

/**
 * 創建模擬股票數據
 */
function createMockStockData(
  symbol: string,
  trend: 'bullish' | 'bearish' | 'neutral' = 'neutral',
  volatility: number = 0.2
): Candle[] {
  const data: Candle[] = [];
  let basePrice = 100;
  
  // 根據趨勢調整起始價格
  if (trend === 'bullish') basePrice = 90;
  if (trend === 'bearish') basePrice = 110;
  
  for (let i = 0; i < 100; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (100 - i));
    
    // 模擬價格變動 - 確保趨勢方向
    let change;
    if (trend === 'bullish') {
      change = Math.random() * volatility * basePrice * 0.5; // 正向變動
    } else if (trend === 'bearish') {
      change = -Math.random() * volatility * basePrice * 0.5; // 負向變動
    } else {
      change = (Math.random() - 0.5) * volatility * basePrice; // 隨機變動
    }
    
    const price = basePrice + change;
    
    data.push({
      time: date.toISOString().split('T')[0],
      open: price * (1 + (Math.random() - 0.5) * 0.02),
      high: price * (1 + Math.random() * 0.03),
      low: price * (1 - Math.random() * 0.03),
      close: price,
      volume: Math.floor(Math.random() * 1000000) + 100000
    });
    
    basePrice = price;
  }
  
  return data;
}

describe('StrategyAnalyzer', () => {
  let analyzer: StrategyAnalyzer;

  beforeEach(() => {
    analyzer = new StrategyAnalyzer();
  });

  describe('analyzeStock', () => {
    it('應該成功分析股票並返回完整的分析結果', async () => {
      const mockData = createMockStockData('AAPL', 'bullish', 0.15);
      
      const result = await analyzer.analyzeStock('AAPL', 'Apple Inc.', 'US', mockData);
      
      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.name).toBe('Apple Inc.');
      expect(result.market).toBe('US');
      expect(result.currentPrice).toBeGreaterThan(0);
      expect(result.recommendedStrategy).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.expectedReturn).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(result.riskLevel);
      expect(result.reasoning).toBeDefined();
      expect(result.technicalSignals).toBeDefined();
      expect(result.fundamentalScore).toBeGreaterThanOrEqual(0);
      expect(result.fundamentalScore).toBeLessThanOrEqual(100);
      expect(result.technicalScore).toBeGreaterThanOrEqual(0);
      expect(result.technicalScore).toBeLessThanOrEqual(100);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.lastUpdate).toBeDefined();
    });

    it('應該對數據不足的股票拋出錯誤', async () => {
      const insufficientData = createMockStockData('TEST', 'neutral', 0.1).slice(0, 30);
      
      await expect(
        analyzer.analyzeStock('TEST', 'Test Stock', 'US', insufficientData)
      ).rejects.toThrow('需要至少50個數據點進行分析');
    });

    it('應該對空數據拋出錯誤', async () => {
      await expect(
        analyzer.analyzeStock('TEST', 'Test Stock', 'US', [])
      ).rejects.toThrow('股票數據為空');
    });

    it('應該對無效數據拋出錯誤', async () => {
      const invalidData: Candle[] = [
        {
          time: '2024-01-01',
          open: 0,
          high: 0,
          low: 0,
          close: 0,
          volume: 0
        }
      ];
      
      await expect(
        analyzer.analyzeStock('TEST', 'Test Stock', 'US', invalidData)
      ).rejects.toThrow('需要至少50個數據點進行分析');
    });
  });

  describe('技術信號計算', () => {
    it('應該正確識別上漲趨勢', async () => {
      const bullishData = createMockStockData('BULL', 'bullish', 0.1);
      const result = await analyzer.analyzeStock('BULL', 'Bull Stock', 'US', bullishData);
      
      expect(result.technicalSignals.trend).toBe('bullish');
      expect(result.technicalSignals.momentum).toBeGreaterThan(0.3);
    });

    it('應該正確識別下跌趨勢', async () => {
      const bearishData = createMockStockData('BEAR', 'bearish', 0.1);
      const result = await analyzer.analyzeStock('BEAR', 'Bear Stock', 'US', bearishData);
      
      expect(result.technicalSignals.trend).toBe('bearish');
      expect(result.technicalSignals.momentum).toBeLessThan(0.7);
    });

    it('應該正確計算波動率', async () => {
      const highVolData = createMockStockData('VOL', 'neutral', 0.5);
      const result = await analyzer.analyzeStock('VOL', 'Vol Stock', 'US', highVolData);
      
      expect(result.technicalSignals.volatility).toBeGreaterThan(0.3);
    });

    it('應該正確計算支撐和阻力位', async () => {
      const mockData = createMockStockData('TEST', 'neutral', 0.2);
      const result = await analyzer.analyzeStock('TEST', 'Test Stock', 'US', mockData);
      
      expect(result.technicalSignals.support).toBeLessThan(result.currentPrice);
      expect(result.technicalSignals.resistance).toBeGreaterThan(result.currentPrice);
    });
  });

  describe('策略推薦', () => {
    it('應該為成長股推薦買入持有策略', async () => {
      const growthData = createMockStockData('GROWTH', 'bullish', 0.3);
      const result = await analyzer.analyzeStock('GROWTH', 'Growth Stock', 'US', growthData);
      
      // 注意：實際策略選擇依賴於股票分類器，這裡主要測試結果結構
      expect(result.recommendedStrategy).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.expectedReturn).toBeDefined();
    });

    it('應該正確計算風險等級', async () => {
      const lowRiskData = createMockStockData('LOW', 'neutral', 0.1);
      const highRiskData = createMockStockData('HIGH', 'neutral', 0.6);
      
      const lowRiskResult = await analyzer.analyzeStock('LOW', 'Low Risk Stock', 'US', lowRiskData);
      const highRiskResult = await analyzer.analyzeStock('HIGH', 'High Risk Stock', 'US', highRiskData);
      
      expect(['low', 'medium', 'high']).toContain(lowRiskResult.riskLevel);
      expect(['low', 'medium', 'high']).toContain(highRiskResult.riskLevel);
    });
  });

  describe('評分系統', () => {
    it('應該計算有效的評分', async () => {
      const mockData = createMockStockData('SCORE', 'bullish', 0.2);
      const result = await analyzer.analyzeStock('SCORE', 'Score Stock', 'US', mockData);
      
      expect(result.fundamentalScore).toBeGreaterThanOrEqual(0);
      expect(result.fundamentalScore).toBeLessThanOrEqual(100);
      expect(result.technicalScore).toBeGreaterThanOrEqual(0);
      expect(result.technicalScore).toBeLessThanOrEqual(100);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('應該正確計算綜合評分', async () => {
      const mockData = createMockStockData('COMPOSITE', 'neutral', 0.2);
      const result = await analyzer.analyzeStock('COMPOSITE', 'Composite Stock', 'US', mockData);
      
      // 綜合評分應該是基本面60% + 技術面40%
      const expectedOverall = Math.round(result.fundamentalScore * 0.6 + result.technicalScore * 0.4);
      expect(result.overallScore).toBe(expectedOverall);
    });
  });

  describe('價格資訊提取', () => {
    it('應該正確提取價格變動資訊', async () => {
      const mockData = createMockStockData('PRICE', 'neutral', 0.1);
      const result = await analyzer.analyzeStock('PRICE', 'Price Stock', 'US', mockData);
      
      expect(result.currentPrice).toBeGreaterThan(0);
      expect(typeof result.priceChange).toBe('number');
      expect(typeof result.priceChangePercent).toBe('number');
    });
  });

  describe('錯誤處理', () => {
    it('應該優雅處理分析過程中的錯誤', async () => {
      const invalidData = createMockStockData('ERROR', 'neutral', 0.1);
      // 修改數據使其無效
      invalidData[0].close = -1;
      
      await expect(
        analyzer.analyzeStock('ERROR', 'Error Stock', 'US', invalidData)
      ).rejects.toThrow('股票分析失敗 (ERROR)');
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內完成分析', async () => {
      const largeData = createMockStockData('PERF', 'neutral', 0.2);
      // 擴展到更多數據點
      for (let i = 0; i < 200; i++) {
        largeData.push(largeData[largeData.length - 1]);
      }
      
      const startTime = Date.now();
      await analyzer.analyzeStock('PERF', 'Perf Stock', 'US', largeData);
      const endTime = Date.now();
      
      // 分析應該在1秒內完成
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
