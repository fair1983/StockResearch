import { EventEmitter } from 'events';
import { CollectionJob } from './data-collection-scheduler';
import { StockInfo } from './stock-data-collector';
import { logger } from '../logger';

export interface CollectionProgress {
  jobId: string;
  type: 'full' | 'update' | 'market';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  progress: {
    total: number;
    completed: number;
    success: number;
    failed: number;
    currentBatch: number;
    totalBatches: number;
    currentStock?: string;
    currentMarket?: string;
  };
  errors: string[];
  performance: {
    averageTimePerStock: number;
    estimatedTimeRemaining: number;
    successRate: number;
    throughput: number; // 每分鐘處理的股票數
  };
}

export interface MarketProgress {
  market: string;
  total: number;
  completed: number;
  success: number;
  failed: number;
  inProgress: number;
  pending: number;
  progress: number; // 0-100
}

export interface SystemStatus {
  isCollecting: boolean;
  activeJobs: number;
  totalJobs: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  lastUpdate: string;
  performance: {
    totalStocksProcessed: number;
    averageSuccessRate: number;
    averageProcessingTime: number;
  };
}

export class CollectionMonitor extends EventEmitter {
  private activeJobs: Map<string, CollectionProgress> = new Map();
  private completedJobs: Map<string, CollectionProgress> = new Map();
  private marketProgress: Map<string, MarketProgress> = new Map();
  private systemStatus: SystemStatus;
  private startTimes: Map<string, number> = new Map();
  private processingTimes: number[] = [];

  constructor() {
    super();
    this.systemStatus = {
      isCollecting: false,
      activeJobs: 0,
      totalJobs: 0,
      systemHealth: 'healthy',
      lastUpdate: new Date().toISOString(),
      performance: {
        totalStocksProcessed: 0,
        averageSuccessRate: 0,
        averageProcessingTime: 0
      }
    };
  }

  /**
   * 開始監控工作
   */
  startJob(job: CollectionJob): void {
    const progress: CollectionProgress = {
      jobId: job.id,
      type: job.type,
      status: 'pending',
      startTime: new Date().toISOString(),
      progress: {
        total: job.progress.total,
        completed: 0,
        success: 0,
        failed: 0,
        currentBatch: 0,
        totalBatches: Math.ceil(job.progress.total / 50) // 假設批次大小為50
      },
      errors: [],
      performance: {
        averageTimePerStock: 0,
        estimatedTimeRemaining: 0,
        successRate: 0,
        throughput: 0
      }
    };

    this.activeJobs.set(job.id, progress);
    this.startTimes.set(job.id, Date.now());
    this.updateSystemStatus();
    
    this.emit('jobStarted', progress);
    logger.monitor.info(`開始監控工作: ${job.id}`);
  }

  /**
   * 更新工作進度
   */
  updateJobProgress(
    jobId: string,
    updates: Partial<CollectionProgress['progress']> & {
      currentStock?: string;
      currentMarket?: string;
      error?: string;
    }
  ): void {
    const progress = this.activeJobs.get(jobId);
    if (!progress) return;

    const { error, ...progressUpdates } = updates;
    
    // 更新進度
    Object.assign(progress.progress, progressUpdates);
    
    // 記錄錯誤
    if (error) {
      progress.errors.push(error);
    }

    // 計算效能指標
    this.calculatePerformance(progress);

    // 更新市場進度
    if (updates.currentMarket) {
      this.updateMarketProgress(updates.currentMarket, updates);
    }

    this.updateSystemStatus();
    this.emit('progressUpdated', progress);
    
    // 記錄詳細進度
    logger.monitor.progress(`工作 ${jobId} 進度: ${progress.progress.completed}/${progress.progress.total} (${((progress.progress.completed / progress.progress.total) * 100).toFixed(1)}%)`);
  }

  /**
   * 完成工作
   */
  completeJob(jobId: string, finalStatus: 'completed' | 'failed', error?: string): void {
    const progress = this.activeJobs.get(jobId);
    if (!progress) return;

    progress.status = finalStatus;
    progress.endTime = new Date().toISOString();
    
    if (error) {
      progress.errors.push(error);
    }

    // 計算最終效能指標
    this.calculatePerformance(progress);

    // 記錄處理時間
    const startTime = this.startTimes.get(jobId);
    if (startTime) {
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      this.startTimes.delete(jobId);
    }

    // 移動到已完成工作
    this.activeJobs.delete(jobId);
    this.completedJobs.set(jobId, progress);

    this.updateSystemStatus();
    this.emit('jobCompleted', progress);
    
    logger.monitor.complete(`工作 ${jobId} 完成: ${finalStatus}`);
  }

  /**
   * 計算效能指標
   */
  private calculatePerformance(progress: CollectionProgress): void {
    const startTime = this.startTimes.get(progress.jobId);
    if (!startTime) return;

    const elapsed = Date.now() - startTime;
    const completed = progress.progress.completed;
    
    if (completed > 0) {
      // 平均每支股票處理時間
      progress.performance.averageTimePerStock = elapsed / completed;
      
      // 成功率
      progress.performance.successRate = (progress.progress.success / completed) * 100;
      
      // 吞吐量 (每分鐘處理的股票數)
      progress.performance.throughput = (completed / elapsed) * 60000;
      
      // 預估剩餘時間
      const remaining = progress.progress.total - completed;
      progress.performance.estimatedTimeRemaining = remaining * progress.performance.averageTimePerStock;
    }
  }

  /**
   * 更新市場進度
   */
  private updateMarketProgress(market: string, updates: any): void {
    let marketProgress = this.marketProgress.get(market);
    
    if (!marketProgress) {
      marketProgress = {
        market,
        total: 0,
        completed: 0,
        success: 0,
        failed: 0,
        inProgress: 0,
        pending: 0,
        progress: 0
      };
      this.marketProgress.set(market, marketProgress);
    }

    // 更新市場進度
    if (updates.completed !== undefined) {
      marketProgress.completed = updates.completed;
    }
    if (updates.success !== undefined) {
      marketProgress.success = updates.success;
    }
    if (updates.failed !== undefined) {
      marketProgress.failed = updates.failed;
    }

    // 計算進度百分比
    if (marketProgress.total > 0) {
      marketProgress.progress = (marketProgress.completed / marketProgress.total) * 100;
    }

    this.emit('marketProgressUpdated', marketProgress);
  }

  /**
   * 更新系統狀態
   */
  private updateSystemStatus(): void {
    this.systemStatus.isCollecting = this.activeJobs.size > 0;
    this.systemStatus.activeJobs = this.activeJobs.size;
    this.systemStatus.totalJobs = this.activeJobs.size + this.completedJobs.size;
    this.systemStatus.lastUpdate = new Date().toISOString();

    // 計算系統健康度
    const totalJobs = this.completedJobs.size;
    const failedJobs = Array.from(this.completedJobs.values()).filter(job => job.status === 'failed').length;
    
    if (totalJobs === 0) {
      this.systemStatus.systemHealth = 'healthy';
    } else {
      const failureRate = (failedJobs / totalJobs) * 100;
      if (failureRate > 20) {
        this.systemStatus.systemHealth = 'error';
      } else if (failureRate > 10) {
        this.systemStatus.systemHealth = 'warning';
      } else {
        this.systemStatus.systemHealth = 'healthy';
      }
    }

    // 計算整體效能指標
    this.calculateSystemPerformance();

    this.emit('systemStatusUpdated', this.systemStatus);
  }

  /**
   * 計算系統效能指標
   */
  private calculateSystemPerformance(): void {
    const allJobs = Array.from(this.completedJobs.values());
    
    if (allJobs.length === 0) return;

    // 總處理股票數
    this.systemStatus.performance.totalStocksProcessed = allJobs.reduce(
      (sum, job) => sum + job.progress.success, 0
    );

    // 平均成功率
    const totalAttempted = allJobs.reduce((sum, job) => sum + job.progress.total, 0);
    const totalSuccess = allJobs.reduce((sum, job) => sum + job.progress.success, 0);
    this.systemStatus.performance.averageSuccessRate = totalAttempted > 0 ? 
      (totalSuccess / totalAttempted) * 100 : 0;

    // 平均處理時間
    if (this.processingTimes.length > 0) {
      this.systemStatus.performance.averageProcessingTime = 
        this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
    }
  }

  /**
   * 取得工作進度
   */
  getJobProgress(jobId: string): CollectionProgress | null {
    return this.activeJobs.get(jobId) || this.completedJobs.get(jobId) || null;
  }

  /**
   * 取得所有活躍工作
   */
  getActiveJobs(): CollectionProgress[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * 取得所有已完成工作
   */
  getCompletedJobs(): CollectionProgress[] {
    return Array.from(this.completedJobs.values());
  }

  /**
   * 取得市場進度
   */
  getMarketProgress(market?: string): MarketProgress[] {
    if (market) {
      const progress = this.marketProgress.get(market);
      return progress ? [progress] : [];
    }
    return Array.from(this.marketProgress.values());
  }

  /**
   * 取得系統狀態
   */
  getSystemStatus(): SystemStatus {
    return { ...this.systemStatus };
  }

  /**
   * 取得詳細統計
   */
  getDetailedStats(): {
    jobs: {
      active: number;
      completed: number;
      failed: number;
      total: number;
    };
    stocks: {
      total: number;
      success: number;
      failed: number;
      successRate: number;
    };
    performance: {
      averageProcessingTime: number;
      averageThroughput: number;
      bestPerformance: number;
      worstPerformance: number;
    };
    markets: {
      [market: string]: {
        total: number;
        success: number;
        failed: number;
        successRate: number;
      };
    };
  } {
    const activeJobs = this.getActiveJobs();
    const completedJobs = this.getCompletedJobs();
    const failedJobs = completedJobs.filter(job => job.status === 'failed');

    const totalStocks = activeJobs.reduce((sum, job) => sum + job.progress.total, 0) +
                       completedJobs.reduce((sum, job) => sum + job.progress.total, 0);
    const successStocks = activeJobs.reduce((sum, job) => sum + job.progress.success, 0) +
                         completedJobs.reduce((sum, job) => sum + job.progress.success, 0);
    const failedStocks = activeJobs.reduce((sum, job) => sum + job.progress.failed, 0) +
                        completedJobs.reduce((sum, job) => sum + job.progress.failed, 0);

    const marketStats: { [market: string]: any } = {};
    this.marketProgress.forEach((progress, market) => {
      marketStats[market] = {
        total: progress.total,
        success: progress.success,
        failed: progress.failed,
        successRate: progress.total > 0 ? (progress.success / progress.total) * 100 : 0
      };
    });

    return {
      jobs: {
        active: activeJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length,
        total: activeJobs.length + completedJobs.length
      },
      stocks: {
        total: totalStocks,
        success: successStocks,
        failed: failedStocks,
        successRate: totalStocks > 0 ? (successStocks / totalStocks) * 100 : 0
      },
      performance: {
        averageProcessingTime: this.systemStatus.performance.averageProcessingTime,
        averageThroughput: this.processingTimes.length > 0 ? 
          this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length : 0,
        bestPerformance: this.processingTimes.length > 0 ? Math.min(...this.processingTimes) : 0,
        worstPerformance: this.processingTimes.length > 0 ? Math.max(...this.processingTimes) : 0
      },
      markets: marketStats
    };
  }

  /**
   * 清理舊記錄
   */
  cleanupOldRecords(maxAgeHours: number = 24): void {
    const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    // 清理已完成工作
    Array.from(this.completedJobs.keys()).forEach(jobId => {
      const job = this.completedJobs.get(jobId);
      if (job && job.endTime && new Date(job.endTime).getTime() < cutoff) {
        this.completedJobs.delete(jobId);
      }
    });

    // 清理處理時間記錄
    this.processingTimes = this.processingTimes.filter(time => time > cutoff);

    logger.monitor.info(`清理了 ${maxAgeHours} 小時前的舊記錄`);
  }

  /**
   * 重置監控器
   */
  reset(): void {
    this.activeJobs.clear();
    this.completedJobs.clear();
    this.marketProgress.clear();
    this.startTimes.clear();
    this.processingTimes = [];
    
    this.systemStatus = {
      isCollecting: false,
      activeJobs: 0,
      totalJobs: 0,
      systemHealth: 'healthy',
      lastUpdate: new Date().toISOString(),
      performance: {
        totalStocksProcessed: 0,
        averageSuccessRate: 0,
        averageProcessingTime: 0
      }
    };

    this.emit('monitorReset');
    logger.monitor.info('監控器已重置');
  }
}
