import { getHotStocks, isHotStock, getHotStockReason, ALL_HOT_STOCKS } from '@/lib/hot-stocks';
import { TestUtils, TestDataGenerator, TestAssertions } from '@/lib/test-utils';
import { measurePerformanceSync, getPerformanceReport, clearPerformanceMetrics } from '@/lib/performance-monitor';

describe('Hot Stocks', () => {
  beforeEach(() => {
    clearPerformanceMetrics();
  });

  describe('基本功能測試', () => {
    test('應該能夠獲取所有熱門股票', () => {
      const hotStocks = measurePerformanceSync('get-all-hot-stocks', () => {
        return getHotStocks();
      });

      expect(hotStocks).toBeDefined();
      expect(Array.isArray(hotStocks)).toBe(true);
      expect(hotStocks.length).toBeGreaterThan(0);
      expect(hotStocks.length).toBe(ALL_HOT_STOCKS.length);
    });

    test('應該能夠按市場篩選熱門股票', () => {
      const twHotStocks = measurePerformanceSync('get-tw-hot-stocks', () => {
        return getHotStocks('TW');
      });

      const usHotStocks = measurePerformanceSync('get-us-hot-stocks', () => {
        return getHotStocks('US');
      });

      expect(twHotStocks).toBeDefined();
      expect(usHotStocks).toBeDefined();
      expect(Array.isArray(twHotStocks)).toBe(true);
      expect(Array.isArray(usHotStocks)).toBe(true);
      
      // 台股和美股應該有不同的股票
      expect(twHotStocks.length).toBeGreaterThan(0);
      expect(usHotStocks.length).toBeGreaterThan(0);
      
      // 所有台股股票的市場應該是 TW
      twHotStocks.forEach(stock => {
        expect(stock.market).toBe('TW');
      });
      
      // 所有美股股票的市場應該是 US
      usHotStocks.forEach(stock => {
        expect(stock.market).toBe('US');
      });
    });

    test('應該能夠檢查股票是否為熱門股票', () => {
      // 測試台股熱門股票
      const result1 = measurePerformanceSync('check-tw-hot-stock', () => {
        return isHotStock('2330', 'TW');
      });
      expect(result1).toBe(true);

      // 測試美股熱門股票
      const result2 = measurePerformanceSync('check-us-hot-stock', () => {
        return isHotStock('AAPL', 'US');
      });
      expect(result2).toBe(true);

      // 測試非熱門股票
      const result3 = measurePerformanceSync('check-non-hot-stock', () => {
        return isHotStock('9999', 'TW');
      });
      expect(result3).toBe(false);
    });

    test('應該能夠獲取熱門股票原因', () => {
      const reason1 = measurePerformanceSync('get-tw-hot-stock-reason', () => {
        return getHotStockReason('2330', 'TW');
      });
      expect(reason1).toBeDefined();
      expect(typeof reason1).toBe('string');
      expect(reason1).toBe('全球晶圓代工龍頭');

      const reason2 = measurePerformanceSync('get-us-hot-stock-reason', () => {
        return getHotStockReason('AAPL', 'US');
      });
      expect(reason2).toBeDefined();
      expect(typeof reason2).toBe('string');
      expect(reason2).toBe('全球科技巨頭');

      // 非熱門股票應該返回 null
      const reason3 = getHotStockReason('9999', 'TW');
      expect(reason3).toBeNull();
    });
  });

  describe('數據格式測試', () => {
    test('熱門股票數據應該有正確的格式', () => {
      const hotStocks = getHotStocks();
      
      hotStocks.forEach(stock => {
        expect(stock).toHaveProperty('symbol');
        expect(stock).toHaveProperty('name');
        expect(stock).toHaveProperty('market');
        expect(stock).toHaveProperty('category');
        expect(stock).toHaveProperty('reason');
        
        expect(typeof stock.symbol).toBe('string');
        expect(typeof stock.name).toBe('string');
        expect(['TW', 'US']).toContain(stock.market);
        expect(typeof stock.category).toBe('string');
        expect(typeof stock.reason).toBe('string');
        
        expect(stock.symbol.length).toBeGreaterThan(0);
        expect(stock.name.length).toBeGreaterThan(0);
        expect(stock.reason.length).toBeGreaterThan(0);
      });
    });

    test('台股熱門股票應該包含主要股票', () => {
      const twHotStocks = getHotStocks('TW');
      const symbols = twHotStocks.map(stock => stock.symbol);
      
      // 檢查是否包含主要台股
      expect(symbols).toContain('2330'); // 台積電
      expect(symbols).toContain('2317'); // 鴻海
      expect(symbols).toContain('2454'); // 聯發科
      expect(symbols).toContain('0050'); // 元大台灣50
      expect(symbols).toContain('0056'); // 元大高股息
    });

    test('美股熱門股票應該包含主要股票', () => {
      const usHotStocks = getHotStocks('US');
      const symbols = usHotStocks.map(stock => stock.symbol);
      
      // 檢查是否包含主要美股
      expect(symbols).toContain('AAPL'); // Apple
      expect(symbols).toContain('MSFT'); // Microsoft
      expect(symbols).toContain('GOOGL'); // Google
      expect(symbols).toContain('AMZN'); // Amazon
      expect(symbols).toContain('SPY'); // SPDR S&P 500
      expect(symbols).toContain('QQQ'); // Invesco QQQ
    });
  });

  describe('分類測試', () => {
    test('應該包含不同類別的股票', () => {
      const hotStocks = getHotStocks();
      const categories = new Set(hotStocks.map(stock => stock.category));
      
      expect(categories.size).toBeGreaterThan(1);
      expect(categories).toContain('ETF');
    });

    test('台股應該包含主要類別', () => {
      const twHotStocks = getHotStocks('TW');
      const categories = new Set(twHotStocks.map(stock => stock.category));
      
      expect(categories).toContain('半導體');
      expect(categories).toContain('電子');
      expect(categories).toContain('金融');
      expect(categories).toContain('ETF');
    });

    test('美股應該包含主要類別', () => {
      const usHotStocks = getHotStocks('US');
      const categories = new Set(usHotStocks.map(stock => stock.category));
      
      expect(categories).toContain('科技');
      expect(categories).toContain('金融');
      expect(categories).toContain('消費品');
      expect(categories).toContain('ETF');
    });
  });

  describe('效能測試', () => {
    test('查詢熱門股票應該快速', () => {
      const startTime = performance.now();
      
      // 執行多次查詢
      for (let i = 0; i < 1000; i++) {
        isHotStock('2330', 'TW');
        isHotStock('AAPL', 'US');
        getHotStockReason('2330', 'TW');
        getHotStockReason('AAPL', 'US');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // 應該在 100ms 內完成
    });

    test('獲取熱門股票列表應該快速', () => {
      const startTime = performance.now();
      
      // 執行多次獲取
      for (let i = 0; i < 100; i++) {
        getHotStocks();
        getHotStocks('TW');
        getHotStocks('US');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 應該在 1 秒內完成
    });
  });

  describe('邊界情況測試', () => {
    test('應該處理無效的市場參數', () => {
      const result = getHotStocks('INVALID' as any);
      expect(result).toEqual([]);
    });

    test('應該處理空字符串市場參數', () => {
      const result = getHotStocks('');
      expect(result).toEqual(ALL_HOT_STOCKS);
    });

    test('應該處理 null 市場參數', () => {
      const result = getHotStocks(null as any);
      expect(result).toEqual(ALL_HOT_STOCKS);
    });

    test('應該處理 undefined 市場參數', () => {
      const result = getHotStocks(undefined as any);
      expect(result).toEqual(ALL_HOT_STOCKS);
    });
  });

  describe('數據完整性測試', () => {
    test('所有熱門股票都應該有唯一性', () => {
      const hotStocks = getHotStocks();
      const symbols = hotStocks.map(stock => `${stock.symbol}-${stock.market}`);
      const uniqueSymbols = new Set(symbols);
      
      expect(uniqueSymbols.size).toBe(hotStocks.length);
    });

    test('股票代碼不應該重複', () => {
      const hotStocks = getHotStocks();
      const symbols = hotStocks.map(stock => stock.symbol);
      const uniqueSymbols = new Set(symbols);
      
      // 允許不同市場有相同代碼（如 ETF）
      expect(uniqueSymbols.size).toBeLessThanOrEqual(hotStocks.length);
    });

    test('所有股票都應該有合理的原因說明', () => {
      const hotStocks = getHotStocks();
      
      hotStocks.forEach(stock => {
        expect(stock.reason).toBeDefined();
        expect(stock.reason.length).toBeGreaterThan(0);
        expect(stock.reason.length).toBeLessThan(100); // 原因不應該太長
      });
    });
  });

  describe('效能監控測試', () => {
    test('應該記錄效能指標', () => {
      measurePerformanceSync('test-get-hot-stocks', () => {
        return getHotStocks();
      });

      measurePerformanceSync('test-is-hot-stock', () => {
        return isHotStock('2330', 'TW');
      });

      measurePerformanceSync('test-get-hot-stock-reason', () => {
        return getHotStockReason('2330', 'TW');
      });

      const report = getPerformanceReport();
      expect(report.metrics).toHaveLength(3);
      expect(report.summary.totalTests).toBe(3);
      expect(report.summary.averageDuration).toBeGreaterThan(0);
    });

    test('效能報告應該包含正確的統計信息', () => {
      const operations = [
        () => getHotStocks(),
        () => getHotStocks('TW'),
        () => getHotStocks('US'),
        () => isHotStock('2330', 'TW'),
        () => getHotStockReason('2330', 'TW'),
      ];

      operations.forEach((op, index) => {
        measurePerformanceSync(`operation-${index}`, op);
      });

      const report = getPerformanceReport();
      expect(report.summary.totalTests).toBe(5);
      expect(report.summary.passedTests).toBe(5);
      expect(report.summary.failedTests).toBe(0);
      expect(report.summary.slowestTest).toBeDefined();
      expect(report.summary.fastestTest).toBeDefined();
    });
  });

  describe('實際數據驗證', () => {
    test('台股熱門股票數量應該合理', () => {
      const twHotStocks = getHotStocks('TW');
      expect(twHotStocks.length).toBeGreaterThanOrEqual(20);
      expect(twHotStocks.length).toBeLessThanOrEqual(30);
    });

    test('美股熱門股票數量應該合理', () => {
      const usHotStocks = getHotStocks('US');
      expect(usHotStocks.length).toBeGreaterThanOrEqual(20);
      expect(usHotStocks.length).toBeLessThanOrEqual(30);
    });

    test('總熱門股票數量應該合理', () => {
      const allHotStocks = getHotStocks();
      expect(allHotStocks.length).toBeGreaterThanOrEqual(40);
      expect(allHotStocks.length).toBeLessThanOrEqual(60);
    });

    test('ETF 數量應該合理', () => {
      const hotStocks = getHotStocks();
      const etfs = hotStocks.filter(stock => stock.category === 'ETF');
      expect(etfs.length).toBeGreaterThanOrEqual(10);
      expect(etfs.length).toBeLessThanOrEqual(20);
    });
  });
});
