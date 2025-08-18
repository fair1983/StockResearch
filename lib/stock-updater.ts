import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { logger } from './logger';

export interface StockSymbol {
  symbol: string;
  name: string;
  category: 'stock' | 'etf';
  market: 'TW' | 'US';
}

export interface StockData {
  lastUpdated: string;
  version: string;
  stocks: {
    TW: {
      stocks: StockSymbol[];
      etfs: StockSymbol[];
    };
    US: {
      stocks: StockSymbol[];
      etfs: StockSymbol[];
    };
  };
}

export class StockUpdater {
  private dataPath: string;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'stocks.json');
  }

  // 讀取現有的股票資料
  async loadStockData(): Promise<StockData> {
    try {
      if (!fs.existsSync(this.dataPath)) {
        return this.getDefaultData();
      }
      
      const data = fs.readFileSync(this.dataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.api.error(`Failed to load stock data: ${error}`);
      return this.getDefaultData();
    }
  }

  // 儲存股票資料
  async saveStockData(data: StockData): Promise<void> {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
      logger.api.response(`Stock data saved successfully`);
    } catch (error) {
      logger.api.error(`Failed to save stock data: ${error}`);
      throw error;
    }
  }

  // 獲取台股股票列表 - 智能分頁獲取策略
  async fetchTWStocks(): Promise<StockSymbol[]> {
    try {
      logger.api.request('Fetching Taiwan stock list using smart pagination strategy...');
      
      let allStocks: StockSymbol[] = [];
      
      // 1. 嘗試使用多種篩選器從Yahoo Finance獲取
      try {
        const screeners = [
          'all_stocks',           // 所有股票
          'most_actives',         // 最活躍
          'day_gainers',          // 漲幅最大
          'day_losers',           // 跌幅最大
          'growth_technology_stocks', // 科技成長股
          'value_stocks',         // 價值股
          'dividend_stocks',      // 股息股
          'undervalued_growth_stocks', // 被低估的成長股
          'aggressive_small_caps', // 積極的小型股
          'small_cap_gainers'     // 小型股漲幅最大
        ];
        
        let totalFetched = 0;
        let consecutiveFailures = 0;
        const maxFailures = 3; // 連續失敗3次就停止
        
        for (const screener of screeners) {
          try {
            logger.api.request(`Fetching Taiwan stocks using screener: ${screener}...`);
            
            const yahooResponse = await axios.get(`https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=true&lang=zh-TW&region=TW&scrIds=${screener}&count=200`, {
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            if (yahooResponse.data && yahooResponse.data.finance && yahooResponse.data.finance.result) {
              const quotes = yahooResponse.data.finance.result[0].quotes;
              
              if (quotes && quotes.length > 0) {
                const yahooStocks: StockSymbol[] = quotes
                  .filter((item: any) => item.symbol && item.shortname && item.quoteType === 'EQUITY')
                  .filter((item: any) => /^\d{4,5}$/.test(item.symbol.replace('.TW', '')))
                  .map((item: any) => ({
                    symbol: item.symbol.replace('.TW', ''),
                    name: item.shortname,
                    category: 'stock' as const,
                    market: 'TW' as const
                  }));

                allStocks = [...allStocks, ...yahooStocks];
                totalFetched += yahooStocks.length;
                consecutiveFailures = 0; // 重置失敗計數
                logger.api.response(`Fetched ${yahooStocks.length} Taiwan stocks from Yahoo Finance (screener: ${screener})`);
                
                // 如果成功獲取到數據，等待一下再繼續
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
          } catch (screenerError) {
            consecutiveFailures++;
            logger.api.error(`Yahoo Finance screener ${screener} failed: ${screenerError}`);
            
            if (consecutiveFailures >= maxFailures) {
              logger.api.error(`Too many consecutive failures (${consecutiveFailures}), stopping screener requests`);
              break;
            }
            
            // 失敗後等待更長時間
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        logger.api.response(`Total fetched from Yahoo Finance: ${totalFetched} Taiwan stocks using ${screeners.length} screeners`);
      } catch (yahooError) {
        logger.api.error(`Yahoo Finance failed: ${yahooError}`);
      }

      // 2. 嘗試從台灣證券交易所獲取
      try {
        const twseResponse = await axios.get('https://www.twse.com.tw/rwd/zh/api/codeFilters', {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (twseResponse.data && twseResponse.data.results) {
          const twseStocks: StockSymbol[] = twseResponse.data.results
            .filter((item: any) => item[0] && item[1] && /^\d{4,5}$/.test(item[0]))
            .map((item: any) => ({
              symbol: item[0],
              name: item[1],
              category: 'stock' as const,
              market: 'TW' as const
            }));

          allStocks = [...allStocks, ...twseStocks];
          logger.api.response(`Fetched ${twseStocks.length} Taiwan stocks from TWSE`);
        }
      } catch (twseError) {
        logger.api.error(`TWSE failed: ${twseError}`);
      }

      // 3. 添加擴展的預設台股列表
      const defaultStocks = this.getExtendedTWStocks();
      allStocks = [...allStocks, ...defaultStocks];

      // 移除重複的股票（基於symbol）
      const uniqueStocks = allStocks.filter((stock, index, self) => 
        index === self.findIndex(s => s.symbol === stock.symbol)
      );

      logger.api.response(`Total unique Taiwan stocks: ${uniqueStocks.length}`);
      return uniqueStocks;
    } catch (error) {
      logger.api.error(`Failed to fetch Taiwan stocks: ${error}`);
      return this.getExtendedTWStocks();
    }
  }

  // 獲取台股ETF列表 - 智能分頁獲取策略
  async fetchTWETFs(): Promise<StockSymbol[]> {
    try {
      logger.api.request('Fetching Taiwan ETF list using smart pagination strategy...');
      
      let allETFs: StockSymbol[] = [];
      
      // 嘗試智能分頁從Yahoo Finance獲取
      try {
        const batchSizes = [20, 50, 100]; // ETF數量較少，使用較小的批次
        let totalFetched = 0;
        let consecutiveFailures = 0;
        const maxFailures = 3; // 連續失敗3次就停止
        let offset = 0; // 分頁偏移量
        const maxPages = 10; // ETF數量較少，最多嘗試10頁
        let pageCount = 0;
        
        for (const batchSize of batchSizes) {
          if (pageCount >= maxPages) break;
          
          try {
            logger.api.request(`Fetching Taiwan ETFs page ${pageCount + 1} with batch size: ${batchSize}, offset: ${offset}...`);
            
            const response = await axios.get(`https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=true&lang=zh-TW&region=TW&scrIds=all_stocks&count=${batchSize}&offset=${offset}`, {
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            if (response.data && response.data.finance && response.data.finance.result) {
              const quotes = response.data.finance.result[0].quotes;
              
              if (quotes && quotes.length > 0) {
                const etfs: StockSymbol[] = quotes
                  .filter((item: any) => item.symbol && item.shortname && item.quoteType === 'ETF')
                  .filter((item: any) => /^\d{4,5}$/.test(item.symbol.replace('.TW', '')))
                  .map((item: any) => ({
                    symbol: item.symbol.replace('.TW', ''),
                    name: item.shortname,
                    category: 'etf' as const,
                    market: 'TW' as const
                  }));

                allETFs = [...allETFs, ...etfs];
                totalFetched += etfs.length;
                consecutiveFailures = 0; // 重置失敗計數
                logger.api.response(`Fetched ${etfs.length} Taiwan ETFs from Yahoo Finance (page ${pageCount + 1}, batch: ${batchSize}, offset: ${offset})`);
                
                // 如果獲取到的數據少於請求的數量，可能已經到最後一頁
                if (quotes.length < batchSize) {
                  logger.api.response(`Reached end of data (got ${quotes.length} items, requested ${batchSize})`);
                  break;
                }
                
                offset += batchSize; // 增加偏移量
                pageCount++;
                
                // 如果成功獲取到數據，等待一下再繼續
                await new Promise(resolve => setTimeout(resolve, 2000));
              } else {
                logger.api.response(`No more data available at offset ${offset}`);
                break;
              }
            }
          } catch (batchError) {
            consecutiveFailures++;
            logger.api.error(`Yahoo Finance page ${pageCount + 1} failed: ${batchError}`);
            
            if (consecutiveFailures >= maxFailures) {
              logger.api.error(`Too many consecutive failures (${consecutiveFailures}), stopping pagination`);
              break;
            }
            
            // 失敗後等待更長時間
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        logger.api.response(`Total fetched from Yahoo Finance: ${totalFetched} Taiwan ETFs across ${pageCount} pages`);
      } catch (yahooError) {
        logger.api.error(`Yahoo Finance failed: ${yahooError}`);
      }

      // 添加擴展的預設台股ETF列表
      const defaultETFs = this.getExtendedTWETFs();
      allETFs = [...allETFs, ...defaultETFs];

      // 移除重複的ETF（基於symbol）
      const uniqueETFs = allETFs.filter((etf, index, self) => 
        index === self.findIndex(e => e.symbol === etf.symbol)
      );

      logger.api.response(`Total unique Taiwan ETFs: ${uniqueETFs.length}`);
      return uniqueETFs;
    } catch (error) {
      logger.api.error(`Failed to fetch Taiwan ETFs: ${error}`);
      return this.getExtendedTWETFs();
    }
  }

  // 獲取美股股票列表 - 智能分頁獲取策略
  async fetchUSStocks(): Promise<StockSymbol[]> {
    try {
      logger.api.request('Fetching US stock list using smart pagination strategy...');
      
      let allStocks: StockSymbol[] = [];
      
      // 1. 嘗試使用多種篩選器從Yahoo Finance獲取
      try {
        const screeners = [
          'all_stocks',           // 所有股票
          'most_actives',         // 最活躍
          'day_gainers',          // 漲幅最大
          'day_losers',           // 跌幅最大
          'growth_technology_stocks', // 科技成長股
          'value_stocks',         // 價值股
          'dividend_stocks',      // 股息股
          'undervalued_growth_stocks', // 被低估的成長股
          'aggressive_small_caps', // 積極的小型股
          'small_cap_gainers',    // 小型股漲幅最大
          'large_cap_stocks',     // 大型股
          'mid_cap_stocks',       // 中型股
          'small_cap_stocks',     // 小型股
          'momentum_stocks',      // 動能股
          'growth_stocks',        // 成長股
          'income_stocks'         // 收益股
        ];
        
        let totalFetched = 0;
        let consecutiveFailures = 0;
        const maxFailures = 3; // 連續失敗3次就停止
        
        for (const screener of screeners) {
          try {
            logger.api.request(`Fetching US stocks using screener: ${screener}...`);
            
            const yahooResponse = await axios.get(`https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=true&lang=en-US&region=US&scrIds=${screener}&count=200`, {
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            if (yahooResponse.data && yahooResponse.data.finance && yahooResponse.data.finance.result) {
              const quotes = yahooResponse.data.finance.result[0].quotes;
              
              if (quotes && quotes.length > 0) {
                const yahooStocks: StockSymbol[] = quotes
                  .filter((item: any) => item.symbol && item.shortname && item.quoteType === 'EQUITY')
                  .map((item: any) => ({
                    symbol: item.symbol,
                    name: item.shortname,
                    category: 'stock' as const,
                    market: 'US' as const
                  }));

                allStocks = [...allStocks, ...yahooStocks];
                totalFetched += yahooStocks.length;
                consecutiveFailures = 0; // 重置失敗計數
                logger.api.response(`Fetched ${yahooStocks.length} US stocks from Yahoo Finance (screener: ${screener})`);
                
                // 如果成功獲取到數據，等待一下再繼續
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
          } catch (screenerError) {
            consecutiveFailures++;
            logger.api.error(`Yahoo Finance screener ${screener} failed: ${screenerError}`);
            
            if (consecutiveFailures >= maxFailures) {
              logger.api.error(`Too many consecutive failures (${consecutiveFailures}), stopping screener requests`);
              break;
            }
            
            // 失敗後等待更長時間
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        logger.api.response(`Total fetched from Yahoo Finance: ${totalFetched} US stocks using ${screeners.length} screeners`);
      } catch (yahooError) {
        logger.api.error(`Yahoo Finance failed: ${yahooError}`);
      }

      // 2. 嘗試從Alpha Vantage獲取（如果有API key）
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
      if (apiKey) {
        try {
          const alphaResponse = await axios.get(`https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${apiKey}`, {
            timeout: 15000
          });

          if (alphaResponse.data && alphaResponse.data.length > 0) {
            const alphaStocks: StockSymbol[] = alphaResponse.data
              .filter((item: any) => item.symbol && item.name && item.status === 'Active')
              .map((item: any) => ({
                symbol: item.symbol,
                name: item.name,
                category: 'stock' as const,
                market: 'US' as const
              }));

            allStocks = [...allStocks, ...alphaStocks];
            logger.api.response(`Fetched ${alphaStocks.length} US stocks from Alpha Vantage`);
          }
        } catch (alphaError) {
          logger.api.error(`Alpha Vantage failed: ${alphaError}`);
        }
      }

      // 3. 添加擴展的預設美股列表
      const defaultStocks = this.getExtendedUSStocks();
      allStocks = [...allStocks, ...defaultStocks];

      // 移除重複的股票（基於symbol）
      const uniqueStocks = allStocks.filter((stock, index, self) => 
        index === self.findIndex(s => s.symbol === stock.symbol)
      );

      logger.api.response(`Total unique US stocks: ${uniqueStocks.length}`);
      return uniqueStocks;
    } catch (error) {
      logger.api.error(`Failed to fetch US stocks: ${error}`);
      return this.getExtendedUSStocks();
    }
  }

  // 獲取美股ETF列表 - 智能分頁獲取策略
  async fetchUSETFs(): Promise<StockSymbol[]> {
    try {
      logger.api.request('Fetching US ETF list using smart pagination strategy...');
      
      let allETFs: StockSymbol[] = [];
      
      // 嘗試智能分頁從Yahoo Finance獲取
      try {
        const batchSizes = [20, 50, 100, 200]; // ETF數量較少，使用較小的批次
        let totalFetched = 0;
        let consecutiveFailures = 0;
        const maxFailures = 3; // 連續失敗3次就停止
        let offset = 0; // 分頁偏移量
        const maxPages = 15; // ETF數量較少，最多嘗試15頁
        let pageCount = 0;
        
        for (const batchSize of batchSizes) {
          if (pageCount >= maxPages) break;
          
          try {
            logger.api.request(`Fetching US ETFs page ${pageCount + 1} with batch size: ${batchSize}, offset: ${offset}...`);
            
            const response = await axios.get(`https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=true&lang=en-US&region=US&scrIds=all_stocks&count=${batchSize}&offset=${offset}`, {
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            if (response.data && response.data.finance && response.data.finance.result) {
              const quotes = response.data.finance.result[0].quotes;
              
              if (quotes && quotes.length > 0) {
                const etfs: StockSymbol[] = quotes
                  .filter((item: any) => item.symbol && item.shortname && item.quoteType === 'ETF')
                  .map((item: any) => ({
                    symbol: item.symbol,
                    name: item.shortname,
                    category: 'etf' as const,
                    market: 'US' as const
                  }));

                allETFs = [...allETFs, ...etfs];
                totalFetched += etfs.length;
                consecutiveFailures = 0; // 重置失敗計數
                logger.api.response(`Fetched ${etfs.length} US ETFs from Yahoo Finance (page ${pageCount + 1}, batch: ${batchSize}, offset: ${offset})`);
                
                // 如果獲取到的數據少於請求的數量，可能已經到最後一頁
                if (quotes.length < batchSize) {
                  logger.api.response(`Reached end of data (got ${quotes.length} items, requested ${batchSize})`);
                  break;
                }
                
                offset += batchSize; // 增加偏移量
                pageCount++;
                
                // 如果成功獲取到數據，等待一下再繼續
                await new Promise(resolve => setTimeout(resolve, 2000));
              } else {
                logger.api.response(`No more data available at offset ${offset}`);
                break;
              }
            }
          } catch (batchError) {
            consecutiveFailures++;
            logger.api.error(`Yahoo Finance page ${pageCount + 1} failed: ${batchError}`);
            
            if (consecutiveFailures >= maxFailures) {
              logger.api.error(`Too many consecutive failures (${consecutiveFailures}), stopping pagination`);
              break;
            }
            
            // 失敗後等待更長時間
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        logger.api.response(`Total fetched from Yahoo Finance: ${totalFetched} US ETFs across ${pageCount} pages`);
      } catch (yahooError) {
        logger.api.error(`Yahoo Finance failed: ${yahooError}`);
      }

      // 添加擴展的預設美股ETF列表
      const defaultETFs = this.getExtendedUSETFs();
      allETFs = [...allETFs, ...defaultETFs];

      // 移除重複的ETF（基於symbol）
      const uniqueETFs = allETFs.filter((etf, index, self) => 
        index === self.findIndex(e => e.symbol === etf.symbol)
      );

      logger.api.response(`Total unique US ETFs: ${uniqueETFs.length}`);
      return uniqueETFs;
    } catch (error) {
      logger.api.error(`Failed to fetch US ETFs: ${error}`);
      return this.getExtendedUSETFs();
    }
  }

  // 更新所有股票列表 - 增強版本
  async updateAllStocks(): Promise<{ success: boolean; message: string; data?: StockData }> {
    try {
      logger.api.request('Starting enhanced stock list update...');
      
      const startTime = Date.now();
      
      // 並行獲取所有市場的股票和ETF
      const [twStocks, twETFs, usStocks, usETFs] = await Promise.allSettled([
        this.fetchTWStocks(),
        this.fetchTWETFs(),
        this.fetchUSStocks(),
        this.fetchUSETFs()
      ]);

      const newData: StockData = {
        lastUpdated: new Date().toISOString(),
        version: '1.1.0',
        stocks: {
          TW: {
            stocks: twStocks.status === 'fulfilled' ? twStocks.value : [],
            etfs: twETFs.status === 'fulfilled' ? twETFs.value : []
          },
          US: {
            stocks: usStocks.status === 'fulfilled' ? usStocks.value : [],
            etfs: usETFs.status === 'fulfilled' ? usETFs.value : []
          }
        }
      };

      await this.saveStockData(newData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const totalStocks = newData.stocks.TW.stocks.length + newData.stocks.TW.etfs.length + 
                         newData.stocks.US.stocks.length + newData.stocks.US.etfs.length;
      
      const message = `Enhanced stock list updated successfully! Total: ${totalStocks} symbols (${duration}ms)`;
      logger.api.response(message);
      
      // 詳細統計
      logger.api.response(`Breakdown: TW Stocks: ${newData.stocks.TW.stocks.length}, TW ETFs: ${newData.stocks.TW.etfs.length}, US Stocks: ${newData.stocks.US.stocks.length}, US ETFs: ${newData.stocks.US.etfs.length}`);
      
      return {
        success: true,
        message,
        data: newData
      };
    } catch (error) {
      const errorMessage = `Failed to update stock list: ${error}`;
      logger.api.error(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // 增量更新股票列表
  async incrementalUpdate(): Promise<{ success: boolean; message: string; data?: StockData }> {
    try {
      logger.api.request('Starting incremental stock list update...');
      
      // 載入現有數據
      const existingData = await this.loadStockData();
      const existingStocks = new Set();
      
      // 收集現有股票代碼
      if (existingData.stocks) {
        Object.values(existingData.stocks).forEach(market => {
          Object.values(market).forEach(category => {
            category.forEach((stock: any) => {
              existingStocks.add(`${stock.market}-${stock.symbol}`);
            });
          });
        });
      }

      // 獲取新數據
      const updateResult = await this.updateAllStocks();
      if (!updateResult.success || !updateResult.data) {
        throw new Error('Failed to get new data');
      }

      const newData = updateResult.data;
      let addedCount = 0;

      // 檢查新增的股票
      Object.entries(newData.stocks).forEach(([market, marketData]) => {
        Object.entries(marketData).forEach(([category, stocks]) => {
          stocks.forEach((stock: any) => {
            const stockKey = `${stock.market}-${stock.symbol}`;
            
            if (!existingStocks.has(stockKey)) {
              addedCount++;
              logger.api.response(`Added new stock: ${stock.symbol} (${stock.name})`);
            }
          });
        });
      });

      const message = `Incremental update completed. Added ${addedCount} new stocks. Total: ${newData.stocks.TW.stocks.length + newData.stocks.TW.etfs.length + newData.stocks.US.stocks.length + newData.stocks.US.etfs.length} symbols`;
      
      return {
        success: true,
        message,
        data: newData
      };
    } catch (error) {
      const errorMessage = `Failed to perform incremental update: ${error}`;
      logger.api.error(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // 手動添加股票
  async addStock(symbol: string, name: string, market: 'TW' | 'US', category: 'stock' | 'etf'): Promise<{ success: boolean; message: string }> {
    try {
      const existingData = await this.loadStockData();
      
      const newStock: StockSymbol = {
        symbol,
        name,
        category,
        market
      };

      // 檢查是否已存在
      const stockKey = `${market}-${symbol}`;
      const existingStocks = new Set();
      
      if (existingData.stocks) {
        Object.values(existingData.stocks).forEach(marketData => {
          Object.values(marketData).forEach(categoryStocks => {
            categoryStocks.forEach((stock: any) => {
              existingStocks.add(`${stock.market}-${stock.symbol}`);
            });
          });
        });
      }

      if (existingStocks.has(stockKey)) {
        return {
          success: false,
          message: `Stock ${symbol} already exists`
        };
      }

      // 添加到對應的類別
      if (!existingData.stocks) {
        existingData.stocks = { TW: { stocks: [], etfs: [] }, US: { stocks: [], etfs: [] } };
      }

      if (category === 'stock') {
        existingData.stocks[market].stocks.push(newStock);
      } else {
        existingData.stocks[market].etfs.push(newStock);
      }

      existingData.lastUpdated = new Date().toISOString();
      await this.saveStockData(existingData);
      
      return {
        success: true,
        message: `Successfully added stock: ${symbol} (${name})`
      };
    } catch (error) {
      const errorMessage = `Failed to add stock: ${error}`;
      logger.api.error(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // 獲取股票統計信息
  async getStockStats(): Promise<{
    success: boolean;
    data?: {
      total: number;
      breakdown: {
        twStocks: number;
        twETFs: number;
        usStocks: number;
        usETFs: number;
      };
      lastUpdated: string;
      version: string;
    };
    message: string;
  }> {
    try {
      const data = await this.loadStockData();
      
      if (!data.stocks) {
        return {
          success: true,
          data: {
            total: 0,
            breakdown: { twStocks: 0, twETFs: 0, usStocks: 0, usETFs: 0 },
            lastUpdated: data.lastUpdated || '',
            version: data.version || ''
          },
          message: 'No stock data available'
        };
      }

      const twStocks = data.stocks.TW?.stocks?.length || 0;
      const twETFs = data.stocks.TW?.etfs?.length || 0;
      const usStocks = data.stocks.US?.stocks?.length || 0;
      const usETFs = data.stocks.US?.etfs?.length || 0;

      return {
        success: true,
        data: {
          total: twStocks + twETFs + usStocks + usETFs,
          breakdown: { twStocks, twETFs, usStocks, usETFs },
          lastUpdated: data.lastUpdated || '',
          version: data.version || ''
        },
        message: `Stock statistics retrieved successfully`
      };
    } catch (error) {
      const errorMessage = `Failed to get stock stats: ${error}`;
      logger.api.error(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // 獲取預設資料結構
  private getDefaultData(): StockData {
    return {
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
      stocks: {
        TW: { stocks: [], etfs: [] },
        US: { stocks: [], etfs: [] }
      }
    };
  }

  // 預設台股股票列表
  private getDefaultTWStocks(): StockSymbol[] {
    return [
      { symbol: '2330', name: '台積電', category: 'stock', market: 'TW' },
      { symbol: '2317', name: '鴻海', category: 'stock', market: 'TW' },
      { symbol: '2454', name: '聯發科', category: 'stock', market: 'TW' },
      { symbol: '2412', name: '中華電', category: 'stock', market: 'TW' },
      { symbol: '1301', name: '台塑', category: 'stock', market: 'TW' },
      { symbol: '1303', name: '南亞', category: 'stock', market: 'TW' },
      { symbol: '2002', name: '中鋼', category: 'stock', market: 'TW' },
      { symbol: '2881', name: '富邦金', category: 'stock', market: 'TW' },
      { symbol: '2882', name: '國泰金', category: 'stock', market: 'TW' },
      { symbol: '1216', name: '統一', category: 'stock', market: 'TW' }
    ];
  }

  // 擴展台股股票列表
  private getExtendedTWStocks(): StockSymbol[] {
    return [
      // 半導體
      { symbol: '2330', name: '台積電', category: 'stock', market: 'TW' },
      { symbol: '2454', name: '聯發科', category: 'stock', market: 'TW' },
      { symbol: '2303', name: '聯電', category: 'stock', market: 'TW' },
      { symbol: '2408', name: '南亞科', category: 'stock', market: 'TW' },
      { symbol: '2449', name: '京元電子', category: 'stock', market: 'TW' },
      { symbol: '2458', name: '義隆', category: 'stock', market: 'TW' },
      { symbol: '2481', name: '強茂', category: 'stock', market: 'TW' },
      { symbol: '3034', name: '聯詠', category: 'stock', market: 'TW' },
      { symbol: '3711', name: '日月光投控', category: 'stock', market: 'TW' },
      { symbol: '2379', name: '瑞昱', category: 'stock', market: 'TW' },
      { symbol: '2441', name: '超豐', category: 'stock', market: 'TW' },
      { symbol: '2442', name: '新唐', category: 'stock', market: 'TW' },
      { symbol: '2451', name: '創見', category: 'stock', market: 'TW' },
      { symbol: '2455', name: '全新', category: 'stock', market: 'TW' },
      { symbol: '2468', name: '華經', category: 'stock', market: 'TW' },
      { symbol: '2474', name: '可成', category: 'stock', market: 'TW' },
      { symbol: '2480', name: '敦陽科', category: 'stock', market: 'TW' },
      { symbol: '2482', name: '連宇', category: 'stock', market: 'TW' },
      { symbol: '2483', name: '百容', category: 'stock', market: 'TW' },
      { symbol: '2484', name: '希華', category: 'stock', market: 'TW' },
      { symbol: '2485', name: '兆赫', category: 'stock', market: 'TW' },
      { symbol: '2486', name: '一詮', category: 'stock', market: 'TW' },
      { symbol: '2487', name: '大毅', category: 'stock', market: 'TW' },
      { symbol: '2488', name: '漢平', category: 'stock', market: 'TW' },
      { symbol: '2489', name: '瑞軒', category: 'stock', market: 'TW' },
      { symbol: '2490', name: '信邦', category: 'stock', market: 'TW' },
      { symbol: '2491', name: '吉祥全', category: 'stock', market: 'TW' },
      { symbol: '2492', name: '華新科', category: 'stock', market: 'TW' },
      { symbol: '2493', name: '揚博', category: 'stock', market: 'TW' },
      { symbol: '2494', name: '國碩', category: 'stock', market: 'TW' },
      { symbol: '2495', name: '普安', category: 'stock', market: 'TW' },
      { symbol: '2496', name: '卓越', category: 'stock', market: 'TW' },
      { symbol: '2497', name: '怡利電', category: 'stock', market: 'TW' },
      { symbol: '2499', name: '東貝', category: 'stock', market: 'TW' },
      { symbol: '3006', name: '晶豪科', category: 'stock', market: 'TW' },
      { symbol: '3014', name: '聯陽', category: 'stock', market: 'TW' },
      { symbol: '3016', name: '嘉晶', category: 'stock', market: 'TW' },
      { symbol: '3017', name: '奇鋐', category: 'stock', market: 'TW' },
      { symbol: '3019', name: '亞光', category: 'stock', market: 'TW' },
      { symbol: '3021', name: '鴻名', category: 'stock', market: 'TW' },
      { symbol: '3022', name: '威強電', category: 'stock', market: 'TW' },
      { symbol: '3023', name: '信邦', category: 'stock', market: 'TW' },
      { symbol: '3024', name: '憶聲', category: 'stock', market: 'TW' },
      { symbol: '3025', name: '星通', category: 'stock', market: 'TW' },
      { symbol: '3026', name: '禾伸堂', category: 'stock', market: 'TW' },
      { symbol: '3027', name: '盛達', category: 'stock', market: 'TW' },
      { symbol: '3028', name: '增你強', category: 'stock', market: 'TW' },
      { symbol: '3029', name: '零壹', category: 'stock', market: 'TW' },
      { symbol: '3030', name: '德律', category: 'stock', market: 'TW' },
      { symbol: '3031', name: '佰鴻', category: 'stock', market: 'TW' },
      { symbol: '3032', name: '偉訓', category: 'stock', market: 'TW' },
      { symbol: '3033', name: '威健', category: 'stock', market: 'TW' },
      { symbol: '3035', name: '智原', category: 'stock', market: 'TW' },
      { symbol: '3036', name: '文曄', category: 'stock', market: 'TW' },
      { symbol: '3037', name: '欣興', category: 'stock', market: 'TW' },
      { symbol: '3038', name: '全台', category: 'stock', market: 'TW' },
      { symbol: '3040', name: '遠見', category: 'stock', market: 'TW' },
      { symbol: '3041', name: '揚智', category: 'stock', market: 'TW' },
      { symbol: '3042', name: '晶技', category: 'stock', market: 'TW' },
      { symbol: '3043', name: '科風', category: 'stock', market: 'TW' },
      { symbol: '3044', name: '健鼎', category: 'stock', market: 'TW' },
      { symbol: '3046', name: '建碁', category: 'stock', market: 'TW' },
      { symbol: '3047', name: '訊舟', category: 'stock', market: 'TW' },
      { symbol: '3048', name: '益登', category: 'stock', market: 'TW' },
      { symbol: '3049', name: '和鑫', category: 'stock', market: 'TW' },
      { symbol: '3050', name: '鈺德', category: 'stock', market: 'TW' },
      { symbol: '3051', name: '力特', category: 'stock', market: 'TW' },
      { symbol: '3052', name: '夆典', category: 'stock', market: 'TW' },
      { symbol: '3054', name: '立萬利', category: 'stock', market: 'TW' },
      { symbol: '3055', name: '蔚華科', category: 'stock', market: 'TW' },
      { symbol: '3056', name: '總太', category: 'stock', market: 'TW' },
      { symbol: '3057', name: '喬鼎', category: 'stock', market: 'TW' },
      { symbol: '3058', name: '立德', category: 'stock', market: 'TW' },
      { symbol: '3059', name: '華晶科', category: 'stock', market: 'TW' },
      { symbol: '3060', name: '銘異', category: 'stock', market: 'TW' },
      { symbol: '3062', name: '建漢', category: 'stock', market: 'TW' },
      { symbol: '3064', name: '泰偉', category: 'stock', market: 'TW' },
      { symbol: '3066', name: '李洲', category: 'stock', market: 'TW' },
      { symbol: '3067', name: '全域', category: 'stock', market: 'TW' },
      { symbol: '3071', name: '協禧', category: 'stock', market: 'TW' },
      { symbol: '3073', name: '天方能源', category: 'stock', market: 'TW' },
      { symbol: '3078', name: '僑威', category: 'stock', market: 'TW' },
      { symbol: '3081', name: '聯亞', category: 'stock', market: 'TW' },
      { symbol: '3083', name: '網龍', category: 'stock', market: 'TW' },
      { symbol: '3085', name: '新零售', category: 'stock', market: 'TW' },
      { symbol: '3086', name: '華義', category: 'stock', market: 'TW' },
      { symbol: '3088', name: '艾訊', category: 'stock', market: 'TW' },
      { symbol: '3089', name: '展碁國際', category: 'stock', market: 'TW' },
      { symbol: '3090', name: '日電貿', category: 'stock', market: 'TW' },
      { symbol: '3092', name: '鴻碩', category: 'stock', market: 'TW' },
      { symbol: '3093', name: '港建', category: 'stock', market: 'TW' },
      { symbol: '3094', name: '聯傑', category: 'stock', market: 'TW' },
      { symbol: '3095', name: '及成', category: 'stock', market: 'TW' },
      { symbol: '3105', name: '穩懋', category: 'stock', market: 'TW' },
      { symbol: '3114', name: '好德', category: 'stock', market: 'TW' },
      { symbol: '3115', name: '寶島極', category: 'stock', market: 'TW' },
      { symbol: '3118', name: '進階', category: 'stock', market: 'TW' },
      { symbol: '3122', name: '笙泉', category: 'stock', market: 'TW' },
      { symbol: '3128', name: '昇銳', category: 'stock', market: 'TW' },
      { symbol: '3130', name: '一零四', category: 'stock', market: 'TW' },
      { symbol: '3131', name: '弘塑', category: 'stock', market: 'TW' },
      { symbol: '3138', name: '耀登', category: 'stock', market: 'TW' },
      { symbol: '3141', name: '晶宏', category: 'stock', market: 'TW' },
      { symbol: '3147', name: '大綜', category: 'stock', market: 'TW' },
      { symbol: '3152', name: '璟德', category: 'stock', market: 'TW' },
      { symbol: '3163', name: '波若威', category: 'stock', market: 'TW' },
      { symbol: '3164', name: '景岳', category: 'stock', market: 'TW' },
      { symbol: '3167', name: '大量', category: 'stock', market: 'TW' },
      { symbol: '3169', name: '亞信', category: 'stock', market: 'TW' },
      { symbol: '3171', name: '新洲', category: 'stock', market: 'TW' },
      { symbol: '3176', name: '基亞', category: 'stock', market: 'TW' },
      { symbol: '3188', name: '鑫龍', category: 'stock', market: 'TW' },
      { symbol: '3189', name: '景碩', category: 'stock', market: 'TW' },
      { symbol: '3191', name: '和進', category: 'stock', market: 'TW' },
      { symbol: '3202', name: '樺晟', category: 'stock', market: 'TW' },
      { symbol: '3205', name: '佰研', category: 'stock', market: 'TW' },
      { symbol: '3206', name: '志豐', category: 'stock', market: 'TW' },
      { symbol: '3207', name: '耀勝', category: 'stock', market: 'TW' },
      { symbol: '3209', name: '全科', category: 'stock', market: 'TW' },
      { symbol: '3211', name: '順達', category: 'stock', market: 'TW' },
      { symbol: '3213', name: '茂訊', category: 'stock', market: 'TW' },
      { symbol: '3217', name: '優群', category: 'stock', market: 'TW' },
      { symbol: '3218', name: '大學光', category: 'stock', market: 'TW' },
      { symbol: '3219', name: '倚強', category: 'stock', market: 'TW' },
      { symbol: '3221', name: '台嘉碩', category: 'stock', market: 'TW' },
      { symbol: '3227', name: '原相', category: 'stock', market: 'TW' },
      { symbol: '3228', name: '金麗科', category: 'stock', market: 'TW' },
      { symbol: '3230', name: '錦明', category: 'stock', market: 'TW' },
      { symbol: '3232', name: '昱捷', category: 'stock', market: 'TW' },
      { symbol: '3234', name: '光環', category: 'stock', market: 'TW' },
      { symbol: '3236', name: '千如', category: 'stock', market: 'TW' },
      { symbol: '3245', name: '台星科', category: 'stock', market: 'TW' },
      { symbol: '3257', name: '虹冠電', category: 'stock', market: 'TW' },
      { symbol: '3260', name: '威剛', category: 'stock', market: 'TW' },
      { symbol: '3264', name: '欣銓', category: 'stock', market: 'TW' },
      { symbol: '3265', name: '台星科', category: 'stock', market: 'TW' },
      { symbol: '3266', name: '昇陽', category: 'stock', market: 'TW' },
      { symbol: '3272', name: '東碩', category: 'stock', market: 'TW' },
      { symbol: '3276', name: '宇環', category: 'stock', market: 'TW' },
      { symbol: '3284', name: '太普高', category: 'stock', market: 'TW' },
      { symbol: '3285', name: '微端', category: 'stock', market: 'TW' },
      { symbol: '3287', name: '廣寰科', category: 'stock', market: 'TW' },
      { symbol: '3288', name: '點晶', category: 'stock', market: 'TW' },
      { symbol: '3289', name: '宜特', category: 'stock', market: 'TW' },
      { symbol: '3290', name: '東浦', category: 'stock', market: 'TW' },
      { symbol: '3293', name: '鈊象', category: 'stock', market: 'TW' },
      { symbol: '3294', name: '英濟', category: 'stock', market: 'TW' },
      { symbol: '3296', name: '勝德', category: 'stock', market: 'TW' },
      { symbol: '3297', name: '杭特', category: 'stock', market: 'TW' },
      { symbol: '3299', name: '帛漢', category: 'stock', market: 'TW' },
      { symbol: '3303', name: '岱稜', category: 'stock', market: 'TW' },
      { symbol: '3305', name: '昇貿', category: 'stock', market: 'TW' },
      { symbol: '3306', name: '鼎天', category: 'stock', market: 'TW' },
      { symbol: '3308', name: '聯德', category: 'stock', market: 'TW' },
      { symbol: '3310', name: '佳穎', category: 'stock', market: 'TW' },
      { symbol: '3311', name: '閎暉', category: 'stock', market: 'TW' },
      { symbol: '3312', name: '弘憶股', category: 'stock', market: 'TW' },
      { symbol: '3313', name: '斐成', category: 'stock', market: 'TW' },
      { symbol: '3317', name: '尼克森', category: 'stock', market: 'TW' },
      { symbol: '3321', name: '同泰', category: 'stock', market: 'TW' },
      { symbol: '3322', name: '建舜電', category: 'stock', market: 'TW' },
      { symbol: '3323', name: '加百裕', category: 'stock', market: 'TW' },
      { symbol: '3324', name: '雙鴻', category: 'stock', market: 'TW' },
      { symbol: '3325', name: '旭品', category: 'stock', market: 'TW' },
      { symbol: '3332', name: '幸康', category: 'stock', market: 'TW' },
      { symbol: '3338', name: '泰碩', category: 'stock', market: 'TW' },
      { symbol: '3346', name: '麗清', category: 'stock', market: 'TW' },
      { symbol: '3354', name: '律勝', category: 'stock', market: 'TW' },
      { symbol: '3356', name: '奇偶', category: 'stock', market: 'TW' },
      { symbol: '3360', name: '尚立', category: 'stock', market: 'TW' },
      { symbol: '3362', name: '先進光', category: 'stock', market: 'TW' },
      { symbol: '3363', name: '上詮', category: 'stock', market: 'TW' },
      { symbol: '3372', name: '典範', category: 'stock', market: 'TW' },
      { symbol: '3373', name: '熱映', category: 'stock', market: 'TW' },
      { symbol: '3374', name: '精材', category: 'stock', market: 'TW' },
      { symbol: '3376', name: '新日興', category: 'stock', market: 'TW' },
      { symbol: '3380', name: '明泰', category: 'stock', market: 'TW' },
      { symbol: '3383', name: '新世紀', category: 'stock', market: 'TW' },
      { symbol: '3388', name: '崇越電', category: 'stock', market: 'TW' },
      { symbol: '3390', name: '旭軟', category: 'stock', market: 'TW' },
      { symbol: '3402', name: '漢科', category: 'stock', market: 'TW' },
      { symbol: '3406', name: '玉晶光', category: 'stock', market: 'TW' },
      { symbol: '3413', name: '京鼎', category: 'stock', market: 'TW' },
      { symbol: '3416', name: '融程電', category: 'stock', market: 'TW' },
      { symbol: '3419', name: '譁裕', category: 'stock', market: 'TW' },
      { symbol: '3426', name: '台興', category: 'stock', market: 'TW' },
      { symbol: '3432', name: '台端', category: 'stock', market: 'TW' },
      { symbol: '3434', name: '哲固', category: 'stock', market: 'TW' },
      { symbol: '3437', name: '榮創', category: 'stock', market: 'TW' },
      { symbol: '3441', name: '聯一光', category: 'stock', market: 'TW' },
      { symbol: '3443', name: '創意', category: 'stock', market: 'TW' },
      { symbol: '3444', name: '利機', category: 'stock', market: 'TW' },
      { symbol: '3450', name: '聯鈞', category: 'stock', market: 'TW' },
      { symbol: '3454', name: '晶睿', category: 'stock', market: 'TW' },
      { symbol: '3455', name: '由田', category: 'stock', market: 'TW' },
      { symbol: '3465', name: '進泰電子', category: 'stock', market: 'TW' },
      { symbol: '3466', name: '致振', category: 'stock', market: 'TW' },
      { symbol: '3479', name: '安勤', category: 'stock', market: 'TW' },
      { symbol: '3481', name: '群創', category: 'stock', market: 'TW' },
      { symbol: '3483', name: '力致', category: 'stock', market: 'TW' },
      { symbol: '3484', name: '崧騰', category: 'stock', market: 'TW' },
      { symbol: '3489', name: '森寶', category: 'stock', market: 'TW' },
      { symbol: '3490', name: '單井', category: 'stock', market: 'TW' },
      { symbol: '3491', name: '昇達科', category: 'stock', market: 'TW' },
      { symbol: '3492', name: '長盛', category: 'stock', market: 'TW' },
      { symbol: '3494', name: '誠研', category: 'stock', market: 'TW' },
      { symbol: '3498', name: '陽程', category: 'stock', market: 'TW' },
      { symbol: '3499', name: '環天科', category: 'stock', market: 'TW' },
      { symbol: '3501', name: '維熹', category: 'stock', market: 'TW' },
      { symbol: '3504', name: '揚明光', category: 'stock', market: 'TW' },
      { symbol: '3508', name: '位速', category: 'stock', market: 'TW' },
      { symbol: '3511', name: '矽瑪', category: 'stock', market: 'TW' },
      { symbol: '3512', name: '能緹', category: 'stock', market: 'TW' },
      { symbol: '3514', name: '昱晶', category: 'stock', market: 'TW' },
      { symbol: '3515', name: '華擎', category: 'stock', market: 'TW' },
      { symbol: '3516', name: '亞帝歐', category: 'stock', market: 'TW' },
      { symbol: '3518', name: '柏騰', category: 'stock', market: 'TW' },
      { symbol: '3520', name: '華盈', category: 'stock', market: 'TW' },
      { symbol: '3521', name: '鴻翊', category: 'stock', market: 'TW' },
      { symbol: '3522', name: '宏森', category: 'stock', market: 'TW' },
      { symbol: '3523', name: '迎輝', category: 'stock', market: 'TW' },
      { symbol: '3526', name: '凡甲', category: 'stock', market: 'TW' },
      { symbol: '3527', name: '聚積', category: 'stock', market: 'TW' },
      { symbol: '3528', name: '安馳', category: 'stock', market: 'TW' },
      { symbol: '3530', name: '晶相光', category: 'stock', market: 'TW' },
      { symbol: '3531', name: '先益', category: 'stock', market: 'TW' },
      { symbol: '3532', name: '台勝科', category: 'stock', market: 'TW' },
      { symbol: '3533', name: '嘉澤', category: 'stock', market: 'TW' },
      { symbol: '3534', name: '雷凌', category: 'stock', market: 'TW' },
      { symbol: '3535', name: '晶彩科', category: 'stock', market: 'TW' },
      { symbol: '3536', name: '誠創', category: 'stock', market: 'TW' },
      { symbol: '3540', name: '曜越', category: 'stock', market: 'TW' },
      { symbol: '3541', name: '西柏', category: 'stock', market: 'TW' },
      { symbol: '3543', name: '州巧', category: 'stock', market: 'TW' },
      { symbol: '3545', name: '敦泰', category: 'stock', market: 'TW' },
      { symbol: '3546', name: '宇峻', category: 'stock', market: 'TW' },
      { symbol: '3548', name: '兆利', category: 'stock', market: 'TW' },
      { symbol: '3550', name: '聯穎', category: 'stock', market: 'TW' },
      { symbol: '3551', name: '世禾', category: 'stock', market: 'TW' },
      { symbol: '3552', name: '同致', category: 'stock', market: 'TW' },
      { symbol: '3555', name: '重鵬', category: 'stock', market: 'TW' },
      { symbol: '3556', name: '禾瑞亞', category: 'stock', market: 'TW' },
      { symbol: '3557', name: '嘉威', category: 'stock', market: 'TW' },
      { symbol: '3558', name: '神準', category: 'stock', market: 'TW' },
      { symbol: '3561', name: '昇陽科', category: 'stock', market: 'TW' },
      { symbol: '3563', name: '牧德', category: 'stock', market: 'TW' },
      { symbol: '3564', name: '其陽', category: 'stock', market: 'TW' },
      { symbol: '3567', name: '逸昌', category: 'stock', market: 'TW' },
      { symbol: '3570', name: '大塚', category: 'stock', market: 'TW' },
      { symbol: '3576', name: '聯合再生', category: 'stock', market: 'TW' },
      { symbol: '3577', name: '泓格', category: 'stock', market: 'TW' },
      { symbol: '3580', name: '友威科', category: 'stock', market: 'TW' },
      { symbol: '3581', name: '博磊', category: 'stock', market: 'TW' },
      { symbol: '3583', name: '辛耘', category: 'stock', market: 'TW' },
      { symbol: '3587', name: '閎康', category: 'stock', market: 'TW' },
      { symbol: '3588', name: '通嘉', category: 'stock', market: 'TW' },
      { symbol: '3591', name: '艾笛森', category: 'stock', market: 'TW' },
      { symbol: '3592', name: '瑞鼎', category: 'stock', market: 'TW' },
      { symbol: '3593', name: '力銘', category: 'stock', market: 'TW' },
      { symbol: '3594', name: '磐儀', category: 'stock', market: 'TW' },
      { symbol: '3596', name: '智易', category: 'stock', market: 'TW' },
      { symbol: '3598', name: '奕力', category: 'stock', market: 'TW' },
      { symbol: '3605', name: '宏致', category: 'stock', market: 'TW' },
      { symbol: '3607', name: '谷崧', category: 'stock', market: 'TW' },
      { symbol: '3611', name: '鼎翰', category: 'stock', market: 'TW' },
      { symbol: '3615', name: '安可', category: 'stock', market: 'TW' },
      { symbol: '3617', name: '碩天', category: 'stock', market: 'TW' },
      { symbol: '3622', name: '洋華', category: 'stock', market: 'TW' },
      { symbol: '3623', name: '富晶通', category: 'stock', market: 'TW' },
      { symbol: '3624', name: '光頡', category: 'stock', market: 'TW' },
      { symbol: '3625', name: '西城', category: 'stock', market: 'TW' },
      { symbol: '3628', name: '盈正', category: 'stock', market: 'TW' },
      { symbol: '3629', name: '地心引力', category: 'stock', market: 'TW' },
      { symbol: '3630', name: '新鉅科', category: 'stock', market: 'TW' },
      { symbol: '3631', name: '晟楠', category: 'stock', market: 'TW' },
      { symbol: '3632', name: '研勤', category: 'stock', market: 'TW' },
      { symbol: '3645', name: '達邁', category: 'stock', market: 'TW' },
      { symbol: '3646', name: '艾恩特', category: 'stock', market: 'TW' },
      { symbol: '3652', name: '精聯', category: 'stock', market: 'TW' },
      { symbol: '3653', name: '健策', category: 'stock', market: 'TW' },
      { symbol: '3661', name: '世芯-KY', category: 'stock', market: 'TW' },
      { symbol: '3663', name: '鑫科', category: 'stock', market: 'TW' },
      { symbol: '3664', name: '安瑞-KY', category: 'stock', market: 'TW' },
      { symbol: '3665', name: '貿聯-KY', category: 'stock', market: 'TW' },
      { symbol: '3666', name: '光耀', category: 'stock', market: 'TW' },
      { symbol: '3669', name: '圓展', category: 'stock', market: 'TW' },
      { symbol: '3672', name: '康聯訊', category: 'stock', market: 'TW' },
      { symbol: '3673', name: 'TPK-KY', category: 'stock', market: 'TW' },
      { symbol: '3675', name: '德微', category: 'stock', market: 'TW' },
      { symbol: '3679', name: '新至陞', category: 'stock', market: 'TW' },
      { symbol: '3680', name: '家登', category: 'stock', market: 'TW' },
      { symbol: '3682', name: '亞太電', category: 'stock', market: 'TW' },
      { symbol: '3684', name: '榮昌', category: 'stock', market: 'TW' },
      { symbol: '3686', name: '達能', category: 'stock', market: 'TW' },
      { symbol: '3687', name: '歐買尬', category: 'stock', market: 'TW' },
      { symbol: '3691', name: '碩禾', category: 'stock', market: 'TW' },
      { symbol: '3693', name: '營邦', category: 'stock', market: 'TW' },
      { symbol: '3694', name: '海華', category: 'stock', market: 'TW' },
      { symbol: '3698', name: '隆達', category: 'stock', market: 'TW' },
      { symbol: '3701', name: '大眾控', category: 'stock', market: 'TW' },
      { symbol: '3702', name: '大聯大', category: 'stock', market: 'TW' },
      { symbol: '3703', name: '欣陸', category: 'stock', market: 'TW' },
      { symbol: '3704', name: '合勤控', category: 'stock', market: 'TW' },
      { symbol: '3705', name: '永信', category: 'stock', market: 'TW' },
      { symbol: '3706', name: '神達', category: 'stock', market: 'TW' },
      { symbol: '3708', name: '上緯投控', category: 'stock', market: 'TW' },
      { symbol: '3710', name: '連展投控', category: 'stock', market: 'TW' },
      { symbol: '3712', name: '永崴投控', category: 'stock', market: 'TW' },
      { symbol: '3713', name: '新諾威', category: 'stock', market: 'TW' },
      { symbol: '3714', name: '富采', category: 'stock', market: 'TW' },
      { symbol: '3715', name: '定穎投控', category: 'stock', market: 'TW' },
      { symbol: '3723', name: '力致', category: 'stock', market: 'TW' },
      { symbol: '3738', name: '麗清', category: 'stock', market: 'TW' },
      { symbol: '3747', name: '浩基', category: 'stock', market: 'TW' },
      { symbol: '3759', name: '榮昌', category: 'stock', market: 'TW' },
      { symbol: '3762', name: '華冠', category: 'stock', market: 'TW' },
      { symbol: '3777', name: '信昌電', category: 'stock', market: 'TW' },
      { symbol: '3789', name: '神準', category: 'stock', market: 'TW' },
      { symbol: '3798', name: '大展證', category: 'stock', market: 'TW' },
      { symbol: '3808', name: '金寶', category: 'stock', market: 'TW' },
      { symbol: '3835', name: '溢泰', category: 'stock', market: 'TW' },
      { symbol: '3844', name: '巨虹', category: 'stock', market: 'TW' },
      { symbol: '3856', name: '中探針', category: 'stock', market: 'TW' },
      { symbol: '3864', name: '安瑞-KY', category: 'stock', market: 'TW' },
      { symbol: '3888', name: '金居', category: 'stock', market: 'TW' },
      { symbol: '3899', name: '長園科', category: 'stock', market: 'TW' },
      { symbol: '3904', name: '大聯大', category: 'stock', market: 'TW' },
      { symbol: '3918', name: '金利', category: 'stock', market: 'TW' },
      { symbol: '3923', name: '力特', category: 'stock', market: 'TW' },
      { symbol: '3924', name: '中光電', category: 'stock', market: 'TW' },
      { symbol: '3928', name: '網通', category: 'stock', market: 'TW' },
      { symbol: '3933', name: '晶焱', category: 'stock', market: 'TW' },
      { symbol: '3936', name: '泰鼎-KY', category: 'stock', market: 'TW' },
      { symbol: '3947', name: '茂達', category: 'stock', market: 'TW' },
      { symbol: '3954', name: '光菱', category: 'stock', market: 'TW' },
      { symbol: '3960', name: '金像電', category: 'stock', market: 'TW' },
      { symbol: '3962', name: '永信建', category: 'stock', market: 'TW' },
      { symbol: '3968', name: '長華科', category: 'stock', market: 'TW' },
      { symbol: '3976', name: '國統', category: 'stock', market: 'TW' },
      { symbol: '3991', name: '晨星', category: 'stock', market: 'TW' },
      { symbol: '3992', name: '華晶科', category: 'stock', market: 'TW' },
      { symbol: '3993', name: '禾伸堂', category: 'stock', market: 'TW' },
      { symbol: '3994', name: '光頡', category: 'stock', market: 'TW' },
      { symbol: '3995', name: '光菱', category: 'stock', market: 'TW' },
      { symbol: '3996', name: '金像電', category: 'stock', market: 'TW' },
      { symbol: '3997', name: '永信建', category: 'stock', market: 'TW' },
      { symbol: '3998', name: '長華科', category: 'stock', market: 'TW' },
      { symbol: '3999', name: '國統', category: 'stock', market: 'TW' },
      
      // 電子
      { symbol: '2317', name: '鴻海', category: 'stock', market: 'TW' },
      { symbol: '2308', name: '台達電', category: 'stock', market: 'TW' },
      { symbol: '2377', name: '微星', category: 'stock', market: 'TW' },
      { symbol: '2354', name: '鴻準', category: 'stock', market: 'TW' },
      { symbol: '2357', name: '華碩', category: 'stock', market: 'TW' },
      { symbol: '2382', name: '廣達', category: 'stock', market: 'TW' },
      { symbol: '2417', name: '圓剛', category: 'stock', market: 'TW' },
      { symbol: '2439', name: '美律', category: 'stock', market: 'TW' },
      { symbol: '2498', name: '宏達電', category: 'stock', market: 'TW' },
      { symbol: '3231', name: '緯創', category: 'stock', market: 'TW' },
      { symbol: '4938', name: '和碩', category: 'stock', market: 'TW' },
      
      // 電信
      { symbol: '2412', name: '中華電', category: 'stock', market: 'TW' },
      { symbol: '3045', name: '台灣大', category: 'stock', market: 'TW' },
      
      // 塑膠
      { symbol: '1301', name: '台塑', category: 'stock', market: 'TW' },
      { symbol: '1303', name: '南亞', category: 'stock', market: 'TW' },
      { symbol: '6505', name: '台塑化', category: 'stock', market: 'TW' },
      
      // 鋼鐵
      { symbol: '2002', name: '中鋼', category: 'stock', market: 'TW' },
      { symbol: '9958', name: '世紀鋼', category: 'stock', market: 'TW' },
      
      // 食品
      { symbol: '1216', name: '統一', category: 'stock', market: 'TW' },
      
      // 汽車
      { symbol: '2207', name: '和泰車', category: 'stock', market: 'TW' },
      
      // 金融
      { symbol: '2881', name: '富邦金', category: 'stock', market: 'TW' },
      { symbol: '2882', name: '國泰金', category: 'stock', market: 'TW' },
      { symbol: '2884', name: '玉山金', category: 'stock', market: 'TW' },
      { symbol: '2885', name: '元大金', category: 'stock', market: 'TW' },
      { symbol: '2891', name: '中信金', category: 'stock', market: 'TW' },
      { symbol: '5871', name: '中租-KY', category: 'stock', market: 'TW' },
      { symbol: '5880', name: '合庫金', category: 'stock', market: 'TW' },
      
      // 光學
      { symbol: '3008', name: '大立光', category: 'stock', market: 'TW' },
      
      // 紡織
      { symbol: '9904', name: '寶成', category: 'stock', market: 'TW' },
      { symbol: '9910', name: '豐泰', category: 'stock', market: 'TW' },
      
      // 其他
      { symbol: '9921', name: '巨大', category: 'stock', market: 'TW' },
      { symbol: '9945', name: '潤泰新', category: 'stock', market: 'TW' }
    ];
  }

  // 預設台股ETF列表
  private getDefaultTWETFs(): StockSymbol[] {
    return [
      { symbol: '0050', name: '元大台灣50', category: 'etf', market: 'TW' },
      { symbol: '0056', name: '元大高股息', category: 'etf', market: 'TW' },
      { symbol: '00878', name: '國泰永續高股息', category: 'etf', market: 'TW' },
      { symbol: '0061', name: '元大寶滬深', category: 'etf', market: 'TW' },
      { symbol: '00692', name: '富邦公司治理', category: 'etf', market: 'TW' }
    ];
  }

  // 擴展台股ETF列表
  private getExtendedTWETFs(): StockSymbol[] {
    return [
      { symbol: '0050', name: '元大台灣50', category: 'etf', market: 'TW' },
      { symbol: '0056', name: '元大高股息', category: 'etf', market: 'TW' },
      { symbol: '00878', name: '國泰永續高股息', category: 'etf', market: 'TW' },
      { symbol: '00881', name: '國泰台灣5G+', category: 'etf', market: 'TW' },
      { symbol: '00892', name: '富邦台灣半導體', category: 'etf', market: 'TW' },
      { symbol: '00929', name: '復華台灣科技', category: 'etf', market: 'TW' },
      { symbol: '00930', name: '永豐台灣ESG', category: 'etf', market: 'TW' },
      { symbol: '00935', name: '野村台灣創新科技', category: 'etf', market: 'TW' },
      { symbol: '00939', name: '統一台灣高息動能', category: 'etf', market: 'TW' },
      { symbol: '00940', name: '元大台灣價值高息', category: 'etf', market: 'TW' },
      { symbol: '00941', name: '中信上游半導體', category: 'etf', market: 'TW' },
      { symbol: '00942', name: '中信小資高價30', category: 'etf', market: 'TW' },
      { symbol: '00943', name: '兆豐台灣晶圓製造', category: 'etf', market: 'TW' },
      { symbol: '00944', name: '野村趨勢動能高息', category: 'etf', market: 'TW' },
      { symbol: '00945', name: '野村台灣創新科技50', category: 'etf', market: 'TW' },
      { symbol: '00946', name: '群益台灣精選高息', category: 'etf', market: 'TW' },
      { symbol: '00947', name: '統一台灣高息動能', category: 'etf', market: 'TW' },
      { symbol: '00948', name: '元大台灣高息低波', category: 'etf', market: 'TW' },
      { symbol: '00949', name: '富邦台灣半導體', category: 'etf', market: 'TW' },
      { symbol: '00950', name: '元大台灣高息低波', category: 'etf', market: 'TW' },
      { symbol: '0061', name: '元大寶滬深', category: 'etf', market: 'TW' },
      { symbol: '00692', name: '富邦公司治理', category: 'etf', market: 'TW' }
    ];
  }

  // 預設美股股票列表
  private getDefaultUSStocks(): StockSymbol[] {
    return [
      { symbol: 'AAPL', name: 'Apple Inc.', category: 'stock', market: 'US' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'stock', market: 'US' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'stock', market: 'US' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'stock', market: 'US' },
      { symbol: 'TSLA', name: 'Tesla Inc.', category: 'stock', market: 'US' },
      { symbol: 'META', name: 'Meta Platforms Inc.', category: 'stock', market: 'US' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'stock', market: 'US' },
      { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', category: 'stock', market: 'US' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', category: 'stock', market: 'US' },
      { symbol: 'V', name: 'Visa Inc.', category: 'stock', market: 'US' }
    ];
  }

  // 擴展美股股票列表
  private getExtendedUSStocks(): StockSymbol[] {
    return [
      // 科技股
      { symbol: 'AAPL', name: 'Apple Inc.', category: 'stock', market: 'US' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'stock', market: 'US' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'stock', market: 'US' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'stock', market: 'US' },
      { symbol: 'TSLA', name: 'Tesla Inc.', category: 'stock', market: 'US' },
      { symbol: 'META', name: 'Meta Platforms Inc.', category: 'stock', market: 'US' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'stock', market: 'US' },
      { symbol: 'NFLX', name: 'Netflix Inc.', category: 'stock', market: 'US' },
      { symbol: 'ADBE', name: 'Adobe Inc.', category: 'stock', market: 'US' },
      { symbol: 'CRM', name: 'Salesforce Inc.', category: 'stock', market: 'US' },
      { symbol: 'ORCL', name: 'Oracle Corporation', category: 'stock', market: 'US' },
      { symbol: 'INTC', name: 'Intel Corporation', category: 'stock', market: 'US' },
      { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'stock', market: 'US' },
      { symbol: 'QCOM', name: 'Qualcomm Incorporated', category: 'stock', market: 'US' },
      { symbol: 'AVGO', name: 'Broadcom Inc.', category: 'stock', market: 'US' },
      { symbol: 'TXN', name: 'Texas Instruments', category: 'stock', market: 'US' },
      { symbol: 'MU', name: 'Micron Technology', category: 'stock', market: 'US' },
      { symbol: 'IBM', name: 'International Business Machines', category: 'stock', market: 'US' },
      { symbol: 'CSCO', name: 'Cisco Systems Inc.', category: 'stock', market: 'US' },
      
      // 金融股
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', category: 'stock', market: 'US' },
      { symbol: 'BAC', name: 'Bank of America Corp.', category: 'stock', market: 'US' },
      { symbol: 'WFC', name: 'Wells Fargo & Company', category: 'stock', market: 'US' },
      { symbol: 'GS', name: 'Goldman Sachs Group Inc.', category: 'stock', market: 'US' },
      { symbol: 'MS', name: 'Morgan Stanley', category: 'stock', market: 'US' },
      { symbol: 'C', name: 'Citigroup Inc.', category: 'stock', market: 'US' },
      { symbol: 'AXP', name: 'American Express Company', category: 'stock', market: 'US' },
      { symbol: 'BLK', name: 'BlackRock Inc.', category: 'stock', market: 'US' },
      { symbol: 'SCHW', name: 'Charles Schwab Corporation', category: 'stock', market: 'US' },
      
      // 醫療保健
      { symbol: 'JNJ', name: 'Johnson & Johnson', category: 'stock', market: 'US' },
      { symbol: 'PFE', name: 'Pfizer Inc.', category: 'stock', market: 'US' },
      { symbol: 'UNH', name: 'UnitedHealth Group Inc.', category: 'stock', market: 'US' },
      { symbol: 'ABBV', name: 'AbbVie Inc.', category: 'stock', market: 'US' },
      { symbol: 'MRK', name: 'Merck & Co. Inc.', category: 'stock', market: 'US' },
      { symbol: 'TMO', name: 'Thermo Fisher Scientific', category: 'stock', market: 'US' },
      { symbol: 'ABT', name: 'Abbott Laboratories', category: 'stock', market: 'US' },
      { symbol: 'DHR', name: 'Danaher Corporation', category: 'stock', market: 'US' },
      { symbol: 'BMY', name: 'Bristol-Myers Squibb', category: 'stock', market: 'US' },
      { symbol: 'AMGN', name: 'Amgen Inc.', category: 'stock', market: 'US' },
      
      // 消費品
      { symbol: 'PG', name: 'Procter & Gamble Co.', category: 'stock', market: 'US' },
      { symbol: 'KO', name: 'Coca-Cola Company', category: 'stock', market: 'US' },
      { symbol: 'PEP', name: 'PepsiCo Inc.', category: 'stock', market: 'US' },
      { symbol: 'WMT', name: 'Walmart Inc.', category: 'stock', market: 'US' },
      { symbol: 'HD', name: 'Home Depot Inc.', category: 'stock', market: 'US' },
      { symbol: 'MCD', name: 'McDonald\'s Corporation', category: 'stock', market: 'US' },
      { symbol: 'SBUX', name: 'Starbucks Corporation', category: 'stock', market: 'US' },
      { symbol: 'NKE', name: 'NIKE Inc.', category: 'stock', market: 'US' },
      { symbol: 'DIS', name: 'Walt Disney Company', category: 'stock', market: 'US' },
      { symbol: 'CMCSA', name: 'Comcast Corporation', category: 'stock', market: 'US' },
      
      // 能源
      { symbol: 'XOM', name: 'Exxon Mobil Corporation', category: 'stock', market: 'US' },
      { symbol: 'CVX', name: 'Chevron Corporation', category: 'stock', market: 'US' },
      { symbol: 'COP', name: 'ConocoPhillips', category: 'stock', market: 'US' },
      { symbol: 'EOG', name: 'EOG Resources Inc.', category: 'stock', market: 'US' },
      { symbol: 'SLB', name: 'Schlumberger Limited', category: 'stock', market: 'US' },
      
      // 工業
      { symbol: 'BA', name: 'Boeing Company', category: 'stock', market: 'US' },
      { symbol: 'CAT', name: 'Caterpillar Inc.', category: 'stock', market: 'US' },
      { symbol: 'GE', name: 'General Electric Company', category: 'stock', market: 'US' },
      { symbol: 'HON', name: 'Honeywell International', category: 'stock', market: 'US' },
      { symbol: 'MMM', name: '3M Company', category: 'stock', market: 'US' },
      { symbol: 'UPS', name: 'United Parcel Service', category: 'stock', market: 'US' },
      { symbol: 'FDX', name: 'FedEx Corporation', category: 'stock', market: 'US' },
      
      // 通訊
      { symbol: 'VZ', name: 'Verizon Communications', category: 'stock', market: 'US' },
      { symbol: 'T', name: 'AT&T Inc.', category: 'stock', market: 'US' },
      { symbol: 'TMUS', name: 'T-Mobile US Inc.', category: 'stock', market: 'US' },
      
      // 其他
      { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', category: 'stock', market: 'US' },
      { symbol: 'V', name: 'Visa Inc.', category: 'stock', market: 'US' },
      { symbol: 'MA', name: 'Mastercard Incorporated', category: 'stock', market: 'US' },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc.', category: 'stock', market: 'US' },
      { symbol: 'SQ', name: 'Block Inc.', category: 'stock', market: 'US' },
      { symbol: 'UBER', name: 'Uber Technologies Inc.', category: 'stock', market: 'US' },
      { symbol: 'LYFT', name: 'Lyft Inc.', category: 'stock', market: 'US' },
      { symbol: 'SPOT', name: 'Spotify Technology S.A.', category: 'stock', market: 'US' },
      { symbol: 'ZM', name: 'Zoom Video Communications', category: 'stock', market: 'US' },
      { symbol: 'SHOP', name: 'Shopify Inc.', category: 'stock', market: 'US' },
      { symbol: 'ROKU', name: 'Roku Inc.', category: 'stock', market: 'US' },
      { symbol: 'SNAP', name: 'Snap Inc.', category: 'stock', market: 'US' }
    ];
  }

  // 預設美股ETF列表
  private getDefaultUSETFs(): StockSymbol[] {
    return [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'etf', market: 'US' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'etf', market: 'US' },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'etf', market: 'US' },
      { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', category: 'etf', market: 'US' },
      { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', category: 'etf', market: 'US' }
    ];
  }

  // 擴展美股ETF列表
  private getExtendedUSETFs(): StockSymbol[] {
    return [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'etf', market: 'US' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'etf', market: 'US' },
      { symbol: 'IWM', name: 'iShares Russell 2000 ETF', category: 'etf', market: 'US' },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'etf', market: 'US' },
      { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'etf', market: 'US' },
      { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', category: 'etf', market: 'US' },
      { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', category: 'etf', market: 'US' },
      { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', category: 'etf', market: 'US' },
      { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', category: 'etf', market: 'US' },
      { symbol: 'GLD', name: 'SPDR Gold Shares', category: 'etf', market: 'US' },
      { symbol: 'SLV', name: 'iShares Silver Trust', category: 'etf', market: 'US' },
      { symbol: 'USO', name: 'United States Oil Fund LP', category: 'etf', market: 'US' },
      { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund', category: 'etf', market: 'US' },
      { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', category: 'etf', market: 'US' },
      { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund', category: 'etf', market: 'US' },
      { symbol: 'XLV', name: 'Health Care Select Sector SPDR Fund', category: 'etf', market: 'US' },
      { symbol: 'XLI', name: 'Industrial Select Sector SPDR Fund', category: 'etf', market: 'US' },
      { symbol: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund', category: 'etf', market: 'US' },
      { symbol: 'XLY', name: 'Consumer Discretionary Select Sector SPDR Fund', category: 'etf', market: 'US' },
      { symbol: 'XLU', name: 'Utilities Select Sector SPDR Fund', category: 'etf', market: 'US' },
      { symbol: 'XLB', name: 'Materials Select Sector SPDR Fund', category: 'etf', market: 'US' },
      { symbol: 'XLRE', name: 'Real Estate Select Sector SPDR Fund', category: 'etf', market: 'US' }
    ];
  }
}
