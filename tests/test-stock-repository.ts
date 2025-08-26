import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StockRepositoryImpl } from '@/lib/modules/stock-repository-impl';
import { StockDataLoader } from '@/lib/modules/stock-data-loader';
import { StockCategoryAnalyzer } from '@/lib/modules/stock-category-analyzer';
import { Result } from '@/lib/core/result';
import { StockData } from '@/lib/interfaces/stock-repository';

// Mock 資料
const mockStockData: StockData[] = [
  {
    代號: '2330',
    名稱: '台積電',
    市場: '上市',
    交易所: 'TW',
    yahoo_symbol: '2330.TW',
    ETF: false
  },
  {
    代號: 'AAPL',
    名稱: 'Apple Inc.',
    市場: 'NASDAQ',
    交易所: 'US',
    yahoo_symbol: 'AAPL',
    ETF: false
  },
  {
    代號: '00878',
    名稱: '國泰永續高股息',
    市場: '上市',
    交易所: 'TW',
    yahoo_symbol: '00878.TW',
    ETF: true
  }
];

describe('StockRepositoryImpl', () => {
  let repository: StockRepositoryImpl;
  let mockDataLoader: jest.Mocked<StockDataLoader>;
  let mockCategoryAnalyzer: jest.Mocked<StockCategoryAnalyzer>;

  beforeEach(() => {
    // 建立 Mock
    mockDataLoader = {
      loadStockData: jest.fn()
    } as any;

    mockCategoryAnalyzer = {
      analyzeCategory: jest.fn()
    } as any;

    repository = new StockRepositoryImpl(mockDataLoader, mockCategoryAnalyzer);

    // 設定預設 Mock 行為
    mockDataLoader.loadStockData.mockResolvedValue(Result.ok(mockStockData));
    mockCategoryAnalyzer.analyzeCategory.mockReturnValue({
      category: 'stock',
      confidence: 80,
      reasons: ['台股上市股票']
    });
  });

  describe('searchStocks', () => {
    it('應該能搜尋到台積電', async () => {
      const result = await repository.searchStocks('2330');
      
      expect(result.isOk()).toBe(true);
      const data = result.getData();
      expect(data).toHaveLength(1);
      expect(data![0].symbol).toBe('2330');
      expect(data![0].name).toBe('台積電');
    });

    it('應該能搜尋到 Apple', async () => {
      const result = await repository.searchStocks('AAPL');
      
      expect(result.isOk()).toBe(true);
      const data = result.getData();
      expect(data).toHaveLength(1);
      expect(data![0].symbol).toBe('AAPL');
      expect(data![0].name).toBe('Apple Inc.');
    });

    it('應該能按市場篩選', async () => {
      const result = await repository.searchStocks('', '上市');
      
      expect(result.isOk()).toBe(true);
      const data = result.getData();
      expect(data).toHaveLength(2); // 2330 和 00878
      expect(data!.every(stock => stock.market === '上市')).toBe(true);
    });

    it('應該處理載入失敗', async () => {
      mockDataLoader.loadStockData.mockResolvedValue(
        Result.fail(new Error('載入失敗'))
      );

      const result = await repository.searchStocks('2330');
      
      expect(result.isFail()).toBe(true);
      expect(result.getError()?.message).toBe('載入失敗');
    });
  });

  describe('getStockBySymbol', () => {
    it('應該能根據代號取得股票', async () => {
      const result = await repository.getStockBySymbol('2330');
      
      expect(result.isOk()).toBe(true);
      const stock = result.getData();
      expect(stock).not.toBeNull();
      expect(stock!.代號).toBe('2330');
      expect(stock!.名稱).toBe('台積電');
    });

    it('應該能處理不存在的股票', async () => {
      const result = await repository.getStockBySymbol('9999');
      
      expect(result.isOk()).toBe(true);
      const stock = result.getData();
      expect(stock).toBeNull();
    });
  });

  describe('getMarketStats', () => {
    it('應該能取得市場統計', async () => {
      const result = await repository.getMarketStats();
      
      expect(result.isOk()).toBe(true);
      const stats = result.getData();
      expect(stats!['上市']).toBe(2);
      expect(stats!['NASDAQ']).toBe(1);
    });
  });

  describe('stockExists', () => {
    it('應該能檢查股票是否存在', async () => {
      const result = await repository.stockExists('2330');
      
      expect(result.isOk()).toBe(true);
      expect(result.getData()).toBe(true);
    });

    it('應該能檢查不存在的股票', async () => {
      const result = await repository.stockExists('9999');
      
      expect(result.isOk()).toBe(true);
      expect(result.getData()).toBe(false);
    });
  });
});
