import yahooFinance from 'yahoo-finance2';
import { StockCache } from '../stock-cache';
import { HistoricalDataManager } from '../historical-data-manager';
import { CollectionMonitor } from './collection-monitor';
import { logger } from '../logger';
import fs from 'fs';
import path from 'path';

export interface StockInfo {
  symbol: string;
  market: string;
  name?: string;
  sector?: string;
  industry?: string;
  lastUpdated?: string;
  priority: number; // 1-5，5為最高優先級
}

export interface CollectionConfig {
  maxConcurrent: number; // 最大並發數
  delayBetweenRequests: number; // 請求間隔 (ms)
  retryAttempts: number; // 重試次數
  batchSize: number; // 批次大小
  timeout: number; // 請求超時時間 (ms)
}

export class StockDataCollector {
  private stockCache: StockCache;
  private historicalManager: HistoricalDataManager;
  private monitor: CollectionMonitor;
  private config: CollectionConfig;
  private isCollecting: boolean = false;
  private activeRequests: number = 0;
  private currentJobId?: string;

  constructor(config: Partial<CollectionConfig> = {}) {
    this.stockCache = new StockCache();
    this.historicalManager = new HistoricalDataManager();
    this.monitor = new CollectionMonitor();
    this.config = {
      maxConcurrent: 3, // 限制並發數避免被擋
      delayBetweenRequests: 1000, // 1秒間隔
      retryAttempts: 3,
      batchSize: 50, // 每批50支股票
      timeout: 30000, // 30秒超時
      ...config
    };
  }

  /**
   * 智能收集股票資料
   */
  async collectStockData(
    stocks: StockInfo[],
    interval: string = '1d',
    period: string = '1mo',
    jobId?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    if (this.isCollecting) {
      throw new Error('資料收集器正在運行中');
    }

    this.isCollecting = true;
    this.currentJobId = jobId;
    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      logger.dataCollection.start(`開始收集 ${stocks.length} 支股票資料`);

      // 按優先級排序
      const sortedStocks = this.sortByPriority(stocks);
      
      // 分批處理
      const batches = this.createBatches(sortedStocks, this.config.batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.dataCollection.progress(`處理批次 ${i + 1}/${batches.length} (${batch.length} 支股票)`);
        
        // 更新監控進度
        if (this.currentJobId) {
          this.monitor.updateJobProgress(this.currentJobId, {
            currentBatch: i + 1,
            totalBatches: batches.length,
            completed: results.success + results.failed
          });
        }
        
        const batchResults = await this.processBatch(batch, interval, period);
        results.success += batchResults.success;
        results.failed += batchResults.failed;
        results.errors.push(...batchResults.errors);
        
        // 批次間延遲
        if (i < batches.length - 1) {
          await this.delay(5000); // 5秒批次間隔
        }
      }

      // 完成監控
      if (this.currentJobId) {
        this.monitor.completeJob(this.currentJobId, 'completed');
      }

      logger.dataCollection.complete(`資料收集完成: 成功 ${results.success}, 失敗 ${results.failed}`);
      return results;

    } catch (error) {
      // 失敗監控
      if (this.currentJobId) {
        this.monitor.completeJob(this.currentJobId, 'failed', error instanceof Error ? error.message : '未知錯誤');
      }
      
      logger.dataCollection.error('資料收集過程發生錯誤', error);
      throw error;
    } finally {
      this.isCollecting = false;
      this.currentJobId = undefined;
    }
  }

  /**
   * 處理單個批次
   */
  private async processBatch(
    stocks: StockInfo[],
    interval: string,
    period: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    const promises: Promise<void>[] = [];

    for (const stock of stocks) {
      // 檢查並發限制
      while (this.activeRequests >= this.config.maxConcurrent) {
        await this.delay(100);
      }

      this.activeRequests++;
      const promise = this.collectSingleStock(stock, interval, period)
        .then(() => {
          results.success++;
          
          // 更新監控進度
          if (this.currentJobId) {
            this.monitor.updateJobProgress(this.currentJobId, {
              success: results.success,
              failed: results.failed,
              completed: results.success + results.failed,
              currentStock: `${stock.market}/${stock.symbol}`,
              currentMarket: stock.market
            });
          }
        })
        .catch((error) => {
          results.failed++;
          results.errors.push(`${stock.market}/${stock.symbol}: ${error.message}`);
          
          // 更新監控進度
          if (this.currentJobId) {
            this.monitor.updateJobProgress(this.currentJobId, {
              success: results.success,
              failed: results.failed,
              completed: results.success + results.failed,
              currentStock: `${stock.market}/${stock.symbol}`,
              currentMarket: stock.market,
              error: error.message
            });
          }
        })
        .finally(() => {
          this.activeRequests--;
        });

      promises.push(promise);
      
      // 請求間延遲
      await this.delay(this.config.delayBetweenRequests);
    }

    // 等待所有請求完成
    await Promise.allSettled(promises);
    return results;
  }

  /**
   * 收集單支股票資料
   */
  private async collectSingleStock(
    stock: StockInfo,
    interval: string,
    period: string
  ): Promise<void> {
    const symbol = `${stock.symbol}.${stock.market}`;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        logger.dataCollection.request(`收集 ${symbol} 資料 (嘗試 ${attempt}/${this.config.retryAttempts})`);

        // 使用 Promise.race 實現超時
        const dataPromise = yahooFinance.historical(symbol, {
          period1: period,
          interval: interval as any
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('請求超時')), this.config.timeout);
        });

        const data = await Promise.race([dataPromise, timeoutPromise]) as any[];

        if (!data || data.length === 0) {
          throw new Error('無資料返回');
        }

        // 儲存到快取
        await this.stockCache.setCachedData(stock.market, stock.symbol, interval, data);
        
        // 儲存歷史資料
        await this.historicalManager.saveHistoricalData(stock.market, stock.symbol, interval, data);
        
        // 更新股票資訊
        await this.updateStockInfo(stock, data[data.length - 1]);
        
        logger.dataCollection.success(`成功收集 ${symbol} 資料 (${data.length} 筆)`);
        return;

      } catch (error) {
        logger.dataCollection.error(`收集 ${symbol} 失敗 (嘗試 ${attempt})`, error);
        
        if (attempt === this.config.retryAttempts) {
          throw error;
        }
        
        // 重試前延遲
        await this.delay(2000 * attempt); // 遞增延遲
      }
    }
  }

  /**
   * 按優先級排序股票
   */
  private sortByPriority(stocks: StockInfo[]): StockInfo[] {
    return stocks.sort((a, b) => {
      // 優先級高的在前
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // 同優先級按最後更新時間排序（舊的在前）
      const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return aTime - bTime;
    });
  }

  /**
   * 建立批次
   */
  private createBatches(stocks: StockInfo[], batchSize: number): StockInfo[][] {
    const batches: StockInfo[][] = [];
    for (let i = 0; i < stocks.length; i += batchSize) {
      batches.push(stocks.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 更新股票資訊
   */
  private async updateStockInfo(stock: StockInfo, latestData: any): Promise<void> {
    const stockInfoPath = path.join(process.cwd(), 'data', 'stocks', `${stock.market}_${stock.symbol}.json`);
    
    const stockInfo = {
      ...stock,
      lastUpdated: new Date().toISOString(),
      lastPrice: latestData.close,
      lastVolume: latestData.volume
    };

    // 確保目錄存在
    const dir = path.dirname(stockInfoPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(stockInfoPath, JSON.stringify(stockInfo, null, 2));
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 取得收集狀態
   */
  getStatus() {
    return {
      isCollecting: this.isCollecting,
      activeRequests: this.activeRequests,
      config: this.config,
      currentJobId: this.currentJobId
    };
  }

  /**
   * 取得監控器
   */
  getMonitor(): CollectionMonitor {
    return this.monitor;
  }

  /**
   * 停止收集
   */
  stop() {
    this.isCollecting = false;
    logger.dataCollection.info('資料收集已停止');
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CollectionConfig>) {
    this.config = { ...this.config, ...newConfig };
    logger.dataCollection.info('配置已更新', this.config);
  }
}
