import fs from 'fs';
import path from 'path';
import { StockInfo } from './stock-data-collector';
import { logger } from '../logger';

export interface MarketConfig {
  market: string;
  name: string;
  symbols: string[];
  priority: number;
  enabled: boolean;
}

export class StockListManager {
  private stocksDir: string;
  private configPath: string;

  constructor() {
    this.stocksDir = path.join(process.cwd(), 'data', 'stocks');
    this.configPath = path.join(process.cwd(), 'data', 'config', 'markets.json');
    this.ensureDirectories();
  }

  /**
   * 確保目錄存在
   */
  private ensureDirectories() {
    const dirs = [
      this.stocksDir,
      path.dirname(this.configPath)
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 載入市場配置
   */
  loadMarketConfig(): MarketConfig[] {
    try {
      if (!fs.existsSync(this.configPath)) {
        return this.getDefaultMarketConfig();
      }
      
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      return config.markets || this.getDefaultMarketConfig();
    } catch (error) {
      logger.stockList.error('載入市場配置失敗', error);
      return this.getDefaultMarketConfig();
    }
  }

  /**
   * 取得預設市場配置
   */
  private getDefaultMarketConfig(): MarketConfig[] {
    return [
      {
        market: 'TW',
        name: '台灣股市',
        symbols: [
          '2330', '2317', '2454', '2412', '1301', // 台積電、鴻海、聯發科、中華電、台塑
          '1303', '2002', '2308', '2881', '2882', // 南亞、中鋼、台達電、富邦金、國泰金
          '1216', '2207', '2303', '2884', '2891', // 統一、和泰車、聯電、玉山金、中信金
          '0050', '0056', '0061', '00692', '00878' // ETF
        ],
        priority: 5,
        enabled: true
      },
      {
        market: 'US',
        name: '美國股市',
        symbols: [
          'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', // 蘋果、微軟、谷歌、亞馬遜、特斯拉
          'NVDA', 'META', 'BRK-B', 'UNH', 'JNJ',   // 輝達、Meta、波克夏、聯合健康、嬌生
          'JPM', 'V', 'PG', 'HD', 'MA',            // 摩根大通、Visa、寶潔、家得寶、萬事達
          'SPY', 'QQQ', 'VTI', 'VOO', 'IWM'        // ETF
        ],
        priority: 4,
        enabled: true
      },
      {
        market: 'HK',
        name: '香港股市',
        symbols: [
          '0700', '0941', '9988', '0388', '3690', // 騰訊、中國移動、阿里巴巴、港交所、美團
          '9618', '1024', '1810', '2269', '2688', // 京東、快手、小米、藥明生物、新奧能源
          '2800', '2828', '2833', '2840', '2850'  // ETF
        ],
        priority: 3,
        enabled: true
      }
    ];
  }

  /**
   * 儲存市場配置
   */
  saveMarketConfig(markets: MarketConfig[]): void {
    try {
      const config = { markets };
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      logger.stockList.info('市場配置已儲存');
    } catch (error) {
      logger.stockList.error('儲存市場配置失敗', error);
      throw error;
    }
  }

  /**
   * 取得所有股票清單
   */
  async getAllStocks(): Promise<StockInfo[]> {
    const markets = this.loadMarketConfig();
    const stocks: StockInfo[] = [];

    for (const market of markets) {
      if (!market.enabled) continue;

      for (const symbol of market.symbols) {
        const stockInfo = await this.getStockInfo(market.market, symbol);
        stocks.push({
          symbol,
          market: market.market,
          name: stockInfo?.name,
          sector: stockInfo?.sector,
          industry: stockInfo?.industry,
          lastUpdated: stockInfo?.lastUpdated,
          priority: market.priority
        });
      }
    }

    return stocks;
  }

  /**
   * 取得特定市場的股票清單
   */
  async getStocksByMarket(market: string): Promise<StockInfo[]> {
    const markets = this.loadMarketConfig();
    const marketConfig = markets.find(m => m.market === market);
    
    if (!marketConfig || !marketConfig.enabled) {
      return [];
    }

    const stocks: StockInfo[] = [];
    for (const symbol of marketConfig.symbols) {
      const stockInfo = await this.getStockInfo(market, symbol);
      stocks.push({
        symbol,
        market,
        name: stockInfo?.name,
        sector: stockInfo?.sector,
        industry: stockInfo?.industry,
        lastUpdated: stockInfo?.lastUpdated,
        priority: marketConfig.priority
      });
    }

    return stocks;
  }

  /**
   * 取得股票資訊
   */
  async getStockInfo(market: string, symbol: string): Promise<Partial<StockInfo> | null> {
    const stockPath = path.join(this.stocksDir, `${market}_${symbol}.json`);
    
    try {
      if (fs.existsSync(stockPath)) {
        const data = JSON.parse(fs.readFileSync(stockPath, 'utf8'));
        return data;
      }
    } catch (error) {
      logger.stockList.error(`讀取股票資訊失敗: ${market}/${symbol}`, error);
    }

    return null;
  }

  /**
   * 新增股票到清單
   */
  addStockToMarket(market: string, symbol: string): boolean {
    const markets = this.loadMarketConfig();
    const marketConfig = markets.find(m => m.market === market);
    
    if (!marketConfig) {
      logger.stockList.error(`市場不存在: ${market}`);
      return false;
    }

    if (marketConfig.symbols.includes(symbol)) {
      logger.stockList.warn(`股票已存在: ${market}/${symbol}`);
      return false;
    }

    marketConfig.symbols.push(symbol);
    this.saveMarketConfig(markets);
    
    logger.stockList.info(`已新增股票: ${market}/${symbol}`);
    return true;
  }

  /**
   * 從清單移除股票
   */
  removeStockFromMarket(market: string, symbol: string): boolean {
    const markets = this.loadMarketConfig();
    const marketConfig = markets.find(m => m.market === market);
    
    if (!marketConfig) {
      logger.stockList.error(`市場不存在: ${market}`);
      return false;
    }

    const index = marketConfig.symbols.indexOf(symbol);
    if (index === -1) {
      logger.stockList.warn(`股票不存在: ${market}/${symbol}`);
      return false;
    }

    marketConfig.symbols.splice(index, 1);
    this.saveMarketConfig(markets);
    
    logger.stockList.info(`已移除股票: ${market}/${symbol}`);
    return true;
  }

  /**
   * 取得需要更新的股票清單
   */
  async getStocksNeedingUpdate(maxAgeHours: number = 24): Promise<StockInfo[]> {
    const allStocks = await this.getAllStocks();
    const now = new Date();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    return allStocks.filter(stock => {
      if (!stock.lastUpdated) return true;
      
      const lastUpdate = new Date(stock.lastUpdated);
      const ageMs = now.getTime() - lastUpdate.getTime();
      
      return ageMs > maxAgeMs;
    });
  }

  /**
   * 取得股票統計資訊
   */
  async getStockStats(): Promise<{
    total: number;
    byMarket: { [market: string]: number };
    byPriority: { [priority: number]: number };
    recentlyUpdated: number;
    needsUpdate: number;
  }> {
    const allStocks = await this.getAllStocks();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = {
      total: allStocks.length,
      byMarket: {} as { [market: string]: number },
      byPriority: {} as { [priority: number]: number },
      recentlyUpdated: 0,
      needsUpdate: 0
    };

    for (const stock of allStocks) {
      // 按市場統計
      stats.byMarket[stock.market] = (stats.byMarket[stock.market] || 0) + 1;
      
      // 按優先級統計
      stats.byPriority[stock.priority] = (stats.byPriority[stock.priority] || 0) + 1;
      
      // 更新時間統計
      if (stock.lastUpdated) {
        const lastUpdate = new Date(stock.lastUpdated);
        if (lastUpdate > oneDayAgo) {
          stats.recentlyUpdated++;
        } else {
          stats.needsUpdate++;
        }
      } else {
        stats.needsUpdate++;
      }
    }

    return stats;
  }

  /**
   * 匯入股票清單
   */
  importStockList(market: string, symbols: string[]): boolean {
    const markets = this.loadMarketConfig();
    const marketConfig = markets.find(m => m.market === market);
    
    if (!marketConfig) {
      logger.stockList.error(`市場不存在: ${market}`);
      return false;
    }

    // 去重
    const uniqueSymbols = Array.from(new Set(symbols));
    marketConfig.symbols = uniqueSymbols;
    
    this.saveMarketConfig(markets);
    
    logger.stockList.info(`已匯入 ${uniqueSymbols.length} 支股票到 ${market} 市場`);
    return true;
  }

  /**
   * 匯出股票清單
   */
  exportStockList(market: string): string[] {
    const markets = this.loadMarketConfig();
    const marketConfig = markets.find(m => m.market === market);
    
    if (!marketConfig) {
      logger.stockList.error(`市場不存在: ${market}`);
      return [];
    }

    return [...marketConfig.symbols];
  }
}
