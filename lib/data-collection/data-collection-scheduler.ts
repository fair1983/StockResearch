import { StockDataCollector, CollectionConfig as CollectorConfig } from './stock-data-collector';
import { StockListManager } from './stock-list-manager';
import { CollectionMonitor } from './collection-monitor';
import { CollectionConfigManager, CollectionConfig } from './collection-config-manager';
import { logger } from '../logger';

export interface ScheduleConfig {
  enabled: boolean;
  interval: string; // cron 表達式
  markets: string[]; // 要收集的市場
  updateOnly: boolean; // 只更新需要更新的股票
  maxAgeHours: number; // 最大年齡（小時）
}

export interface CollectionJob {
  id: string;
  type: 'full' | 'update' | 'market';
  markets?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    success: number;
    failed: number;
  };
  startTime?: string;
  endTime?: string;
  error?: string;
}

export class DataCollectionScheduler {
  private collector: StockDataCollector;
  private stockListManager: StockListManager;
  private monitor: CollectionMonitor;
  private configManager: CollectionConfigManager;
  private jobs: Map<string, CollectionJob> = new Map();
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.collector = new StockDataCollector();
    this.stockListManager = new StockListManager();
    this.monitor = this.collector.getMonitor();
    this.configManager = new CollectionConfigManager();
  }

  /**
   * 啟動排程器
   */
  start(): void {
    if (this.isRunning) {
      logger.scheduler.warn('排程器已在運行中');
      return;
    }

    const config = this.configManager.getConfig();
    if (!config.enabled) {
      logger.scheduler.info('排程器已停用');
      return;
    }

    this.isRunning = true;
    this.scheduleNextRun();
    logger.scheduler.start('資料收集排程器已啟動');
  }

  /**
   * 停止排程器
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }
    logger.scheduler.stop('資料收集排程器已停止');
  }

  /**
   * 排程下次執行
   */
  private scheduleNextRun(): void {
    if (!this.isRunning) return;

    const nextRun = this.getNextRunTime();
    const delay = nextRun.getTime() - Date.now();

    this.intervalId = setTimeout(async () => {
      await this.executeScheduledCollection();
      this.scheduleNextRun(); // 排程下次執行
    }, delay);

    logger.scheduler.info(`下次執行時間: ${nextRun.toISOString()}`);
  }

  /**
   * 取得下次執行時間
   */
  private getNextRunTime(): Date {
    const config = this.configManager.getConfig();
    const now = new Date();
    
    // 簡化的 cron 解析（支援每小時執行）
    const match = config.scheduleInterval.match(/0 \*\/ (\d+) \* \* \*/);
    
    if (match) {
      const hours = parseInt(match[1]);
      const nextRun = new Date(now);
      nextRun.setHours(nextRun.getHours() + hours);
      nextRun.setMinutes(0);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
      return nextRun;
    }

    // 使用配置的更新間隔
    const nextRun = new Date(now);
    nextRun.setHours(nextRun.getHours() + config.updateInterval);
    nextRun.setMinutes(0);
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);
    return nextRun;
  }

  /**
   * 執行排程收集
   */
  private async executeScheduledCollection(): Promise<void> {
    const config = this.configManager.getConfig();
    const jobId = `scheduled_${Date.now()}`;
    const job: CollectionJob = {
      id: jobId,
      type: 'update', // 排程收集預設為增量更新
      markets: this.configManager.getEnabledMarkets(),
      status: 'pending',
      progress: { total: 0, completed: 0, success: 0, failed: 0 }
    };

    this.jobs.set(jobId, job);
    this.monitor.startJob(job);

    try {
      logger.scheduler.info('開始執行排程資料收集');
      await this.executeUpdateCollection(job);

      job.status = 'completed';
      job.endTime = new Date().toISOString();
      logger.scheduler.complete('排程資料收集完成');

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : '未知錯誤';
      job.endTime = new Date().toISOString();
      logger.scheduler.error('排程資料收集失敗', error);
    }
  }

  /**
   * 執行完整收集
   */
  private async executeFullCollection(job: CollectionJob): Promise<void> {
    job.status = 'running';
    job.startTime = new Date().toISOString();

    const allStocks: any[] = [];
    const markets = job.markets || this.configManager.getEnabledMarkets();
    
    for (const market of markets) {
      const stocks = await this.stockListManager.getStocksByMarket(market);
      allStocks.push(...stocks);
    }

    job.progress.total = allStocks.length;
    
    if (allStocks.length === 0) {
      logger.scheduler.warn('沒有股票需要收集');
      return;
    }

    const results = await this.collector.collectStockData(allStocks, '1d', '1mo', job.id);
    
    job.progress.success = results.success;
    job.progress.failed = results.failed;
    job.progress.completed = results.success + results.failed;
  }

  /**
   * 執行更新收集
   */
  private async executeUpdateCollection(job: CollectionJob): Promise<void> {
    job.status = 'running';
    job.startTime = new Date().toISOString();

    const config = this.configManager.getConfig();
    const stocksNeedingUpdate = await this.stockListManager.getStocksNeedingUpdate(
      config.maxAgeHours
    );

    // 只收集指定市場的股票
    const markets = job.markets || this.configManager.getEnabledMarkets();
    const filteredStocks = stocksNeedingUpdate.filter(stock => 
      markets.includes(stock.market)
    );

    job.progress.total = filteredStocks.length;
    
    if (filteredStocks.length === 0) {
      logger.scheduler.info('沒有股票需要更新');
      return;
    }

    const results = await this.collector.collectStockData(filteredStocks, '1d', '1mo', job.id);
    
    job.progress.success = results.success;
    job.progress.failed = results.failed;
    job.progress.completed = results.success + results.failed;
  }

  /**
   * 手動觸發收集
   */
  async triggerCollection(
    type: 'full' | 'update' | 'market' = 'update',
    markets?: string[]
  ): Promise<string> {
    const jobId = `manual_${Date.now()}`;
    const job: CollectionJob = {
      id: jobId,
      type,
      markets,
      status: 'pending',
      progress: { total: 0, completed: 0, success: 0, failed: 0 }
    };

    this.jobs.set(jobId, job);
    this.monitor.startJob(job);

    // 非同步執行
    this.executeManualCollection(job).catch(error => {
      logger.scheduler.error(`手動收集失敗: ${jobId}`, error);
    });

    return jobId;
  }

  /**
   * 執行手動收集
   */
  private async executeManualCollection(job: CollectionJob): Promise<void> {
    try {
      job.status = 'running';
      job.startTime = new Date().toISOString();

      let stocks: any[] = [];

      switch (job.type) {
        case 'full':
          stocks = await this.stockListManager.getAllStocks();
          break;
        
        case 'update':
          stocks = await this.stockListManager.getStocksNeedingUpdate();
          break;
        
        case 'market':
          if (job.markets) {
            for (const market of job.markets) {
              const marketStocks = await this.stockListManager.getStocksByMarket(market);
              stocks.push(...marketStocks);
            }
          }
          break;
      }

      job.progress.total = stocks.length;
      
      if (stocks.length === 0) {
        logger.scheduler.warn('沒有股票需要收集');
        job.status = 'completed';
        return;
      }

      const results = await this.collector.collectStockData(stocks, '1d', '1mo', job.id);
      
      job.progress.success = results.success;
      job.progress.failed = results.failed;
      job.progress.completed = results.success + results.failed;
      
      job.status = 'completed';
      job.endTime = new Date().toISOString();

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : '未知錯誤';
      job.endTime = new Date().toISOString();
      throw error;
    }
  }

  /**
   * 取得工作狀態
   */
  getJobStatus(jobId: string): CollectionJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * 取得所有工作
   */
  getAllJobs(): CollectionJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * 取得監控器
   */
  getMonitor(): CollectionMonitor {
    return this.monitor;
  }

  /**
   * 清理舊工作記錄
   */
  cleanupOldJobs(maxAgeHours: number = 24): void {
    const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    Array.from(this.jobs.entries()).forEach(([jobId, job]) => {
      if (job.endTime && new Date(job.endTime).getTime() < cutoff) {
        this.jobs.delete(jobId);
      }
    });
  }

  /**
   * 取得排程器狀態
   */
  getStatus() {
    const config = this.configManager.getConfig();
    return {
      isRunning: this.isRunning,
      config: this.configManager.getConfigSummary(),
      activeJobs: Array.from(this.jobs.values()).filter(job => job.status === 'running').length,
      totalJobs: this.jobs.size
    };
  }

  /**
   * 取得配置管理器
   */
  getConfigManager(): CollectionConfigManager {
    return this.configManager;
  }

  /**
   * 更新收集器配置
   */
  updateCollectorConfig(config: Partial<CollectorConfig>): void {
    this.collector.updateConfig(config);
  }
}
