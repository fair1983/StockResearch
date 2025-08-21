import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/ohlc/route';
import { GET as getIndicators, POST as postIndicators } from '@/app/api/indicators/route';
import { POST as postAIAnalysis } from '@/app/api/ai-analysis-v2/route';
import { TechnicalIndicatorsCache } from '@/lib/technical-indicators-cache';
import fs from 'fs';
import path from 'path';

// Mock TechnicalIndicatorsCache
jest.mock('@/lib/technical-indicators-cache', () => ({
  TechnicalIndicatorsCache: jest.fn().mockImplementation(() => ({
    calculateAndCacheIndicators: jest.fn().mockResolvedValue({
      ma5: [115, 114, 113, 112, 111],
      ma10: [110, 109, 108, 107, 106],
      ma20: [105, 104, 103, 102, 101],
      ma50: [100, 99, 98, 97, 96],
      ma200: [95, 94, 93, 92, 91],
      rsi: [65, 64, 63, 62, 61],
      macd: { macd: [2.5, 2.4, 2.3, 2.2, 2.1], signal: [2.0, 1.9, 1.8, 1.7, 1.6], histogram: [0.5, 0.4, 0.3, 0.2, 0.1] },
      kdj: { k: [70, 69, 68, 67, 66], d: [65, 64, 63, 62, 61], j: [80, 79, 78, 77, 76] },
      stoch: { k: [75, 74, 73, 72, 71], d: [70, 69, 68, 67, 66] },
      obv: [1000000, 990000, 980000, 970000, 960000],
      atr: [8.5, 8.2, 8.8, 9.1, 8.9],
      bollinger: { upper: [130, 129, 128, 127, 126], middle: [115, 114, 113, 112, 111], lower: [100, 99, 98, 97, 96] }
    }),
    getCachedIndicators: jest.fn().mockResolvedValue(null),
    saveIndicators: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock AIAnalysisOrchestrator
jest.mock('@/lib/ai-analysis/ai-analysis-orchestrator', () => ({
  AIAnalysisOrchestrator: jest.fn().mockImplementation(() => ({
    analyzeStock: jest.fn().mockResolvedValue({
      symbol: '2330',
      market: 'TW',
      interval: '1d',
      timestamp: new Date().toISOString(),
      overallScore: 65,
      overallSignal: 'buy',
      overallConfidence: 75,
      summary: '綜合分析結果',
      recommendations: [
        {
          action: 'buy',
          confidence: 75,
          reasoning: '技術指標顯示買入信號',
          riskLevel: 'medium',
          timeframe: '1-2週'
        }
      ],
      moduleResults: {
        '趨勢分析器': { score: 70, confidence: 80, signal: 'buy', reasoning: '趨勢向上' },
        '動量分析器': { score: 65, confidence: 75, signal: 'buy', reasoning: '動量轉強' },
        '成交量分析器': { score: 60, confidence: 70, signal: 'hold', reasoning: '成交量正常' }
      },
      metadata: {
        totalModules: 3,
        activeModules: 3,
        analysisTime: 150
      }
    })
  }))
}));

// Mock Logger
jest.mock('@/lib/logger', () => ({
  logger: {
    api: {
      request: jest.fn(),
      response: jest.fn(),
      error: jest.fn()
    }
  }
}));

describe('API 端點測試', () => {
  let mockData: any[];

  beforeAll(() => {
    // 載入測試資料
    const testDataPath = path.join(process.cwd(), 'test-data', 'test-stocks-data.json');
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
    mockData = testData.find(stock => stock.symbol === '2330.TW').data;
  });

  describe('OHLC API 端點', () => {
    it('應該能夠處理 GET 請求', async () => {
      const url = new URL('http://localhost:3000/api/ohlc?market=TW&symbol=2330&interval=1d');
      const request = new NextRequest(url);

      const response = await GET(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
    });

    it('應該能夠處理缺少參數的請求', async () => {
      const url = new URL('http://localhost:3000/api/ohlc');
      const request = new NextRequest(url);

      const response = await GET(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('應該能夠處理無效的市場參數', async () => {
      const url = new URL('http://localhost:3000/api/ohlc?market=INVALID&symbol=2330&interval=1d');
      const request = new NextRequest(url);

      const response = await GET(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('技術指標 API 端點', () => {
    it('應該能夠處理 GET 請求', async () => {
      const url = new URL('http://localhost:3000/api/indicators?market=TW&symbol=2330&interval=1d');
      const request = new NextRequest(url);

      const response = await getIndicators(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
    });

    it('應該能夠處理 POST 請求', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: mockData
      };

      const request = new NextRequest('http://localhost:3000/api/indicators', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await postIndicators(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.indicators).toBeDefined();
    });

    it('應該能夠處理無效的 POST 請求', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330',
        interval: '1d'
        // 缺少 data 欄位
      };

      const request = new NextRequest('http://localhost:3000/api/indicators', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await postIndicators(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('AI 分析 API 端點', () => {
    it('應該能夠處理 POST 請求', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: mockData
      };

      const request = new NextRequest('http://localhost:3000/api/ai-analysis-v2', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await postAIAnalysis(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.result).toBeDefined();
      expect(data.result.overallScore).toBeDefined();
      expect(data.result.overallSignal).toBeDefined();
      expect(data.result.moduleResults).toBeDefined();
    });

    it('應該能夠處理缺少參數的請求', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330'
        // 缺少 interval 和 data
      };

      const request = new NextRequest('http://localhost:3000/api/ai-analysis-v2', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await postAIAnalysis(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('應該能夠處理空資料的請求', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: []
      };

      const request = new NextRequest('http://localhost:3000/api/ai-analysis-v2', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await postAIAnalysis(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('錯誤處理測試', () => {
    it('應該處理無效的 JSON 格式', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai-analysis-v2', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await postAIAnalysis(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('應該處理不支援的 HTTP 方法', async () => {
      const request = new NextRequest('http://localhost:3000/api/ohlc', {
        method: 'PUT'
      });

      const response = await GET(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(405);
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內處理 OHLC 請求', async () => {
      const url = new URL('http://localhost:3000/api/ohlc?market=TW&symbol=2330&interval=1d');
      const request = new NextRequest(url);

      const startTime = Date.now();
      const response = await GET(request);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(executionTime).toBeLessThan(1000); // 應該在 1 秒內完成
    });

    it('應該在合理時間內處理技術指標請求', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: mockData
      };

      const request = new NextRequest('http://localhost:3000/api/indicators', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const startTime = Date.now();
      const response = await postIndicators(request);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(executionTime).toBeLessThan(2000); // 應該在 2 秒內完成
    });

    it('應該在合理時間內處理 AI 分析請求', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: mockData
      };

      const request = new NextRequest('http://localhost:3000/api/ai-analysis-v2', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const startTime = Date.now();
      const response = await postAIAnalysis(request);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(executionTime).toBeLessThan(5000); // 應該在 5 秒內完成
    });
  });

  describe('資料驗證測試', () => {
    it('應該驗證市場參數', async () => {
      const invalidMarkets = ['INVALID', 'XX', '123'];
      
      for (const market of invalidMarkets) {
        const url = new URL(`http://localhost:3000/api/ohlc?market=${market}&symbol=2330&interval=1d`);
        const request = new NextRequest(url);

        const response = await GET(request);
        expect(response.status).toBe(400);
      }
    });

    it('應該驗證時間間隔參數', async () => {
      const invalidIntervals = ['invalid', '1h', '1y'];
      
      for (const interval of invalidIntervals) {
        const url = new URL(`http://localhost:3000/api/ohlc?market=TW&symbol=2330&interval=${interval}`);
        const request = new NextRequest(url);

        const response = await GET(request);
        expect(response.status).toBe(400);
      }
    });

    it('應該驗證股票代碼格式', async () => {
      const invalidSymbols = ['', '123', 'ABC123'];
      
      for (const symbol of invalidSymbols) {
        const url = new URL(`http://localhost:3000/api/ohlc?market=TW&symbol=${symbol}&interval=1d`);
        const request = new NextRequest(url);

        const response = await GET(request);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('回應格式測試', () => {
    it('應該返回正確的 OHLC 回應格式', async () => {
      const url = new URL('http://localhost:3000/api/ohlc?market=TW&symbol=2330&interval=1d');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');
      expect(typeof data.success).toBe('boolean');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('應該返回正確的技術指標回應格式', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: mockData
      };

      const request = new NextRequest('http://localhost:3000/api/indicators', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await postIndicators(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('indicators');
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.indicators).toBe('object');
    });

    it('應該返回正確的 AI 分析回應格式', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330',
        interval: '1d',
        data: mockData
      };

      const request = new NextRequest('http://localhost:3000/api/ai-analysis-v2', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await postAIAnalysis(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('result');
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.result).toBe('object');
      expect(data.result).toHaveProperty('overallScore');
      expect(data.result).toHaveProperty('overallSignal');
      expect(data.result).toHaveProperty('moduleResults');
    });
  });
});
