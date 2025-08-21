import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface StockItem {
  symbol: string;
  name: string;
  category: string;
  exchange: string;
}

export interface StockData {
  lastUpdated: string;
  version: string;
  markets: {
    TW: {
      stocks: StockItem[];
      etfs: StockItem[];
    };
    US: {
      stocks: StockItem[];
      etfs: StockItem[];
    };
  };
}

export class StockDataManager {
  private static readonly STOCK_DATA_PATH = path.join(process.cwd(), 'data', 'stocks.json');
  private static instance: StockDataManager;
  private stockData: StockData | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘快取

  private constructor() {}

  public static getInstance(): StockDataManager {
    if (!StockDataManager.instance) {
      StockDataManager.instance = new StockDataManager();
    }
    return StockDataManager.instance;
  }

  /**
   * 載入股票資料
   */
  public async loadStockData(): Promise<StockData> {
    const now = Date.now();
    
    // 檢查快取是否有效
    if (this.stockData && (now - this.lastLoadTime) < this.CACHE_DURATION) {
      logger.system.cache('Using cached stock data');
      return this.stockData;
    }

    try {
      logger.system.performance('Loading stock data from file');
      
      if (!fs.existsSync(StockDataManager.STOCK_DATA_PATH)) {
        throw new Error('Stock data file not found');
      }

      const fileContent = fs.readFileSync(StockDataManager.STOCK_DATA_PATH, 'utf-8');
      this.stockData = JSON.parse(fileContent);
      this.lastLoadTime = now;

      logger.system.performance('Stock data loaded successfully', {
        lastUpdated: this.stockData?.lastUpdated,
        totalStocks: this.getTotalStockCount()
      });

      return this.stockData!;
    } catch (error) {
      logger.api.error('Failed to load stock data', error);
      throw new Error(`無法載入股票資料: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 更新股票資料
   */
  public async updateStockData(newData: StockData): Promise<void> {
    try {
      logger.system.performance('Updating stock data file');
      
      // 確保目錄存在
      const dir = path.dirname(StockDataManager.STOCK_DATA_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 更新時間戳
      newData.lastUpdated = new Date().toISOString();
      
      // 寫入檔案
      fs.writeFileSync(StockDataManager.STOCK_DATA_PATH, JSON.stringify(newData, null, 2), 'utf-8');
      
      // 更新快取
      this.stockData = newData;
      this.lastLoadTime = Date.now();

      logger.system.performance('Stock data updated successfully', {
        lastUpdated: newData.lastUpdated,
        totalStocks: this.getTotalStockCount()
      });
    } catch (error) {
      logger.api.error('Failed to update stock data', error);
      throw new Error(`無法更新股票資料: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 取得所有股票列表
   */
  public async getAllStocks(): Promise<{ market: string; symbol: string; name: string; category: string; exchange: string }[]> {
    const data = await this.loadStockData();
    const allStocks: { market: string; symbol: string; name: string; category: string; exchange: string }[] = [];

    // 台股
    data.markets.TW.stocks.forEach(stock => {
      allStocks.push({ market: 'TW', ...stock });
    });
    data.markets.TW.etfs.forEach(etf => {
      allStocks.push({ market: 'TW', ...etf });
    });

    // 美股
    data.markets.US.stocks.forEach(stock => {
      allStocks.push({ market: 'US', ...stock });
    });
    data.markets.US.etfs.forEach(etf => {
      allStocks.push({ market: 'US', ...etf });
    });

    return allStocks;
  }

  /**
   * 根據市場取得股票列表
   */
  public async getStocksByMarket(market: 'TW' | 'US'): Promise<{ symbol: string; name: string; category: string; exchange: string }[]> {
    const data = await this.loadStockData();
    const stocks = [...data.markets[market].stocks, ...data.markets[market].etfs];
    return stocks;
  }

  /**
   * 搜尋股票
   */
  public async searchStocks(query: string, market?: 'TW' | 'US'): Promise<{ market: string; symbol: string; name: string; category: string; exchange: string }[]> {
    const allStocks = await this.getAllStocks();
    const searchQuery = query.toLowerCase();

    let filteredStocks = allStocks;

    // 按市場篩選
    if (market) {
      filteredStocks = filteredStocks.filter(stock => stock.market === market);
    }

    // 搜尋
    return filteredStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(searchQuery) ||
      stock.name.toLowerCase().includes(searchQuery)
    );
  }

  /**
   * 取得類別列表
   */
  public async getCategories(market?: 'TW' | 'US'): Promise<string[]> {
    const allStocks = await this.getAllStocks();
    let filteredStocks = allStocks;

    if (market) {
      filteredStocks = filteredStocks.filter(stock => stock.market === market);
    }

    const categories = Array.from(new Set(filteredStocks.map(stock => stock.category)));
    return categories.sort();
  }

  /**
   * 取得總股票數量
   */
  private getTotalStockCount(): number {
    if (!this.stockData) return 0;
    
    const twCount = this.stockData.markets.TW.stocks.length + this.stockData.markets.TW.etfs.length;
    const usCount = this.stockData.markets.US.stocks.length + this.stockData.markets.US.etfs.length;
    
    return twCount + usCount;
  }

  /**
   * 取得資料統計
   */
  public async getStats(): Promise<{
    lastUpdated: string;
    totalStocks: number;
    twStocks: number;
    twEtfs: number;
    usStocks: number;
    usEtfs: number;
  }> {
    const data = await this.loadStockData();
    
    return {
      lastUpdated: data.lastUpdated,
      totalStocks: this.getTotalStockCount(),
      twStocks: data.markets.TW.stocks.length,
      twEtfs: data.markets.TW.etfs.length,
      usStocks: data.markets.US.stocks.length,
      usEtfs: data.markets.US.etfs.length,
    };
  }
}
