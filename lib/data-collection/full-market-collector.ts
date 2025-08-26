import fs from 'fs/promises';
import path from 'path';
import { YahooFinanceCollector } from '@/lib/data/yahoo-finance-collector';

// 簡化的 logger 實作
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
};

export interface MarketStock {
  symbol: string;
  name: string;
  market: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  lastUpdated: string;
}

export interface MarketCollectionResult {
  market: string;
  totalStocks: number;
  collectedStocks: MarketStock[];
  failedStocks: string[];
  collectionTime: number;
  lastUpdated: string;
}

export class FullMarketCollector {
  private collector: YahooFinanceCollector;
  private readonly dataDir = 'data/full-market';
  
  // 美股主要交易所
  private readonly US_EXCHANGES = [
    'NASDAQ', 'NYSE', 'AMEX', 'OTC'
  ];
  
  // 台股主要分類
  private readonly TW_CATEGORIES = [
    '上市', '上櫃', '興櫃', 'ETF'
  ];

  constructor() {
    this.collector = new YahooFinanceCollector({
      baseDir: 'data/yahoo-finance',
      markets: {
        US: { name: 'United States', symbols: [], currency: 'USD', timezone: 'America/New_York' },
        TW: { name: 'Taiwan', symbols: [], currency: 'TWD', timezone: 'Asia/Taipei' },
        HK: { name: 'Hong Kong', symbols: [], currency: 'HKD', timezone: 'Asia/Hong_Kong' },
        JP: { name: 'Japan', symbols: [], currency: 'JPY', timezone: 'Asia/Tokyo' },
        CN: { name: 'China', symbols: [], currency: 'CNY', timezone: 'Asia/Shanghai' }
      }
    });
  }

  /**
   * 收集全美股列表
   */
  async collectUSMarketStocks(limit?: number): Promise<MarketCollectionResult> {
    logger.info(`開始收集全美股列表${limit ? `（限制${limit}支）` : ''}`);
    const startTime = Date.now();
    
    const stocks: MarketStock[] = [];
    const failedStocks: string[] = [];
    
    // 從現有資料檔案讀取美股列表
    const usStocksFile = path.join('data', 'us_all_stocks.jsonl');
    
    try {
      // 讀取美股資料
      const usData = await this.readStockListFile(usStocksFile);
      const dataToProcess = limit ? usData.slice(0, limit) : usData;
      logger.info(`讀取到 ${usData.length} 支美股，處理 ${dataToProcess.length} 支`);
      
      // 分批處理，避免 API 限流
      const batchSize = 200;
      const batches = this.chunkArray(dataToProcess, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.info(`處理第 ${i + 1}/${batches.length} 批，共 ${batch.length} 支股票`);
        
        const batchPromises = batch.map(async (stockData: any) => {
          try {
            const stock = await this.enrichStockData(stockData, 'US');
            if (stock) {
              stocks.push(stock);
            }
          } catch (error) {
            logger.error(`處理股票 ${stockData.代號 || stockData.symbol} 失敗:`, error);
            failedStocks.push(stockData.代號 || stockData.symbol);
          }
        });
        
        await Promise.all(batchPromises);
        
        // 避免 API 限流，每批之間等待
        if (i < batches.length - 1) {
          await this.delay(1000); // 減少等待時間
        }
      }
      
    } catch (error) {
      logger.error('收集美股列表失敗:', error);
      throw error;
    }
    
    const result: MarketCollectionResult = {
      market: 'US',
      totalStocks: stocks.length + failedStocks.length,
      collectedStocks: stocks,
      failedStocks,
      collectionTime: Date.now() - startTime,
      lastUpdated: new Date().toISOString()
    };
    
    // 儲存結果
    await this.saveMarketCollectionResult(result);
    
    logger.info(`美股收集完成: ${stocks.length} 支成功，${failedStocks.length} 支失敗`);
    return result;
  }

  /**
   * 收集全台股列表
   */
  async collectTWMarketStocks(limit?: number): Promise<MarketCollectionResult> {
    logger.info(`開始收集全台股列表${limit ? `（限制${limit}支）` : ''}`);
    const startTime = Date.now();
    
    const stocks: MarketStock[] = [];
    const failedStocks: string[] = [];
    
    try {
      // 讀取台股資料
      const twData = await this.readStockListFile('data/tw_all_stocks.jsonl');
      const dataToProcess = limit ? twData.slice(0, limit) : twData;
      logger.info(`讀取到 ${twData.length} 支台股，處理 ${dataToProcess.length} 支`);
      
      // 分批處理
      const batchSize = 200;
      const batches = this.chunkArray(dataToProcess, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.info(`處理第 ${i + 1}/${batches.length} 批，共 ${batch.length} 支股票`);
        
        const batchPromises = batch.map(async (stockData: any) => {
          try {
            const stock = await this.enrichStockData(stockData, 'TW');
            if (stock) {
              stocks.push(stock);
            }
          } catch (error) {
            logger.error(`處理股票 ${stockData.公司代號 || stockData.symbol} 失敗:`, error);
            failedStocks.push(stockData.公司代號 || stockData.symbol);
          }
        });
        
        await Promise.all(batchPromises);
        
        // 避免 API 限流
        if (i < batches.length - 1) {
          await this.delay(1000); // 減少等待時間
        }
      }
      
    } catch (error) {
      logger.error('收集台股列表失敗:', error);
      throw error;
    }
    
    const result: MarketCollectionResult = {
      market: 'TW',
      totalStocks: stocks.length + failedStocks.length,
      collectedStocks: stocks,
      failedStocks,
      collectionTime: Date.now() - startTime,
      lastUpdated: new Date().toISOString()
    };
    
    // 儲存結果
    await this.saveMarketCollectionResult(result);
    
    logger.info(`台股收集完成: ${stocks.length} 支成功，${failedStocks.length} 支失敗`);
    return result;
  }

  /**
   * 收集全市場股票列表
   */
  async collectAllMarketStocks(): Promise<{
    us: MarketCollectionResult;
    tw: MarketCollectionResult;
  }> {
    logger.info('開始收集全市場股票列表');
    
    const [usResult, twResult] = await Promise.all([
      this.collectUSMarketStocks(),
      this.collectTWMarketStocks()
    ]);
    
    // 生成統計報告
    await this.generateMarketStatistics({ us: usResult, tw: twResult });
    
    return { us: usResult, tw: twResult };
  }

  /**
   * 豐富股票資料
   */
  private async enrichStockData(stockData: any, market: string): Promise<MarketStock | null> {
    try {
      // 根據市場類型處理不同的欄位名稱
      let symbol: string;
      let name: string;
      
      if (market === 'US') {
        // 美股格式：{"代號":"NVDA","名稱":"NVIDIA CORP","yahoo_symbol":"NVDA","市場":null}
        symbol = stockData.代號 || stockData.symbol || stockData.code;
        name = stockData.名稱 || stockData.name || stockData.longName || stockData.shortName || symbol;
      } else if (market === 'TW') {
        // 台股格式：{"公司代號":"1101","公司簡稱":"台泥","公司名稱":"臺灣水泥股份有限公司","yahoo_symbol":"1101.TW"}
        symbol = stockData.公司代號 || stockData.symbol || stockData.code;
        name = stockData.公司簡稱 || stockData.公司名稱 || stockData.name || stockData.longName || stockData.shortName || symbol;
      } else {
        // 通用格式
        symbol = stockData.symbol || stockData.code;
        name = stockData.name || stockData.longName || stockData.shortName || symbol;
      }
      
      if (!symbol) return null;
      
      // 直接使用股票列表中的基本資料，不調用 API
      const stock: MarketStock = {
        symbol: symbol,
        name: name,
        market: market,
        exchange: stockData.exchange || (market === 'TW' ? 'TWSE' : 'NASDAQ'),
        sector: stockData.sector || stockData.產業別 || 'Unknown',
        industry: stockData.industry || 'Unknown',
        marketCap: stockData.marketCap || 0,
        lastUpdated: new Date().toISOString()
      };
      
      return stock;
    } catch (error) {
      logger.warn(`豐富股票資料失敗 ${stockData.symbol || stockData.代號 || stockData.公司代號}:`, error);
      return null;
    }
  }

  /**
   * 讀取股票列表檔案
   */
  private async readStockListFile(filePath: string): Promise<any[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      logger.error(`讀取檔案失敗 ${filePath}:`, error);
      return [];
    }
  }

  /**
   * 儲存市場收集結果
   */
  private async saveMarketCollectionResult(result: MarketCollectionResult): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      const fileName = `${result.market}-stocks-${new Date().toISOString().split('T')[0]}.json`;
      const filePath = path.join(this.dataDir, fileName);
      
      await fs.writeFile(filePath, JSON.stringify(result, null, 2));
      
      // 同時更新最新版本
      const latestFile = path.join(this.dataDir, `${result.market}-stocks-latest.json`);
      await fs.writeFile(latestFile, JSON.stringify(result, null, 2));
      
      logger.info(`市場資料已儲存: ${filePath}`);
    } catch (error) {
      logger.error('儲存市場收集結果失敗:', error);
    }
  }

  /**
   * 生成市場統計報告
   */
  private async generateMarketStatistics(results: {
    us: MarketCollectionResult;
    tw: MarketCollectionResult;
  }): Promise<void> {
    const statistics = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalStocks: results.us.totalStocks + results.tw.totalStocks,
        successfulStocks: results.us.collectedStocks.length + results.tw.collectedStocks.length,
        failedStocks: results.us.failedStocks.length + results.tw.failedStocks.length,
        successRate: ((results.us.collectedStocks.length + results.tw.collectedStocks.length) / 
                     (results.us.totalStocks + results.tw.totalStocks) * 100).toFixed(2) + '%'
      },
      markets: {
        US: {
          total: results.us.totalStocks,
          successful: results.us.collectedStocks.length,
          failed: results.us.failedStocks.length,
          successRate: (results.us.collectedStocks.length / results.us.totalStocks * 100).toFixed(2) + '%',
          collectionTime: results.us.collectionTime
        },
        TW: {
          total: results.tw.totalStocks,
          successful: results.tw.collectedStocks.length,
          failed: results.tw.failedStocks.length,
          successRate: (results.tw.collectedStocks.length / results.tw.totalStocks * 100).toFixed(2) + '%',
          collectionTime: results.tw.collectionTime
        }
      }
    };
    
    const statsFile = path.join(this.dataDir, 'market-statistics.json');
    await fs.writeFile(statsFile, JSON.stringify(statistics, null, 2));
    
    logger.info('市場統計報告已生成:', statistics.summary);
  }

  /**
   * 陣列分塊
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
