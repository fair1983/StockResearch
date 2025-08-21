import { StockDataCollector } from '@/lib/data-collection/stock-data-collector';
import { DataCollectionScheduler } from '@/lib/data-collection/data-collection-scheduler';
import { CollectionMonitor } from '@/lib/data-collection/collection-monitor';
import { CollectionConfigManager } from '@/lib/data-collection/collection-config-manager';
import { StockListManager } from '@/lib/data-collection/stock-list-manager';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('@/lib/stock-cache');
jest.mock('@/lib/historical-data-manager');
jest.mock('@/lib/yahoo-finance');
jest.mock('@/lib/logger', () => ({
  logger: {
    api: {
      request: jest.fn(),
      response: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      timing: jest.fn(),
    },
    yahooFinance: {
      request: jest.fn(),
      response: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      dataRange: jest.fn(),
    },
    frontend: {
      dataFetch: jest.fn(),
      chartRender: jest.fn(),
      error: jest.fn(),
    },
    system: {
      cache: jest.fn(),
      performance: jest.fn(),
    },
    stockMetadata: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    ai: {
      analysis: jest.fn(),
      error: jest.fn(),
    },
    configuration: {
      info: jest.fn(),
      error: jest.fn(),
    },
    monitor: {
      info: jest.fn(),
      progress: jest.fn(),
      complete: jest.fn(),
    },
    scheduler: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      complete: jest.fn(),
    },
    dataCollection: {
      start: jest.fn(),
      progress: jest.fn(),
      complete: jest.fn(),
      error: jest.fn(),
      request: jest.fn(),
      success: jest.fn(),
      info: jest.fn(),
    },
    stockList: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    updateConfig: jest.fn(),
    getConfig: jest.fn(),
    resetConfig: jest.fn(),
    getLogs: jest.fn(() => []),
    clearLogs: jest.fn(),
    exportLogs: jest.fn(() => '[]'),
  },
}));

// Mock fs operations
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlinkSync: jest.fn(),
  rmSync: jest.fn()
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('資料收集系統測試', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs operations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      enabled: true,
      autoStart: false,
      scheduleInterval: '0 0 * * *',
      updateInterval: 24,
      maxAgeHours: 168,
      collector: {
        maxConcurrent: 3,
        delayBetweenRequests: 1000,
        retryAttempts: 3,
        batchSize: 50,
        timeout: 30000,
        batchDelay: 5000
      },
      markets: {
        TW: { enabled: true, priority: 1 },
        US: { enabled: true, priority: 2 }
      },
      monitoring: {
        enabled: true,
        refreshInterval: 5000,
        logLevel: 'info',
        maxLogRetention: 30
      },
      performance: {
        enableThrottling: true,
        adaptiveThrottling: true,
        maxMemoryUsage: 1024,
        cleanupInterval: 6
      }
    }));
    
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
  });

  describe('StockDataCollector 測試', () => {
    let collector: StockDataCollector;

    beforeEach(() => {
      collector = new StockDataCollector();
    });

    it('應該正確初始化收集器', () => {
      expect(collector).toBeInstanceOf(StockDataCollector);
      expect(collector.getMonitor).toBeDefined();
      expect(collector.collectStockData).toBeDefined();
    });

    it('應該有正確的預設配置', () => {
      const monitor = collector.getMonitor();
      expect(monitor).toBeInstanceOf(CollectionMonitor);
    });

    it('應該能夠取得監控器', () => {
      const monitor = collector.getMonitor();
      expect(monitor).toBeInstanceOf(CollectionMonitor);
    });

    it('應該處理空股票清單', async () => {
      const result = await collector.collectStockData([]);
      
      expect(result).toEqual({
        success: 0,
        failed: 0,
        errors: []
      });
    });

    it('應該處理收集器忙碌狀態', async () => {
      // 模擬收集器正在運行
      const mockStocks = [
        { symbol: '2330.TW', name: '台積電', market: 'TW', priority: 1 },
        { symbol: 'TSLA', name: '特斯拉', market: 'US', priority: 2 }
      ];

      // 啟動第一個收集任務（不等待完成）
      const firstCollection = collector.collectStockData(mockStocks);
      
      // 嘗試啟動第二個收集任務
      await expect(collector.collectStockData(mockStocks))
        .rejects.toThrow('資料收集器正在運行中');
      
      // 等待第一個任務完成
      await firstCollection;
    });

    it('應該正確處理批次大小', async () => {
      const mockStocks = Array.from({ length: 150 }, (_, i) => ({
        symbol: `${2330 + i}.TW`,
        name: `股票${i}`,
        market: 'TW',
        priority: 1
      }));

      const result = await collector.collectStockData(mockStocks);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('應該支援自定義配置', () => {
      const customConfig = {
        maxConcurrent: 5,
        delayBetweenRequests: 2000,
        batchSize: 100
      };

      const customCollector = new StockDataCollector(customConfig);
      expect(customCollector).toBeInstanceOf(StockDataCollector);
    });
  });

  describe('DataCollectionScheduler 測試', () => {
    let scheduler: DataCollectionScheduler;

    beforeEach(() => {
      scheduler = new DataCollectionScheduler();
    });

    it('應該正確初始化排程器', () => {
      expect(scheduler).toBeInstanceOf(DataCollectionScheduler);
      expect(scheduler.start).toBeDefined();
      expect(scheduler.stop).toBeDefined();
      expect(scheduler.getStatus).toBeDefined();
    });

    it('應該能夠啟動和停止排程器', () => {
      expect(() => scheduler.start()).not.toThrow();
      expect(() => scheduler.stop()).not.toThrow();
    });

    it('應該正確回報狀態', () => {
      const status = scheduler.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('activeJobs');
      expect(status).toHaveProperty('nextScheduledRun');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.activeJobs).toBe('number');
    });

    it('應該處理重複啟動', () => {
      scheduler.start();
      expect(() => scheduler.start()).not.toThrow();
      scheduler.stop();
    });

    it('應該能夠立即執行收集', async () => {
      const result = await scheduler.runNow();
      
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status');
      expect(typeof result.jobId).toBe('string');
    });

    it('應該能夠管理工作', () => {
      const jobs = scheduler.getActiveJobs();
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe('CollectionMonitor 測試', () => {
    let monitor: CollectionMonitor;

    beforeEach(() => {
      monitor = new CollectionMonitor();
    });

    it('應該正確初始化監控器', () => {
      expect(monitor).toBeInstanceOf(CollectionMonitor);
      expect(monitor.startJob).toBeDefined();
      expect(monitor.completeJob).toBeDefined();
      expect(monitor.getSystemStatus).toBeDefined();
    });

    it('應該能夠開始監控工作', () => {
      const mockJob = {
        id: 'test-job-1',
        type: 'scheduled' as const,
        status: 'running' as const,
        createdAt: new Date(),
        startedAt: new Date(),
        stocks: [
          { symbol: '2330.TW', name: '台積電', market: 'TW', priority: 1 }
        ],
        totalStocks: 1,
        progress: {
          completed: 0,
          failed: 0,
          currentBatch: 0,
          totalBatches: 1
        }
      };

      expect(() => monitor.startJob(mockJob)).not.toThrow();
    });

    it('應該能夠完成工作', () => {
      const mockJob = {
        id: 'test-job-2',
        type: 'manual' as const,
        status: 'running' as const,
        createdAt: new Date(),
        startedAt: new Date(),
        stocks: [
          { symbol: 'TSLA', name: '特斯拉', market: 'US', priority: 1 }
        ],
        totalStocks: 1,
        progress: {
          completed: 0,
          failed: 0,
          currentBatch: 0,
          totalBatches: 1
        }
      };

      monitor.startJob(mockJob);
      expect(() => monitor.completeJob('test-job-2', 'completed')).not.toThrow();
    });

    it('應該能夠更新工作進度', () => {
      const mockJob = {
        id: 'test-job-3',
        type: 'scheduled' as const,
        status: 'running' as const,
        createdAt: new Date(),
        startedAt: new Date(),
        stocks: [
          { symbol: '2330.TW', name: '台積電', market: 'TW', priority: 1 }
        ],
        totalStocks: 1,
        progress: {
          completed: 0,
          failed: 0,
          currentBatch: 0,
          totalBatches: 1
        }
      };

      monitor.startJob(mockJob);
      
      expect(() => monitor.updateJobProgress('test-job-3', {
        completed: 1,
        failed: 0,
        currentBatch: 1,
        totalBatches: 1
      })).not.toThrow();
    });

    it('應該正確回報系統狀態', () => {
      const status = monitor.getSystemStatus();
      
      expect(status).toHaveProperty('isCollecting');
      expect(status).toHaveProperty('activeJobs');
      expect(status).toHaveProperty('totalJobs');
      expect(status).toHaveProperty('systemHealth');
      expect(status).toHaveProperty('lastUpdate');
      expect(status).toHaveProperty('performance');
      
      expect(['healthy', 'warning', 'error']).toContain(status.systemHealth);
      expect(typeof status.isCollecting).toBe('boolean');
      expect(typeof status.activeJobs).toBe('number');
    });

    it('應該能夠取得活躍工作', () => {
      const activeJobs = monitor.getActiveJobs();
      expect(Array.isArray(activeJobs)).toBe(true);
    });

    it('應該能夠取得已完成工作', () => {
      const completedJobs = monitor.getCompletedJobs();
      expect(Array.isArray(completedJobs)).toBe(true);
    });
  });

  describe('CollectionConfigManager 測試', () => {
    let configManager: CollectionConfigManager;

    beforeEach(() => {
      configManager = new CollectionConfigManager();
    });

    it('應該正確初始化配置管理器', () => {
      expect(configManager).toBeInstanceOf(CollectionConfigManager);
      expect(configManager.getConfig).toBeDefined();
      expect(configManager.updateConfig).toBeDefined();
    });

    it('應該能夠取得配置', () => {
      const config = configManager.getConfig();
      
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('autoStart');
      expect(config).toHaveProperty('scheduleInterval');
      expect(config).toHaveProperty('collector');
      expect(config).toHaveProperty('markets');
      expect(config).toHaveProperty('monitoring');
      expect(config).toHaveProperty('performance');
      
      expect(typeof config.enabled).toBe('boolean');
      expect(typeof config.autoStart).toBe('boolean');
      expect(typeof config.scheduleInterval).toBe('string');
    });

    it('應該能夠更新配置', () => {
      const newConfig = {
        enabled: false,
        updateInterval: 48
      };

      expect(() => configManager.updateConfig(newConfig)).not.toThrow();
    });

    it('應該能夠重置為預設配置', () => {
      expect(() => configManager.resetToDefault()).not.toThrow();
      
      const config = configManager.getConfig();
      expect(config.enabled).toBe(true);
    });

    it('應該能夠驗證配置', () => {
      const validConfig = {
        enabled: true,
        collector: {
          maxConcurrent: 3,
          batchSize: 50
        }
      };

      const isValid = configManager.validateConfig(validConfig);
      expect(typeof isValid).toBe('boolean');
    });

    it('應該能夠匯出和匯入配置', () => {
      const exportedConfig = configManager.exportConfig();
      expect(typeof exportedConfig).toBe('string');
      
      expect(() => configManager.importConfig(exportedConfig)).not.toThrow();
    });
  });

  describe('StockListManager 測試', () => {
    let stockListManager: StockListManager;

    beforeEach(() => {
      stockListManager = new StockListManager();
    });

    it('應該正確初始化股票清單管理器', () => {
      expect(stockListManager).toBeInstanceOf(StockListManager);
      expect(stockListManager.getStockList).toBeDefined();
      expect(stockListManager.addStock).toBeDefined();
      expect(stockListManager.removeStock).toBeDefined();
    });

    it('應該能夠取得股票清單', async () => {
      const stockList = await stockListManager.getAllStocks();
      expect(Array.isArray(stockList)).toBe(true);
    });

    it('應該能夠按市場取得股票清單', async () => {
      const twStocks = await stockListManager.getStocksByMarket('TW');
      const usStocks = await stockListManager.getStocksByMarket('US');
      
      expect(Array.isArray(twStocks)).toBe(true);
      expect(Array.isArray(usStocks)).toBe(true);
    });

    it('應該能夠新增股票', () => {
      const newStock = {
        symbol: '2330.TW',
        name: '台積電',
        market: 'TW',
        priority: 1
      };

      expect(() => stockListManager.addStock(newStock)).not.toThrow();
    });

    it('應該能夠移除股票', () => {
      const stockToRemove = {
        symbol: 'TSLA',
        name: '特斯拉',
        market: 'US',
        priority: 1
      };

      stockListManager.addStock(stockToRemove);
      expect(() => stockListManager.removeStock('TSLA')).not.toThrow();
    });

    it('應該能夠更新股票資訊', () => {
      const stock = {
        symbol: '2330.TW',
        name: '台積電',
        market: 'TW',
        priority: 1
      };

      stockListManager.addStock(stock);
      
      const updatedInfo = {
        name: '台灣積體電路製造股份有限公司',
        priority: 2
      };

      expect(() => stockListManager.updateStock('2330.TW', updatedInfo)).not.toThrow();
    });

    it('應該能夠按優先級排序', () => {
      const stocks = [
        { symbol: 'A', name: 'Stock A', market: 'TW', priority: 3 },
        { symbol: 'B', name: 'Stock B', market: 'TW', priority: 1 },
        { symbol: 'C', name: 'Stock C', market: 'TW', priority: 2 }
      ];

      stocks.forEach(stock => stockListManager.addStock(stock));
      
      const sortedStocks = stockListManager.getStocksSortedByPriority();
      expect(Array.isArray(sortedStocks)).toBe(true);
      
      // 檢查是否按優先級排序（優先級越低越優先）
      if (sortedStocks.length > 1) {
        expect(sortedStocks[0].priority).toBeLessThanOrEqual(sortedStocks[1].priority);
      }
    });
  });

  describe('系統整合測試', () => {
    let scheduler: DataCollectionScheduler;
    let collector: StockDataCollector;
    let monitor: CollectionMonitor;
    let configManager: CollectionConfigManager;

    beforeEach(() => {
      scheduler = new DataCollectionScheduler();
      collector = new StockDataCollector();
      monitor = new CollectionMonitor();
      configManager = new CollectionConfigManager();
    });

    it('應該能夠完整運行資料收集流程', async () => {
      // 1. 設定配置
      const config = configManager.getConfig();
      expect(config.enabled).toBe(true);

      // 2. 啟動監控
      const mockJob = {
        id: 'integration-test-job',
        type: 'manual' as const,
        status: 'running' as const,
        createdAt: new Date(),
        startedAt: new Date(),
        stocks: [
          { symbol: '2330.TW', name: '台積電', market: 'TW', priority: 1 }
        ],
        totalStocks: 1,
        progress: {
          completed: 0,
          failed: 0,
          currentBatch: 0,
          totalBatches: 1
        }
      };

      monitor.startJob(mockJob);

      // 3. 執行收集
      const mockStocks = [
        { symbol: '2330.TW', name: '台積電', market: 'TW', priority: 1 }
      ];

      const result = await collector.collectStockData(mockStocks, '1d', '1mo', 'integration-test-job');

      // 4. 驗證結果
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');

      // 5. 完成監控
      monitor.completeJob('integration-test-job', 'completed');

      // 6. 檢查系統狀態
      const systemStatus = monitor.getSystemStatus();
      expect(systemStatus).toHaveProperty('isCollecting');
      expect(systemStatus).toHaveProperty('performance');
    });

    it('應該能夠處理排程器和收集器的協作', async () => {
      // 啟動排程器
      scheduler.start();
      
      // 檢查狀態
      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(true);
      
      // 立即執行收集
      const result = await scheduler.runNow();
      expect(result).toHaveProperty('jobId');
      
      // 停止排程器
      scheduler.stop();
      
      const finalStatus = scheduler.getStatus();
      expect(finalStatus.isRunning).toBe(false);
    });

    it('應該能夠處理配置變更對系統的影響', () => {
      // 取得原始配置
      const originalConfig = configManager.getConfig();
      expect(originalConfig.enabled).toBe(true);

      // 更新配置
      configManager.updateConfig({
        enabled: false,
        collector: {
          maxConcurrent: 10,
          batchSize: 100
        }
      });

      // 驗證配置已更新
      const updatedConfig = configManager.getConfig();
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.collector.maxConcurrent).toBe(10);

      // 重置配置
      configManager.resetToDefault();
      
      const resetConfig = configManager.getConfig();
      expect(resetConfig.enabled).toBe(true);
    });
  });

  describe('錯誤處理測試', () => {
    it('應該處理檔案系統錯誤', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new CollectionConfigManager()).not.toThrow();
    });

    it('應該處理無效的配置資料', () => {
      mockFs.readFileSync.mockReturnValue('invalid json');

      expect(() => new CollectionConfigManager()).not.toThrow();
    });

    it('應該處理監控器錯誤', () => {
      const monitor = new CollectionMonitor();

      // 測試不存在的工作 ID
      expect(() => monitor.updateJobProgress('non-existent-job', {
        completed: 1,
        failed: 0,
        currentBatch: 1,
        totalBatches: 1
      })).not.toThrow();

      expect(() => monitor.completeJob('non-existent-job', 'completed')).not.toThrow();
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內初始化所有組件', () => {
      const startTime = performance.now();

      new StockDataCollector();
      new DataCollectionScheduler();
      new CollectionMonitor();
      new CollectionConfigManager();
      new StockListManager();

      const endTime = performance.now();
      const initTime = endTime - startTime;

      expect(initTime).toBeLessThan(1000); // 應該在 1 秒內完成初始化
    });

    it('應該能夠處理大量股票清單', () => {
      const stockListManager = new StockListManager();
      const startTime = performance.now();

      // 新增 1000 支股票
      for (let i = 0; i < 1000; i++) {
        stockListManager.addStock({
          symbol: `${2330 + i}.TW`,
          name: `股票${i}`,
          market: 'TW',
          priority: Math.floor(Math.random() * 10) + 1
        });
      }

      const endTime = performance.now();
      const processTime = endTime - startTime;

      expect(processTime).toBeLessThan(5000); // 應該在 5 秒內完成
      expect(stockListManager.getStockList().length).toBe(1000);
    });

    it('應該能夠快速取得系統狀態', () => {
      const monitor = new CollectionMonitor();
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        monitor.getSystemStatus();
      }

      const endTime = performance.now();
      const queryTime = endTime - startTime;

      expect(queryTime).toBeLessThan(1000); // 100 次查詢應該在 1 秒內完成
    });
  });
});
