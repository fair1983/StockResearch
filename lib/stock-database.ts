import fs from 'fs';
import path from 'path';

export interface StockData {
  代號: string;
  名稱: string;
  市場: string;
  交易所?: string;
  yahoo_symbol: string;
  ISIN?: string;
  上市日期?: string;
  產業?: string;
  ETF?: boolean;
  CIK?: string;
}

export interface CategoryStats {
  stock: number;
  etf: number;
  [key: string]: number;
}

export interface MarketStats {
  [market: string]: {
    total: number;
    categories: CategoryStats;
  };
}

export class StockDatabase {
  private stocks: StockData[] = [];
  private loaded = false;

  constructor() {
    this.loadStocks();
  }

  /**
   * 載入所有股票資料
   */
  private loadStocks(): void {
    if (this.loaded) return;

    const dataDir = path.join(process.cwd(), 'data');
    
    try {
      // 尋找最新的完整股票資料檔案
      const files = fs.readdirSync(dataDir);
      const stockDataFiles = files
        .filter(file => file.startsWith('stocks_data_') && file.endsWith('.jsonl'))
        .sort()
        .reverse(); // 最新的在前面
      
      if (stockDataFiles.length > 0) {
        const mainFile = path.join(dataDir, stockDataFiles[0]);
        const content = fs.readFileSync(mainFile, 'utf-8');
        const lines = content.trim().split('\n');
        
        this.stocks = lines.map(line => {
          try {
            return JSON.parse(line) as StockData;
          } catch (e) {
            console.warn('解析股票資料失敗:', line);
            return null;
          }
        }).filter(Boolean) as StockData[];
        
        console.log(`✅ 已載入 ${this.stocks.length} 支股票資料 (檔案: ${stockDataFiles[0]})`);
      } else {
        console.warn('⚠️ 找不到股票資料檔案，嘗試載入其他格式');
        this.loadAlternativeData();
      }
      
      this.loaded = true;
    } catch (error) {
      console.error('❌ 載入股票資料失敗:', error);
      this.loadFallbackData();
    }
  }

  /**
   * 載入其他格式的資料
   */
  private loadAlternativeData(): void {
    const dataDir = path.join(process.cwd(), 'data');
    
    try {
      // 嘗試載入 tw_all_stocks.jsonl
      const twFile = path.join(dataDir, 'tw_all_stocks.jsonl');
      if (fs.existsSync(twFile)) {
        const content = fs.readFileSync(twFile, 'utf-8');
        const lines = content.trim().split('\n');
        
        this.stocks = lines.map(line => {
          try {
            const data = JSON.parse(line);
            return {
              代號: data.代號 || data.symbol,
              名稱: data.名稱 || data.name,
              市場: data.市場 || '上市',
              交易所: data.交易所 || 'TW',
              yahoo_symbol: data.yahoo_symbol || `${data.代號 || data.symbol}.TW`,
              ISIN: data.ISIN,
              上市日期: data.上市日期,
              產業: data.產業,
              ETF: data.ETF || false
            } as StockData;
          } catch (e) {
            console.warn('解析台股資料失敗:', line);
            return null;
          }
        }).filter(Boolean) as StockData[];
        
        console.log(`✅ 已載入台股資料 ${this.stocks.length} 支股票`);
        return;
      }

      // 嘗試載入 us_all_stocks.jsonl
      const usFile = path.join(dataDir, 'us_all_stocks.jsonl');
      if (fs.existsSync(usFile)) {
        const content = fs.readFileSync(usFile, 'utf-8');
        const lines = content.trim().split('\n');
        
        this.stocks = lines.map(line => {
          try {
            const data = JSON.parse(line);
            return {
              代號: data.代號 || data.symbol,
              名稱: data.名稱 || data.name,
              市場: data.市場 || 'NASDAQ',
              交易所: data.交易所 || 'US',
              yahoo_symbol: data.yahoo_symbol || data.代號 || data.symbol,
              ETF: data.ETF || false
            } as StockData;
          } catch (e) {
            console.warn('解析美股資料失敗:', line);
            return null;
          }
        }).filter(Boolean) as StockData[];
        
        console.log(`✅ 已載入美股資料 ${this.stocks.length} 支股票`);
        return;
      }

      console.warn('⚠️ 找不到任何股票資料檔案，使用備用資料');
      this.loadFallbackData();
    } catch (error) {
      console.error('❌ 載入其他格式資料失敗:', error);
      this.loadFallbackData();
    }
  }

  /**
   * 載入備用資料
   */
  private loadFallbackData(): void {
    try {
      const fallbackFile = path.join(process.cwd(), 'data', 'stocks.json');
      if (fs.existsSync(fallbackFile)) {
        const content = fs.readFileSync(fallbackFile, 'utf-8');
        const data = JSON.parse(content);
        this.stocks = data.stocks || [];
        console.log(`✅ 已載入備用資料 ${this.stocks.length} 支股票`);
      }
    } catch (error) {
      console.error('❌ 載入備用資料也失敗:', error);
      this.stocks = [];
    }
  }

  /**
   * 搜尋股票
   */
  searchStocks(query: string, market?: string): StockData[] {
    if (!this.loaded) this.loadStocks();

    const lowerQuery = query.toLowerCase();
    
    return this.stocks.filter(stock => {
      const matchesQuery = 
        stock.代號.toLowerCase().includes(lowerQuery) ||
        stock.名稱.toLowerCase().includes(lowerQuery) ||
        stock.yahoo_symbol.toLowerCase().includes(lowerQuery);
      
      const matchesMarket = !market || stock.市場 === market;
      
      return matchesQuery && matchesMarket;
    }).slice(0, 50); // 限制結果數量
  }

  /**
   * 根據代號取得股票
   */
  getStockBySymbol(symbol: string, market?: string): StockData | null {
    if (!this.loaded) this.loadStocks();

    return this.stocks.find(stock => {
      const matchesSymbol = 
        stock.代號 === symbol ||
        stock.yahoo_symbol === symbol ||
        stock.yahoo_symbol === `${symbol}.TW` ||
        stock.yahoo_symbol === `${symbol}.TWO`;
      
      const matchesMarket = !market || stock.市場 === market;
      
      return matchesSymbol && matchesMarket;
    }) || null;
  }

  /**
   * 取得所有股票
   */
  getAllStocks(market?: string): StockData[] {
    if (!this.loaded) this.loadStocks();

    if (market) {
      return this.stocks.filter(stock => stock.市場 === market);
    }
    
    return this.stocks;
  }

    /**
   * 取得市場統計
   */
  getMarketStats(): Record<string, number> {
    if (!this.loaded) this.loadStocks();
    
    const stats: Record<string, number> = {};
    
    this.stocks.forEach(stock => {
      stats[stock.市場] = (stats[stock.市場] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * 取得詳細市場統計（包含分類）
   */
  getDetailedMarketStats(): MarketStats {
    if (!this.loaded) this.loadStocks();
    
    const stats: MarketStats = {};
    
    this.stocks.forEach(stock => {
      const market = stock.市場;
      const category = this.getStockCategory(stock);
      
      if (!stats[market]) {
        stats[market] = {
          total: 0,
          categories: { stock: 0, etf: 0 }
        };
      }
      
      stats[market].total++;
      stats[market].categories[category] = (stats[market].categories[category] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * 取得股票分類
   */
  getStockCategory(stock: StockData): string {
    // 檢查是否為 ETF
    if (stock.ETF === true) {
      return 'etf';
    }
    
    // 根據市場和名稱判斷
    const name = stock.名稱.toLowerCase();
    const symbol = stock.代號.toLowerCase();
    
    // 台股目前只有上市股票，沒有 ETF 資料
    if (stock.市場 === '上市') {
      return 'stock';
    }
    
    // 美股 ETF 判斷
    if ((stock.市場 === 'NASDAQ' || stock.市場 === 'Other' || stock.市場 === 'SEC') && (
      name.includes('etf') ||
      name.includes('fund') ||
      name.includes('trust') ||
      name.includes('index') ||
      name.includes('portfolio') ||
      name.includes('exchange traded fund') ||
      name.includes('spdr') ||
      name.includes('ishares') ||
      name.includes('vanguard') ||
      name.includes('invesco') ||
      name.includes('wisdomtree') ||
      name.includes('proshares') ||
      name.includes('direxion') ||
      name.includes('leveraged') ||
      name.includes('inverse')
    )) {
      return 'etf';
    }
    
    return 'stock';
  }

  /**
   * 取得所有分類
   */
  getAllCategories(): string[] {
    if (!this.loaded) this.loadStocks();
    
    const categories = new Set<string>();
    
    this.stocks.forEach(stock => {
      categories.add(this.getStockCategory(stock));
    });
    
    return Array.from(categories).sort();
  }

  /**
   * 根據股票資料獲取交易所代號
   */
  getExchange(stock: StockData): string {
    return stock.市場 === '上市' || stock.市場 === '上櫃' ? 'TW' : 'US';
  }

  /**
   * 根據交易所代號獲取次級市場列表
   */
  getMarketsByExchange(exchange: string): string[] {
    if (exchange === 'TW') {
      return ['上市', '上櫃', '興櫃']; // 台股的次級市場
    } else if (exchange === 'US') {
      return ['NASDAQ', 'NYSE', 'NYSEARCA', 'NMS', 'NYQ', 'PCX', 'NGM', 'OPR', 'NEO', 'BTS', 'PNK', 'Other', 'SEC']; // 美股的次級市場
    }
    return [];
  }

  /**
   * 根據交易所地區搜尋股票
   */
  searchStocksByExchange(query: string, exchange: string): StockData[] {
    if (!this.loaded) this.loadStocks();

    const lowerQuery = query.toLowerCase();
    
    // 如果沒有指定交易所，搜尋所有股票
    if (!exchange || exchange === '') {
      return this.stocks.filter(stock => {
        return stock.代號.toLowerCase().includes(lowerQuery) ||
               stock.名稱.toLowerCase().includes(lowerQuery) ||
               stock.yahoo_symbol.toLowerCase().includes(lowerQuery);
      });
    }
    
    return this.stocks.filter(stock => {
      const matchesQuery = 
        stock.代號.toLowerCase().includes(lowerQuery) ||
        stock.名稱.toLowerCase().includes(lowerQuery) ||
        stock.yahoo_symbol.toLowerCase().includes(lowerQuery);
      
      // 優先使用 stock.交易所 欄位，如果不存在則使用市場推斷
      const stockExchange = stock.交易所 || this.getExchange(stock);
      const matchesExchange = stockExchange === exchange;
      
      return matchesQuery && matchesExchange;
    });
  }

  /**
   * 取得分類統計
   */
  getCategoryStats(): Record<string, number> {
    if (!this.loaded) this.loadStocks();
    
    const stats: Record<string, number> = {};
    
    this.stocks.forEach(stock => {
      const category = this.getStockCategory(stock);
      stats[category] = (stats[category] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * 檢查股票是否存在
   */
  stockExists(symbol: string, market?: string): boolean {
    return this.getStockBySymbol(symbol, market) !== null;
  }

  /**
   * 取得隨機股票（用於測試）
   */
  getRandomStocks(count: number = 10, market?: string): StockData[] {
    if (!this.loaded) this.loadStocks();

    let filteredStocks = this.stocks;
    if (market) {
      filteredStocks = this.stocks.filter(stock => stock.市場 === market);
    }

    const shuffled = [...filteredStocks].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * 重新載入資料
   */
  reload(): void {
    this.loaded = false;
    this.stocks = [];
    this.loadStocks();
  }
}

// 建立全域實例
export const stockDB = new StockDatabase();
