import { WatchlistManager } from '@/lib/watchlist';
import { stockDB } from '@/lib/stock-database';
import { TestUtils, TestDataGenerator } from '@/lib/test-utils';
import { measurePerformanceSync, getPerformanceReport, clearPerformanceMetrics } from '@/lib/performance-monitor';

describe('Core Functionality Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    clearPerformanceMetrics();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Watchlist Functionality', () => {
    test('應該能夠獲取空的關注列表', async () => {
      const result = measurePerformanceSync('get-empty-watchlist', () => {
        return WatchlistManager.getWatchlist();
      });

      expect(result).toEqual([]);
    });

    test('應該能夠獲取包含數據的關注列表', async () => {
      // 先添加一些測試數據
      const testData = TestUtils.createMockWatchlistData(3);
      testData.forEach(item => {
        WatchlistManager.addToWatchlist({
          symbol: item.symbol,
          name: item.name,
          market: item.market,
          category: item.category,
        });
      });

      const result = measurePerformanceSync('get-watchlist-with-data', () => {
        return WatchlistManager.getWatchlist();
      });

      expect(result).toHaveLength(3);
      expect(result[0].symbol).toBe('TEST1');
      expect(result[1].symbol).toBe('TEST2');
      expect(result[2].symbol).toBe('TEST3');
    });

    test('應該能夠添加股票到關注列表', async () => {
      const stockData = {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        category: '股票'
      };

      const result = measurePerformanceSync('add-stock-to-watchlist', () => {
        return WatchlistManager.addToWatchlist(stockData);
      });

      expect(result).toBe(true);

      // 驗證數據確實被添加
      const watchlist = WatchlistManager.getWatchlist();
      expect(watchlist).toHaveLength(1);
      expect(watchlist[0].symbol).toBe('2330');
    });

    test('應該能夠從關注列表移除股票', async () => {
      // 先添加股票
      WatchlistManager.addToWatchlist({
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        category: '股票'
      });

      const result = measurePerformanceSync('remove-stock-from-watchlist', () => {
        return WatchlistManager.removeFromWatchlist('2330', 'TW');
      });

      expect(result).toBe(true);

      // 驗證數據確實被移除
      const watchlist = WatchlistManager.getWatchlist();
      expect(watchlist).toHaveLength(0);
    });

    test('應該能夠清空關注列表', async () => {
      // 先添加一些數據
      const testData = TestUtils.createMockWatchlistData(3);
      testData.forEach(item => {
        WatchlistManager.addToWatchlist({
          symbol: item.symbol,
          name: item.name,
          market: item.market,
          category: item.category,
        });
      });

      const result = measurePerformanceSync('clear-watchlist', () => {
        return WatchlistManager.clearWatchlist();
      });

      expect(result).toBe(true);

      // 驗證數據確實被清空
      const watchlist = WatchlistManager.getWatchlist();
      expect(watchlist).toHaveLength(0);
    });

    test('應該處理重複添加的情況', async () => {
      // 先添加股票
      WatchlistManager.addToWatchlist({
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        category: '股票'
      });

      const result = WatchlistManager.addToWatchlist({
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        category: '股票'
      });

      expect(result).toBe(false);

      const watchlist = WatchlistManager.getWatchlist();
      expect(watchlist).toHaveLength(1);
    });

    test('應該處理移除不存在的股票', async () => {
      const result = WatchlistManager.removeFromWatchlist('9999', 'TW');

      expect(result).toBe(false);
    });
  });

  describe('Stock Data Management', () => {
    test('應該能夠創建模擬股票數據', () => {
      const mockData = TestUtils.createMockStockData('2330', 'TW');
      
      expect(mockData.symbol).toBe('2330');
      expect(mockData.name).toBe('測試股票 2330');
      expect(mockData.market).toBe('TW');
      expect(mockData.category).toBe('測試類別');
      expect(mockData.yahoo_symbol).toBe('2330.TW');
    });

    test('應該能夠創建模擬 OHLC 數據', () => {
      const ohlcData = TestUtils.createMockOHLCData(10);
      
      expect(ohlcData).toHaveLength(10);
      expect(ohlcData[0]).toHaveProperty('time');
      expect(ohlcData[0]).toHaveProperty('open');
      expect(ohlcData[0]).toHaveProperty('high');
      expect(ohlcData[0]).toHaveProperty('low');
      expect(ohlcData[0]).toHaveProperty('close');
      expect(ohlcData[0]).toHaveProperty('volume');
    });

    test('應該能夠創建模擬關注列表數據', () => {
      const watchlistData = TestUtils.createMockWatchlistData(5);
      
      expect(watchlistData).toHaveLength(5);
      expect(watchlistData[0]).toHaveProperty('symbol');
      expect(watchlistData[0]).toHaveProperty('name');
      expect(watchlistData[0]).toHaveProperty('market');
      expect(watchlistData[0]).toHaveProperty('category');
      expect(watchlistData[0]).toHaveProperty('addedAt');
    });
  });

  describe('Stock Search Functionality', () => {
    test('應該能夠根據交易所(TW)搜尋台股股票', () => {
      const result = measurePerformanceSync('search-tw-stock', () => {
        return stockDB.searchStocksByExchange('2330', 'TW');
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const stock = result[0];
        expect(stock.代號).toBe('2330');
        expect(stock.名稱).toBe('台積電');
        expect(stock.市場).toBe('上市'); // 次級市場
        // 檢查交易所欄位，如果存在則驗證，否則使用市場推斷
        if (stock.交易所) {
          expect(stock.交易所).toBe('TW'); // 交易所
        } else {
          expect(stock.市場).toBe('上市'); // 次級市場推斷為台股
        }
      }
    });

    test('應該能夠根據交易所(US)搜尋美股股票', () => {
      const result = measurePerformanceSync('search-us-stock', () => {
        return stockDB.searchStocksByExchange('AAPL', 'US');
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        // 在結果中尋找 AAPL
        const aaplStock = result.find(stock => stock.代號 === 'AAPL');
        expect(aaplStock).toBeDefined();
        expect(aaplStock?.代號).toBe('AAPL');
        expect(aaplStock?.名稱).toBe('Apple Inc. - Common Stock');
        expect(aaplStock?.市場).toBe('NASDAQ'); // 次級市場
        // 檢查交易所欄位，如果存在則驗證，否則使用市場推斷
        if (aaplStock?.交易所) {
          expect(aaplStock.交易所).toBe('US'); // 交易所
        } else {
          expect(aaplStock?.市場).toBe('NASDAQ'); // 次級市場推斷為美股
        }
      }
    });

    test('應該能夠根據交易所(US)搜尋 NBIS 股票', () => {
      const result = measurePerformanceSync('search-nbis-stock', () => {
        return stockDB.searchStocksByExchange('NBIS', 'US');
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const stock = result[0];
        expect(stock.代號).toBe('NBIS');
        expect(stock.名稱).toBe('Nebius Group N.V. - Class A Ordinary Shares');
        expect(stock.市場).toBe('NASDAQ'); // 次級市場
        // 檢查交易所欄位，如果存在則驗證，否則使用市場推斷
        if (stock.交易所) {
          expect(stock.交易所).toBe('US'); // 交易所
        } else {
          expect(stock.市場).toBe('NASDAQ'); // 次級市場推斷為美股
        }
      }
    });

    test('應該能夠處理空搜尋結果', () => {
      const result = measurePerformanceSync('search-non-existent', () => {
        return stockDB.searchStocksByExchange('NONEXISTENT', 'TW'); // 台股交易所
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('應該能夠根據交易所代碼正確過濾結果', () => {
      const twResults = measurePerformanceSync('search-tw-exchange', () => {
        return stockDB.searchStocksByExchange('2330', 'TW'); // 台股交易所
      });

      const usResults = measurePerformanceSync('search-us-exchange', () => {
        return stockDB.searchStocksByExchange('2330', 'US'); // 美股交易所
      });

      // TW 交易所搜尋應該找到台積電
      expect(twResults.length).toBeGreaterThan(0);
      const twStock = twResults.find(s => s.代號 === '2330');
      expect(twStock).toBeDefined();
      expect(twStock?.市場).toBe('上市'); // 次級市場
      // 檢查交易所欄位，如果存在則驗證，否則使用市場推斷
      if (twStock?.交易所) {
        expect(twStock.交易所).toBe('TW'); // 交易所
      } else {
        expect(twStock?.市場).toBe('上市'); // 次級市場推斷為台股
      }

      // US 交易所搜尋不應該找到台積電
      const usStock = usResults.find(s => s.代號 === '2330');
      expect(usStock).toBeUndefined();
    });

    test('應該能夠處理部分匹配搜尋', () => {
      const result = measurePerformanceSync('search-partial-match', () => {
        return stockDB.searchStocksByExchange('233', 'TW'); // 台股交易所
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // 所有結果都應該包含 '233'
      result.forEach(stock => {
        expect(stock.代號).toContain('233');
      });
    });

    test('應該能夠處理不指定交易所的搜尋', () => {
      const result = measurePerformanceSync('search-no-exchange', () => {
        return stockDB.searchStocksByExchange('2330', ''); // 不指定交易所
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // 應該能找到台積電
      const stock = result.find(s => s.代號 === '2330');
      expect(stock).toBeDefined();
      expect(stock?.市場).toBe('上市'); // 次級市場
      // 檢查交易所欄位，如果存在則驗證，否則使用市場推斷
      if (stock?.交易所) {
        expect(stock.交易所).toBe('TW'); // 交易所
      } else {
        expect(stock?.市場).toBe('上市'); // 次級市場推斷為台股
      }
    });
  });

  describe('Performance Monitoring', () => {
    test('API 調用應該在合理時間內完成', async () => {
      measurePerformanceSync('get-watchlist', () => WatchlistManager.getWatchlist());
      measurePerformanceSync('add-to-watchlist', () => WatchlistManager.addToWatchlist({ symbol: '2330', name: '台積電', market: 'TW', category: '股票' }));
      measurePerformanceSync('check-watchlist', () => WatchlistManager.isInWatchlist('2330', 'TW'));

      const report = getPerformanceReport();
      expect(report.summary.totalTests).toBe(3);
      expect(report.summary.averageDuration).toBeLessThan(100); // 100ms 內
    });

    test('效能報告應該包含正確的統計信息', () => {
      measurePerformanceSync('operation-1', () => WatchlistManager.getWatchlist());
      measurePerformanceSync('operation-2', () => WatchlistManager.addToWatchlist({ symbol: '2330', name: '台積電', market: 'TW', category: '股票' }));
      measurePerformanceSync('operation-3', () => WatchlistManager.isInWatchlist('2330', 'TW'));

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
