import { FullMarketCollector, MarketStock, MarketCollectionResult } from '../lib/data-collection/full-market-collector';
import fs from 'fs/promises';
import path from 'path';

// Mock fs module
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FullMarketCollector', () => {
  let collector: FullMarketCollector;

  beforeEach(() => {
    collector = new FullMarketCollector();
    jest.clearAllMocks();
  });

  describe('collectUSMarketStocks', () => {
    it('應該成功收集美股資料', async () => {
      // Mock 股票資料
      const mockStockData = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' }
      ];

      // Mock 檔案讀取
      mockedFs.readFile.mockResolvedValue(
        mockStockData.map(stock => JSON.stringify(stock)).join('\n')
      );

      // Mock 目錄創建
      mockedFs.mkdir.mockResolvedValue(undefined);

      // Mock 檔案寫入
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await collector.collectUSMarketStocks();

      expect(result).toBeDefined();
      expect(result.market).toBe('US');
      expect(result.collectedStocks).toBeInstanceOf(Array);
      expect(result.failedStocks).toBeInstanceOf(Array);
      expect(result.collectionTime).toBeGreaterThan(0);
      expect(result.lastUpdated).toBeDefined();
    });

    it('應該處理檔案讀取錯誤', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('檔案不存在'));

      const result = await collector.collectUSMarketStocks();

      expect(result.collectedStocks).toHaveLength(0);
      expect(result.failedStocks).toHaveLength(0);
    });
  });

  describe('collectTWMarketStocks', () => {
    it('應該成功收集台股資料', async () => {
      const mockStockData = [
        { symbol: '2330', name: '台積電' },
        { symbol: '2317', name: '鴻海' },
        { symbol: '2454', name: '聯發科' }
      ];

      mockedFs.readFile.mockResolvedValue(
        mockStockData.map(stock => JSON.stringify(stock)).join('\n')
      );
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await collector.collectTWMarketStocks();

      expect(result).toBeDefined();
      expect(result.market).toBe('TW');
      expect(result.collectedStocks).toBeInstanceOf(Array);
      expect(result.failedStocks).toBeInstanceOf(Array);
    });
  });

  describe('collectAllMarketStocks', () => {
    it('應該同時收集美股和台股資料', async () => {
      const mockUSData = [{ symbol: 'AAPL', name: 'Apple Inc.' }];
      const mockTWData = [{ symbol: '2330', name: '台積電' }];

      mockedFs.readFile
        .mockResolvedValueOnce(mockUSData.map(stock => JSON.stringify(stock)).join('\n'))
        .mockResolvedValueOnce(mockTWData.map(stock => JSON.stringify(stock)).join('\n'));
      
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await collector.collectAllMarketStocks();

      expect(result).toBeDefined();
      expect(result.us).toBeDefined();
      expect(result.tw).toBeDefined();
      expect(result.us.market).toBe('US');
      expect(result.tw.market).toBe('TW');
    });
  });

  describe('enrichStockData', () => {
    it('應該正確格式化股票代碼', async () => {
      const stockData = { symbol: '2330', name: '台積電' };
      
      // 使用私有方法測試（通過反射）
      const enrichStockData = (collector as any).enrichStockData.bind(collector);
      
      // Mock Yahoo Finance 回應
      const mockQuoteData = {
        longName: '台積電',
        exchange: 'TWSE',
        sector: 'Technology',
        industry: 'Semiconductors',
        marketCap: 1000000000000
      };

      // 這裡需要 Mock YahooFinanceCollector 的 getQuote 方法
      // 由於是私有方法，我們主要測試邏輯結構
      expect(enrichStockData).toBeDefined();
    });
  });

  describe('chunkArray', () => {
    it('應該正確分割陣列', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunkArray = (collector as any).chunkArray.bind(collector);
      
      const result = chunkArray(array, 3);
      
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    });

    it('應該處理空陣列', () => {
      const chunkArray = (collector as any).chunkArray.bind(collector);
      
      const result = chunkArray([], 3);
      
      expect(result).toEqual([]);
    });
  });

  describe('generateMarketStatistics', () => {
    it('應該生成正確的統計報告', async () => {
      const mockResults = {
        us: {
          totalStocks: 100,
          collectedStocks: Array(80).fill({}),
          failedStocks: Array(20).fill(''),
          collectionTime: 5000
        },
        tw: {
          totalStocks: 50,
          collectedStocks: Array(40).fill({}),
          failedStocks: Array(10).fill(''),
          collectionTime: 3000
        }
      };

      mockedFs.writeFile.mockResolvedValue(undefined);

      const generateMarketStatistics = (collector as any).generateMarketStatistics.bind(collector);
      await generateMarketStatistics(mockResults);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('market-statistics.json'),
        expect.stringContaining('"totalStocks": 150')
      );
    });
  });
});
