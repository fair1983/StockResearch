import { TechnicalIndicatorsCache } from '@/lib/technical-indicators-cache';
import { Candle } from '@/types';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn()
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn(),
  dirname: jest.fn()
}));

describe('TechnicalIndicatorsCache', () => {
  let cache: TechnicalIndicatorsCache;
  let mockData: Candle[];
  let mockIndicators: any;

  beforeEach(() => {
    cache = new TechnicalIndicatorsCache();
    
    mockData = [
      { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
      { time: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1200 },
      { time: '2024-01-03', open: 110, high: 120, low: 105, close: 115, volume: 1300 }
    ];

    mockIndicators = {
      ma: { ma5: 115, ma10: 110, ma20: 105 },
      rsi: 65,
      macd: { macd: 2.5, signal: 2.0, histogram: 0.5 },
      kdj: { k: 70, d: 65, j: 80 },
      stoch: { k: 75, d: 70 },
      obv: 1000000,
      atr: 8.5,
      boll: { upper: 130, middle: 115, lower: 100 }
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('基本功能測試', () => {
    it('應該正確初始化快取系統', () => {
      expect(cache).toBeDefined();
      expect(typeof cache.getCachedIndicators).toBe('function');
      expect(typeof cache.saveIndicators).toBe('function');
      expect(typeof cache.calculateAndCacheIndicators).toBe('function');
    });

    it('應該能夠計算並快取指標', async () => {
      // Mock fs.existsSync to return false (cache doesn't exist)
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await cache.calculateAndCacheIndicators('TW', '2330', '1d', mockData);
      
      expect(result).toBeDefined();
      expect(result.ma).toBeDefined();
      expect(result.rsi).toBeDefined();
      expect(result.macd).toBeDefined();
    });
  });

  describe('快取讀取測試', () => {
    it('應該能夠讀取快取的指標', async () => {
      const mockCacheData = {
        indicators: mockIndicators,
        dataHash: 'test-hash',
        lastUpdated: new Date().toISOString()
      };

      // Mock fs.existsSync to return true (cache exists)
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockCacheData));

      const result = await cache.getCachedIndicators('TW', '2330', '1d', mockData);
      
      expect(result).toBeDefined();
      expect(result).toEqual(mockIndicators);
    });

    it('應該在快取不存在時返回 null', async () => {
      // Mock fs.existsSync to return false (cache doesn't exist)
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await cache.getCachedIndicators('TW', '2330', '1d', mockData);
      
      expect(result).toBeNull();
    });
  });

  describe('快取儲存測試', () => {
    it('應該能夠儲存指標到快取', async () => {
      // Mock fs operations
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      await cache.saveIndicators('TW', '2330', '1d', mockData, mockIndicators);
      
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('應該在目錄不存在時創建目錄', async () => {
      // Mock fs.existsSync to return false for directory
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      await cache.saveIndicators('TW', '2330', '1d', mockData, mockIndicators);
      
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('快取過期測試', () => {
    it('應該在快取過期時返回 null', async () => {
      const expiredCacheData = {
        indicators: mockIndicators,
        dataHash: 'test-hash',
        lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      };

      // Mock fs.existsSync to return true (cache exists)
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(expiredCacheData));

      const result = await cache.getCachedIndicators('TW', '2330', '1d', mockData);
      
      expect(result).toBeNull();
    });

    it('應該在快取未過期時返回數據', async () => {
      const validCacheData = {
        indicators: mockIndicators,
        dataHash: 'test-hash',
        lastUpdated: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
      };

      // Mock fs.existsSync to return true (cache exists)
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(validCacheData));

      const result = await cache.getCachedIndicators('TW', '2330', '1d', mockData);
      
      expect(result).toBeDefined();
      expect(result).toEqual(mockIndicators);
    });
  });

  describe('數據雜湊測試', () => {
    it('應該在數據變化時重新計算指標', async () => {
      const differentData = [
        { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
        { time: '2024-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1200 },
        { time: '2024-01-03', open: 110, high: 120, low: 105, close: 115, volume: 1500 } // 不同的成交量
      ];

      const mockCacheData = {
        indicators: mockIndicators,
        dataHash: 'original-hash',
        lastUpdated: new Date().toISOString()
      };

      // Mock fs.existsSync to return true (cache exists)
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockCacheData));

      const result = await cache.getCachedIndicators('TW', '2330', '1d', differentData);
      
      // 由於數據雜湊不同，應該返回 null
      expect(result).toBeNull();
    });
  });

  describe('快取清理測試', () => {
    it('應該能夠清理特定市場和股票的快取', async () => {
      // Mock fs operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await cache.clearIndicatorsCache('TW', '2330');
      
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('應該能夠清理特定時間間隔的快取', async () => {
      // Mock fs operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await cache.clearIndicatorsCache('TW', '2330', '1d');
      
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });

  describe('快取統計測試', () => {
    it('應該能夠獲取快取統計信息', async () => {
      const mockFiles = ['file1.json', 'file2.json', 'file3.json'];
      const mockStats = { size: 1024 };

      // Mock fs operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
      (fs.statSync as jest.Mock).mockReturnValue(mockStats);

      const stats = await cache.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBe(3072); // 3 files * 1024 bytes
      expect(stats.markets).toBeDefined();
    });

    it('應該在快取目錄不存在時返回空統計', async () => {
      // Mock fs.existsSync to return false (cache directory doesn't exist)
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const stats = await cache.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.markets).toEqual({});
    });
  });

  describe('錯誤處理測試', () => {
    it('應該處理文件讀取錯誤', async () => {
      // Mock fs.existsSync to return true (cache exists)
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await cache.getCachedIndicators('TW', '2330', '1d', mockData);
      
      expect(result).toBeNull();
    });

    it('應該處理文件寫入錯誤', async () => {
      // Mock fs operations
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File write error');
      });

      // 應該不會拋出錯誤，而是靜默處理
      await expect(cache.saveIndicators('TW', '2330', '1d', mockData, mockIndicators))
        .resolves.not.toThrow();
    });

    it('應該處理目錄創建錯誤', async () => {
      // Mock fs.existsSync to return false (directory doesn't exist)
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Directory creation error');
      });

      // 應該不會拋出錯誤，而是靜默處理
      await expect(cache.saveIndicators('TW', '2330', '1d', mockData, mockIndicators))
        .resolves.not.toThrow();
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內完成快取操作', async () => {
      // Mock fs operations
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const startTime = Date.now();
      
      await cache.calculateAndCacheIndicators('TW', '2330', '1d', mockData);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(1000); // 應該在 1 秒內完成
    });

    it('應該能夠處理大量數據', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 110 + i,
        low: 95 + i,
        close: 105 + i,
        volume: 1000 + i * 10
      }));

      // Mock fs operations
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const startTime = Date.now();
      
      await cache.calculateAndCacheIndicators('TW', '2330', '1d', largeData);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(5000); // 應該在 5 秒內完成
    });
  });

  describe('市場適應性測試', () => {
    it('應該適應不同市場的數據', async () => {
      // Mock fs operations
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const twResult = await cache.calculateAndCacheIndicators('TW', '2330', '1d', mockData);
      const usResult = await cache.calculateAndCacheIndicators('US', 'AAPL', '1d', mockData);
      
      expect(twResult).toBeDefined();
      expect(usResult).toBeDefined();
      expect(twResult.ma).toBeDefined();
      expect(usResult.ma).toBeDefined();
    });
  });
});
