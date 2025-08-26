import { Result } from '@/lib/core/result';
import { StockRepository, StockData, StockSearchResult } from '@/lib/interfaces/stock-repository';
import { StockDataLoader } from '@/lib/modules/stock-data-loader';
import { StockCategoryAnalyzer } from '@/lib/modules/stock-category-analyzer';

export class StockRepositoryImpl implements StockRepository {
  private stocks: StockData[] = [];
  private loaded = false;
  private dataLoader: StockDataLoader;
  private categoryAnalyzer: StockCategoryAnalyzer;

  constructor(
    dataLoader: StockDataLoader,
    categoryAnalyzer: StockCategoryAnalyzer
  ) {
    this.dataLoader = dataLoader;
    this.categoryAnalyzer = categoryAnalyzer;
  }

  /**
   * 搜尋股票
   */
  async searchStocks(query: string, market?: string): Promise<Result<StockSearchResult[]>> {
    try {
      await this.ensureLoaded();
      
      const lowerQuery = query.toLowerCase();
      const results: StockSearchResult[] = [];
      
      for (const stock of this.stocks) {
        const matchesQuery = 
          stock.代號.toLowerCase().includes(lowerQuery) ||
          stock.名稱.toLowerCase().includes(lowerQuery) ||
          stock.yahoo_symbol.toLowerCase().includes(lowerQuery);
        
        const matchesMarket = !market || stock.市場 === market;
        
        if (matchesQuery && matchesMarket) {
          const category = this.categoryAnalyzer.analyzeCategory(stock).category;
          results.push({
            symbol: stock.代號,
            name: stock.名稱,
            market: stock.市場,
            category,
            exchange: stock.交易所 || this.getExchange(stock),
            exchangeName: this.getExchangeName(stock),
            yahoo_symbol: stock.yahoo_symbol,
            source: 'local'
          });
        }
      }
      
      // 排序結果
      results.sort((a, b) => {
        const as = a.symbol.toLowerCase();
        const bs = b.symbol.toLowerCase();
        if (as === lowerQuery && bs !== lowerQuery) return -1;
        if (bs === lowerQuery && as !== lowerQuery) return 1;
        if (as.startsWith(lowerQuery) && !bs.startsWith(lowerQuery)) return -1;
        if (bs.startsWith(lowerQuery) && !as.startsWith(lowerQuery)) return 1;
        return as.localeCompare(bs);
      });
      
      return Result.ok(results.slice(0, 50)); // 限制結果數量
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * 根據代號取得股票
   */
  async getStockBySymbol(symbol: string, market?: string): Promise<Result<StockData | null>> {
    try {
      await this.ensureLoaded();
      
      const stock = this.stocks.find(s => {
        const matchesSymbol = 
          s.代號 === symbol ||
          s.yahoo_symbol === symbol ||
          s.yahoo_symbol === `${symbol}.TW` ||
          s.yahoo_symbol === `${symbol}.TWO`;
        
        const matchesMarket = !market || s.市場 === market;
        
        return matchesSymbol && matchesMarket;
      });
      
      return Result.ok(stock || null);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * 取得所有股票
   */
  async getAllStocks(market?: string): Promise<Result<StockData[]>> {
    try {
      await this.ensureLoaded();
      
      if (market) {
        const filtered = this.stocks.filter(stock => stock.市場 === market);
        return Result.ok(filtered);
      }
      
      return Result.ok(this.stocks);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * 取得市場統計
   */
  async getMarketStats(): Promise<Result<Record<string, number>>> {
    try {
      await this.ensureLoaded();
      
      const stats: Record<string, number> = {};
      
      this.stocks.forEach(stock => {
        stats[stock.市場] = (stats[stock.市場] || 0) + 1;
      });
      
      return Result.ok(stats);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * 檢查股票是否存在
   */
  async stockExists(symbol: string, market?: string): Promise<Result<boolean>> {
    try {
      const result = await this.getStockBySymbol(symbol, market);
      return result.map(stock => stock !== null);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * 重新載入資料
   */
  async reload(): Promise<Result<void>> {
    try {
      this.loaded = false;
      this.stocks = [];
      await this.ensureLoaded();
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * 確保資料已載入
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    
    const result = await this.dataLoader.loadStockData();
    if (result.isFail()) {
      throw result.getError();
    }
    
    this.stocks = result.getData() || [];
    this.loaded = true;
  }

  /**
   * 取得交易所代號
   */
  private getExchange(stock: StockData): string {
    return stock.市場 === '上市' || stock.市場 === '上櫃' ? 'TW' : 'US';
  }

  /**
   * 取得交易所名稱
   */
  private getExchangeName(stock: StockData): string {
    const exchange = this.getExchange(stock);
    return exchange === 'TW' ? '台灣證券交易所' : '美國證券交易所';
  }
}
