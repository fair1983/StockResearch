import { WatchlistManager } from '@/lib/watchlist';
import { TestUtils, TestDataGenerator, TestAssertions } from '@/lib/test-utils';
import { measurePerformanceSync, getPerformanceReport, clearPerformanceMetrics } from '@/lib/performance-monitor';

describe('WatchlistManager', () => {
  beforeEach(() => {
    // 清除 localStorage 模擬
    localStorage.clear();
    clearPerformanceMetrics();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基本功能測試', () => {
    test('應該能夠添加股票到關注列表', async () => {
      const stock = TestDataGenerator.generateStockSymbol('TW');
      const stockData = {
        symbol: stock,
        name: TestDataGenerator.generateStockName(),
        market: 'TW',
        category: '股票'
      };

      const result = measurePerformanceSync('add-to-watchlist', () => {
        return WatchlistManager.addToWatchlist(stockData);
      });

      expect(result).toBe(true);
      
      const watchlist = WatchlistManager.getWatchlist();
      expect(watchlist).toHaveLength(1);
      expect(watchlist[0].symbol).toBe(stock);
      expect(watchlist[0].market).toBe('TW');
    });

    test('應該能夠從關注列表移除股票', async () => {
      // 先添加股票
      const stock = TestDataGenerator.generateStockSymbol('TW');
      const stockData = {
        symbol: stock,
        name: TestDataGenerator.generateStockName(),
        market: 'TW',
        category: '股票'
      };

      WatchlistManager.addToWatchlist(stockData);

      // 然後移除
      const result = measurePerformanceSync('remove-from-watchlist', () => {
        return WatchlistManager.removeFromWatchlist(stock, 'TW');
      });

      expect(result).toBe(true);
      
      const watchlist = WatchlistManager.getWatchlist();
      expect(watchlist).toHaveLength(0);
    });

    test('應該能夠檢查股票是否在關注列表中', () => {
      const stock = TestDataGenerator.generateStockSymbol('TW');
      const stockData = {
        symbol: stock,
        name: TestDataGenerator.generateStockName(),
        market: 'TW',
        category: '股票'
      };

      // 初始狀態應該不在列表中
      expect(WatchlistManager.isInWatchlist(stock, 'TW')).toBe(false);

      // 添加後應該在列表中
      WatchlistManager.addToWatchlist(stockData);
      expect(WatchlistManager.isInWatchlist(stock, 'TW')).toBe(true);
    });

    test('不應該重複添加相同的股票', () => {
      const stock = TestDataGenerator.generateStockSymbol('TW');
      const stockData = {
        symbol: stock,
        name: TestDataGenerator.generateStockName(),
        market: 'TW',
        category: '股票'
      };

      // 第一次添加應該成功
      expect(WatchlistManager.addToWatchlist(stockData)).toBe(true);
      
      // 第二次添加應該失敗
      expect(WatchlistManager.addToWatchlist(stockData)).toBe(false);
      
      const watchlist = WatchlistManager.getWatchlist();
      expect(watchlist).toHaveLength(1);
    });
  });

  describe('數據格式測試', () => {
    test('關注列表數據應該有正確的格式', () => {
      const mockData = TestUtils.createMockWatchlistData(3);
      
      TestAssertions.validateWatchlistData(mockData);
    });

    test('添加的股票應該包含所有必要字段', () => {
      const stock = TestDataGenerator.generateStockSymbol('US');
      const stockData = {
        symbol: stock,
        name: TestDataGenerator.generateStockName(),
        market: 'US',
        category: 'ETF'
      };

      WatchlistManager.addToWatchlist(stockData);
      const watchlist = WatchlistManager.getWatchlist();
      
      expect(watchlist).toHaveLength(1);
      const addedStock = watchlist[0];
      
      expect(addedStock).toHaveProperty('symbol');
      expect(addedStock).toHaveProperty('name');
      expect(addedStock).toHaveProperty('market');
      expect(addedStock).toHaveProperty('category');
      expect(addedStock).toHaveProperty('addedAt');
      
      expect(addedStock.symbol).toBe(stock);
      expect(addedStock.market).toBe('US');
      expect(addedStock.category).toBe('ETF');
      expect(new Date(addedStock.addedAt)).toBeInstanceOf(Date);
    });
  });

  describe('統計功能測試', () => {
    test('應該能夠獲取關注列表統計', () => {
      // 添加一些測試數據
      const stocks = [
        { symbol: '2330', name: '台積電', market: 'TW', category: '股票' },
        { symbol: 'AAPL', name: 'Apple', market: 'US', category: '股票' },
        { symbol: '0050', name: '元大台灣50', market: 'TW', category: 'ETF' },
        { symbol: 'SPY', name: 'SPDR S&P 500', market: 'US', category: 'ETF' },
      ];

      stocks.forEach(stock => WatchlistManager.addToWatchlist(stock));

      const stats = measurePerformanceSync('get-watchlist-stats', () => {
        return WatchlistManager.getWatchlistStats();
      });

      expect(stats.total).toBe(4);
      expect(stats.byMarket.TW).toBe(2);
      expect(stats.byMarket.US).toBe(2);
      expect(stats.byCategory.ETF).toBe(2);
      expect(stats.byCategory.股票).toBe(2);
    });

    test('空列表的統計應該正確', () => {
      const stats = WatchlistManager.getWatchlistStats();
      
      expect(stats.total).toBe(0);
      expect(stats.byMarket).toEqual({});
      expect(stats.byCategory).toEqual({});
    });
  });

  describe('清空功能測試', () => {
    test('應該能夠清空關注列表', () => {
      // 添加一些數據
      const stockData = {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        category: '股票'
      };
      
      WatchlistManager.addToWatchlist(stockData);
      expect(WatchlistManager.getWatchlist()).toHaveLength(1);

      // 清空列表
      WatchlistManager.clearWatchlist();
      expect(WatchlistManager.getWatchlist()).toHaveLength(0);
    });
  });

  describe('效能測試', () => {
    test('大量數據操作應該在合理時間內完成', () => {
      const startTime = performance.now();
      
      // 添加 100 個股票
      for (let i = 0; i < 100; i++) {
        const stockData = {
          symbol: `TEST${i}`,
          name: `測試股票 ${i}`,
          market: i % 2 === 0 ? 'TW' : 'US',
          category: i % 2 === 0 ? '股票' : 'ETF'
        };
        WatchlistManager.addToWatchlist(stockData);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 應該在 1 秒內完成
      expect(WatchlistManager.getWatchlist()).toHaveLength(100);
    });

    test('查詢操作應該快速', () => {
      // 先添加一些數據
      const stockData = {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        category: '股票'
      };
      WatchlistManager.addToWatchlist(stockData);

      const startTime = performance.now();
      
      // 執行多次查詢
      for (let i = 0; i < 1000; i++) {
        WatchlistManager.isInWatchlist('2330', 'TW');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // 應該在 100ms 內完成
    });
  });

  describe('錯誤處理測試', () => {
    test('應該能夠處理 localStorage 錯誤', () => {
      // 抑制 console.error 以避免測試輸出中的錯誤信息
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // 模擬 localStorage 錯誤
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('localStorage error');
      });

      // 應該返回空數組而不是崩潰
      const watchlist = WatchlistManager.getWatchlist();
      expect(watchlist).toEqual([]);

      // 恢復原始函數
      localStorage.getItem = originalGetItem;
      
      // 恢復 console.error
      console.error = originalConsoleError;
    });

    test('應該能夠處理無效的 JSON 數據', () => {
      // 抑制 console.error 以避免測試輸出中的錯誤信息
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // 模擬無效的 JSON 數據
      localStorage.setItem('stock_watchlist', 'invalid json');

      // 應該返回空數組而不是崩潰
      const watchlist = WatchlistManager.getWatchlist();
      expect(watchlist).toEqual([]);

      // 恢復 console.error
      console.error = originalConsoleError;
    });
  });

  describe('效能監控測試', () => {
    test('應該記錄效能指標', () => {
      const stockData = {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        category: '股票'
      };

      measurePerformanceSync('test-add-stock', () => {
        return WatchlistManager.addToWatchlist(stockData);
      });

      const report = getPerformanceReport();
      expect(report.metrics).toHaveLength(1);
      expect(report.metrics[0].name).toBe('test-add-stock');
      expect(report.metrics[0].duration).toBeDefined();
      expect(report.metrics[0].duration).toBeGreaterThan(0);
    });

    test('效能報告應該包含正確的統計信息', () => {
      // 執行多個操作
      const operations = [
        () => WatchlistManager.addToWatchlist({ symbol: '2330', name: '台積電', market: 'TW', category: '股票' }),
        () => WatchlistManager.addToWatchlist({ symbol: 'AAPL', name: 'Apple', market: 'US', category: '股票' }),
        () => WatchlistManager.isInWatchlist('2330', 'TW'),
      ];

      operations.forEach((op, index) => {
        measurePerformanceSync(`operation-${index}`, op);
      });

      const report = getPerformanceReport();
      expect(report.summary.totalTests).toBe(3);
      expect(report.summary.passedTests).toBe(3);
      expect(report.summary.failedTests).toBe(0);
      expect(report.summary.averageDuration).toBeGreaterThan(0);
      expect(report.summary.slowestTest).toBeDefined();
      expect(report.summary.fastestTest).toBeDefined();
    });
  });
});
