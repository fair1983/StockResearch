import { MomentumAnalyzer } from '@/lib/ai-analysis/modules/momentum-analyzer';
import { AnalysisContext } from '@/lib/ai-analysis/modules/base-analyzer';

describe('MomentumAnalyzer', () => {
  let analyzer: MomentumAnalyzer;
  let mockContext: AnalysisContext;

  beforeEach(() => {
    analyzer = new MomentumAnalyzer();
    
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
  });

  describe('基本功能測試', () => {
    it('應該正確初始化動量分析器', () => {
      const info = analyzer.getInfo();
      expect(info.name).toBe('動量分析器');
      expect(info.description).toContain('動量');
      expect(info.weight).toBe(1.0);
    });

    it('應該能夠執行完整的動量分析', async () => {
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
    it('應該識別超買情況', async () => {
      const overboughtContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          rsi: 85 // 超買
        }
      };

      const result = await analyzer.analyze(overboughtContext);
      
      expect(result.signal).toBe('sell');
      expect(result.score).toBeLessThan(40);
    });

    it('應該識別超賣情況', async () => {
      const oversoldContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          rsi: 25 // 超賣
        }
      };

      const result = await analyzer.analyze(oversoldContext);
      
      expect(result.signal).toBe('buy');
      expect(result.score).toBeGreaterThan(60);
    });

    it('應該識別中性 RSI', async () => {
      const neutralContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          rsi: 50 // 中性
        }
      };

      const result = await analyzer.analyze(neutralContext);
      
      expect(result.signal).toBe('hold');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThanOrEqual(60);
    });
  });

  describe('MACD 分析測試', () => {
    it('應該識別 MACD 金叉', async () => {
      const goldenCrossContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          macd: {
            macd: 3.0,
            signal: 2.5,
            histogram: 0.5 // 正值，表示金叉
          }
        }
      };

      const result = await analyzer.analyze(goldenCrossContext);
      
      expect(result.signal).toBe('buy');
      expect(result.score).toBeGreaterThan(60);
    });

    it('應該識別 MACD 死叉', async () => {
      const deathCrossContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          macd: {
            macd: 2.0,
            signal: 2.5,
            histogram: -0.5 // 負值，表示死叉
          }
        }
      };

      const result = await analyzer.analyze(deathCrossContext);
      
      expect(result.signal).toBe('sell');
      expect(result.score).toBeLessThan(40);
    });

    it('應該識別 MACD 背離', async () => {
      const divergenceContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          macd: {
            macd: 1.0,
            signal: 1.0,
            histogram: 0.0 // 零值，可能表示背離
          }
        }
      };

      const result = await analyzer.analyze(divergenceContext);
      
      expect(result.signal).toBe('hold');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThanOrEqual(60);
    });
  });

  describe('KDJ 分析測試', () => {
    it('應該識別 KDJ 超買', async () => {
      const overboughtContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          kdj: {
            k: 85,
            d: 80,
            j: 95 // 超買
          }
        }
      };

      const result = await analyzer.analyze(overboughtContext);
      
      expect(result.signal).toBe('sell');
      expect(result.score).toBeLessThan(40);
    });

    it('應該識別 KDJ 超賣', async () => {
      const oversoldContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          kdj: {
            k: 15,
            d: 20,
            j: 5 // 超賣
          }
        }
      };

      const result = await analyzer.analyze(oversoldContext);
      
      expect(result.signal).toBe('buy');
      expect(result.score).toBeGreaterThan(60);
    });

    it('應該識別 KDJ 金叉', async () => {
      const goldenCrossContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          kdj: {
            k: 70,
            d: 65,
            j: 80 // K > D，金叉
          }
        }
      };

      const result = await analyzer.analyze(goldenCrossContext);
      
      expect(result.signal).toBe('buy');
      expect(result.score).toBeGreaterThan(60);
    });
  });

  describe('Stochastic 分析測試', () => {
    it('應該識別 Stochastic 超買', async () => {
      const overboughtContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          stoch: {
            k: 85,
            d: 80 // 超買
          }
        }
      };

      const result = await analyzer.analyze(overboughtContext);
      
      expect(result.signal).toBe('sell');
      expect(result.score).toBeLessThan(40);
    });

    it('應該識別 Stochastic 超賣', async () => {
      const oversoldContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          stoch: {
            k: 15,
            d: 20 // 超賣
          }
        }
      };

      const result = await analyzer.analyze(oversoldContext);
      
      expect(result.signal).toBe('buy');
      expect(result.score).toBeGreaterThan(60);
    });

    it('應該識別 Stochastic 金叉', async () => {
      const goldenCrossContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          stoch: {
            k: 70,
            d: 65 // K > D，金叉
          }
        }
      };

      const result = await analyzer.analyze(goldenCrossContext);
      
      expect(result.signal).toBe('buy');
      expect(result.score).toBeGreaterThan(60);
    });
  });

  describe('綜合動量分析測試', () => {
    it('應該識別強烈買入信號', async () => {
      const strongBuyContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          rsi: 25, // 超賣
          macd: {
            macd: 3.0,
            signal: 2.5,
            histogram: 0.5 // 金叉
          },
          kdj: {
            k: 15,
            d: 20,
            j: 5 // 超賣
          },
          stoch: {
            k: 15,
            d: 20 // 超賣
          }
        }
      };

      const result = await analyzer.analyze(strongBuyContext);
      
      expect(result.signal).toBe('buy');
      expect(result.score).toBeGreaterThan(80);
      expect(result.confidence).toBeGreaterThan(80);
    });

    it('應該識別強烈賣出信號', async () => {
      const strongSellContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          rsi: 85, // 超買
          macd: {
            macd: 2.0,
            signal: 2.5,
            histogram: -0.5 // 死叉
          },
          kdj: {
            k: 85,
            d: 80,
            j: 95 // 超買
          },
          stoch: {
            k: 85,
            d: 80 // 超買
          }
        }
      };

      const result = await analyzer.analyze(strongSellContext);
      
      expect(result.signal).toBe('sell');
      expect(result.score).toBeLessThan(20);
      expect(result.confidence).toBeGreaterThan(80);
    });

    it('應該識別混合信號', async () => {
      const mixedContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          rsi: 50, // 中性
          macd: {
            macd: 2.5,
            signal: 2.5,
            histogram: 0.0 // 中性
          },
          kdj: {
            k: 50,
            d: 50,
            j: 50 // 中性
          },
          stoch: {
            k: 50,
            d: 50 // 中性
          }
        }
      };

      const result = await analyzer.analyze(mixedContext);
      
      expect(result.signal).toBe('hold');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThanOrEqual(60);
      expect(result.confidence).toBeLessThan(70); // 混合信號信心度較低
    });
  });

  describe('邊界情況測試', () => {
    it('應該處理極端 RSI 值', async () => {
      const extremeRsiContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          ...mockContext.indicators,
          rsi: 100 // 極端值
        }
      };

      const result = await analyzer.analyze(extremeRsiContext);
      
      expect(result).toBeDefined();
      expect(result.signal).toBe('sell');
    });

    it('應該處理缺少指標數據', async () => {
      const missingIndicatorsContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          rsi: 65
          // 缺少其他指標
        }
      };

      const result = await analyzer.analyze(missingIndicatorsContext);
      
      expect(result).toBeDefined();
      expect(result.signal).toBeDefined();
    });

    it('應該處理無效的指標值', async () => {
      const invalidContext: AnalysisContext = {
        ...mockContext,
        indicators: {
          rsi: NaN,
          macd: {
            macd: NaN,
            signal: NaN,
            histogram: NaN
          },
          kdj: {
            k: NaN,
            d: NaN,
            j: NaN
          },
          stoch: {
            k: NaN,
            d: NaN
          }
        }
      };

      const result = await analyzer.analyze(invalidContext);
      
      expect(result).toBeDefined();
      expect(result.signal).toBe('hold'); // 無效數據通常建議持有
      expect(result.confidence).toBeLessThan(50); // 信心度應該很低
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內完成分析', async () => {
      const startTime = Date.now();
      
      await analyzer.analyze(mockContext);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(50); // 應該在 50ms 內完成
    });

    it('應該能夠處理大量數據', async () => {
      const largeDataContext: AnalysisContext = {
        ...mockContext,
        data: Array.from({ length: 1000 }, (_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i * 0.1,
          high: 110 + i * 0.1,
          low: 95 + i * 0.1,
          close: 105 + i * 0.1,
          volume: 1000 + i * 10
        }))
      };

      const startTime = Date.now();
      
      await analyzer.analyze(largeDataContext);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(200); // 應該在 200ms 內完成
    });
  });

  describe('信號一致性測試', () => {
    it('應該在相同數據下產生一致的信號', async () => {
      const result1 = await analyzer.analyze(mockContext);
      const result2 = await analyzer.analyze(mockContext);
      
      expect(result1.signal).toBe(result2.signal);
      expect(result1.score).toBeCloseTo(result2.score, 1);
      expect(result1.confidence).toBeCloseTo(result2.confidence, 1);
    });

    it('應該在不同時間戳下產生一致的信號', async () => {
      const context1: AnalysisContext = {
        ...mockContext,
        timestamp: '2024-01-01T10:00:00Z'
      };
      
      const context2: AnalysisContext = {
        ...mockContext,
        timestamp: '2024-01-01T11:00:00Z'
      };

      const result1 = await analyzer.analyze(context1);
      const result2 = await analyzer.analyze(context2);
      
      expect(result1.signal).toBe(result2.signal);
      expect(result1.score).toBeCloseTo(result2.score, 1);
    });
  });

  describe('市場適應性測試', () => {
    it('應該適應不同市場的數據', async () => {
      const twContext: AnalysisContext = {
        ...mockContext,
        market: 'TW',
        symbol: '2330'
      };

      const usContext: AnalysisContext = {
        ...mockContext,
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
