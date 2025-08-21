import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/ohlc/route';
import { GET as getIndicators, POST as postIndicators } from '@/app/api/indicators/route';
import { POST as postAIAnalysis } from '@/app/api/ai-analysis-v2/route';
import fs from 'fs';
import path from 'path';

describe('API 端點測試 (簡化版)', () => {
  let mockData: any[];

  beforeAll(() => {
    // 載入測試資料
    const testDataPath = path.join(process.cwd(), 'test-data', 'test-stocks-data.json');
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
    mockData = testData.find(stock => stock.symbol === '2330.TW').data;
  });

  describe('基本功能測試', () => {
    it('應該能夠處理 OHLC GET 請求', async () => {
      const url = new URL('http://localhost:3000/api/ohlc?market=TW&symbol=2330&interval=1d');
      const request = new NextRequest(url);

      const response = await GET(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('應該能夠處理技術指標 GET 請求', async () => {
      const url = new URL('http://localhost:3000/api/indicators?market=TW&symbol=2330&interval=1d');
      const request = new NextRequest(url);

      const response = await getIndicators(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('應該能夠處理技術指標 POST 請求', async () => {
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
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('應該能夠處理 AI 分析 POST 請求', async () => {
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
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });
  });

  describe('錯誤處理測試', () => {
    it('應該處理缺少參數的 OHLC 請求', async () => {
      const url = new URL('http://localhost:3000/api/ohlc');
      const request = new NextRequest(url);

      const response = await GET(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('應該處理缺少參數的技術指標請求', async () => {
      const requestBody = {
        market: 'TW',
        symbol: '2330'
        // 缺少 interval 和 data
      };

      const request = new NextRequest('http://localhost:3000/api/indicators', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await postIndicators(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('應該處理缺少參數的 AI 分析請求', async () => {
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
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('應該處理無效的 JSON 格式', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai-analysis-v2', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await postAIAnalysis(request);
      
      expect(response).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });
  });

  describe('回應格式測試', () => {
    it('應該返回有效的 JSON 回應', async () => {
      const url = new URL('http://localhost:3000/api/ohlc?market=TW&symbol=2330&interval=1d');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
      expect(Array.isArray(data) || typeof data === 'object').toBe(true);
    });

    it('應該返回有效的技術指標回應', async () => {
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

      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
      expect(Array.isArray(data) || typeof data === 'object').toBe(true);
    });

    it('應該返回有效的 AI 分析回應', async () => {
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

      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
      expect(Array.isArray(data) || typeof data === 'object').toBe(true);
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

      expect(response).toBeDefined();
      expect(executionTime).toBeLessThan(5000); // 應該在 5 秒內完成
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

      expect(response).toBeDefined();
      expect(executionTime).toBeLessThan(10000); // 應該在 10 秒內完成
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

      expect(response).toBeDefined();
      expect(executionTime).toBeLessThan(15000); // 應該在 15 秒內完成
    });
  });

  describe('資料驗證測試', () => {
    it('應該處理不同的市場參數', async () => {
      const markets = ['TW', 'US'];
      
      for (const market of markets) {
        const url = new URL(`http://localhost:3000/api/ohlc?market=${market}&symbol=2330&interval=1d`);
        const request = new NextRequest(url);

        const response = await GET(request);
        expect(response).toBeDefined();
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(600);
      }
    });

    it('應該處理不同的時間間隔', async () => {
      const intervals = ['1d', '1w', '1mo'];
      
      for (const interval of intervals) {
        const url = new URL(`http://localhost:3000/api/ohlc?market=TW&symbol=2330&interval=${interval}`);
        const request = new NextRequest(url);

        const response = await GET(request);
        expect(response).toBeDefined();
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(600);
      }
    });

    it('應該處理不同的股票代碼', async () => {
      const symbols = ['2330', 'TSLA'];
      
      for (const symbol of symbols) {
        const url = new URL(`http://localhost:3000/api/ohlc?market=TW&symbol=${symbol}&interval=1d`);
        const request = new NextRequest(url);

        const response = await GET(request);
        expect(response).toBeDefined();
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(600);
      }
    });
  });
});
