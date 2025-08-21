import { StockDataCollector } from '@/lib/data-collection/stock-data-collector';
import { DataCollectionScheduler } from '@/lib/data-collection/data-collection-scheduler';
import { CollectionMonitor } from '@/lib/data-collection/collection-monitor';
import { CollectionConfigManager } from '@/lib/data-collection/collection-config-manager';
import { StockListManager } from '@/lib/data-collection/stock-list-manager';
import fs from 'fs';

// Mock dependencies
jest.mock('@/lib/stock-cache');
jest.mock('@/lib/historical-data-manager');
jest.mock('@/lib/yahoo-finance');
jest.mock('@/lib/logger', () => ({
  logger: {
    dataCollection: {
      start: jest.fn(),
      progress: jest.fn(),
      complete: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    },
    stockList: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    },
    scheduler: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    },
    monitor: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    },
    config: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }
  }
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

describe('資料收集系統測試 (簡化版)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock default config
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((filePath: string) => {
      if (filePath.includes('markets.json')) {
        return JSON.stringify({
          markets: [
            {
              market: 'TW',
              name: '台灣',
              symbols: ['2330', '2317', '2454'],
              priority: 1,
              enabled: true
            },
            {
              market: 'US',
              name: '美國',
              symbols: ['AAPL', 'TSLA', 'GOOGL'],
              priority: 2,
              enabled: true
            }
          ]
        });
      } else {
        return JSON.stringify({
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
        });
      }
    });
    
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
  });

  describe('基本初始化測試', () => {
    it('應該能夠初始化 StockDataCollector', () => {
      const collector = new StockDataCollector();
      expect(collector).toBeInstanceOf(StockDataCollector);
    });

    it('應該能夠初始化 DataCollectionScheduler', () => {
      const scheduler = new DataCollectionScheduler();
      expect(scheduler).toBeInstanceOf(DataCollectionScheduler);
    });

    it('應該能夠初始化 CollectionMonitor', () => {
      const monitor = new CollectionMonitor();
      expect(monitor).toBeInstanceOf(CollectionMonitor);
    });

    it('應該能夠初始化 CollectionConfigManager', () => {
      const configManager = new CollectionConfigManager();
      expect(configManager).toBeInstanceOf(CollectionConfigManager);
    });

    it('應該能夠初始化 StockListManager', () => {
      const stockListManager = new StockListManager();
      expect(stockListManager).toBeInstanceOf(StockListManager);
    });
  });

  describe('StockDataCollector 基本功能', () => {
    let collector: StockDataCollector;

    beforeEach(() => {
      collector = new StockDataCollector();
    });

    it('應該有 collectStockData 方法', () => {
      expect(typeof collector.collectStockData).toBe('function');
    });

    it('應該有 getMonitor 方法', () => {
      expect(typeof collector.getMonitor).toBe('function');
    });

    it('應該能夠取得監控器', () => {
      const monitor = collector.getMonitor();
      expect(monitor).toBeInstanceOf(CollectionMonitor);
    });

    it('應該處理空股票清單', async () => {
      const result = await collector.collectStockData([]);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
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

  describe('DataCollectionScheduler 基本功能', () => {
    let scheduler: DataCollectionScheduler;

    beforeEach(() => {
      scheduler = new DataCollectionScheduler();
    });

    it('應該有 start 方法', () => {
      expect(typeof scheduler.start).toBe('function');
    });

    it('應該有 stop 方法', () => {
      expect(typeof scheduler.stop).toBe('function');
    });

    it('應該有 getStatus 方法', () => {
      expect(typeof scheduler.getStatus).toBe('function');
    });

    it('應該有啟動和停止方法', () => {
      expect(typeof scheduler.start).toBe('function');
      expect(typeof scheduler.stop).toBe('function');
    });

    it('應該正確回報狀態', () => {
      const status = scheduler.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('activeJobs');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.activeJobs).toBe('number');
    });

    it('應該有 getAllJobs 方法', () => {
      expect(typeof scheduler.getAllJobs).toBe('function');
    });

    it('應該有 getMonitor 方法', () => {
      expect(typeof scheduler.getMonitor).toBe('function');
    });
  });

  describe('CollectionMonitor 基本功能', () => {
    let monitor: CollectionMonitor;

    beforeEach(() => {
      monitor = new CollectionMonitor();
    });

    it('應該有 startJob 方法', () => {
      expect(typeof monitor.startJob).toBe('function');
    });

    it('應該有 completeJob 方法', () => {
      expect(typeof monitor.completeJob).toBe('function');
    });

    it('應該有 getSystemStatus 方法', () => {
      expect(typeof monitor.getSystemStatus).toBe('function');
    });

    it('應該能夠取得系統狀態', () => {
      const status = monitor.getSystemStatus();
      
      expect(status).toHaveProperty('isCollecting');
      expect(status).toHaveProperty('activeJobs');
      expect(status).toHaveProperty('totalJobs');
      expect(status).toHaveProperty('systemHealth');
      expect(status).toHaveProperty('lastUpdate');
      expect(status).toHaveProperty('performance');
      
      expect(typeof status.isCollecting).toBe('boolean');
      expect(typeof status.activeJobs).toBe('number');
      expect(['healthy', 'warning', 'error']).toContain(status.systemHealth);
    });

    it('應該有監控工作的方法', () => {
      expect(typeof monitor.startJob).toBe('function');
      expect(typeof monitor.completeJob).toBe('function');
      expect(typeof monitor.updateJobProgress).toBe('function');
    });

    it('應該有 getActiveJobs 方法', () => {
      expect(typeof monitor.getActiveJobs).toBe('function');
      
      const activeJobs = monitor.getActiveJobs();
      expect(Array.isArray(activeJobs)).toBe(true);
    });

    it('應該有 getCompletedJobs 方法', () => {
      expect(typeof monitor.getCompletedJobs).toBe('function');
      
      const completedJobs = monitor.getCompletedJobs();
      expect(Array.isArray(completedJobs)).toBe(true);
    });
  });

  describe('CollectionConfigManager 基本功能', () => {
    let configManager: CollectionConfigManager;

    beforeEach(() => {
      configManager = new CollectionConfigManager();
    });

    it('應該有 getConfig 方法', () => {
      expect(typeof configManager.getConfig).toBe('function');
    });

    it('應該有 updateConfig 方法', () => {
      expect(typeof configManager.updateConfig).toBe('function');
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

    it('應該有配置管理方法', () => {
      expect(typeof configManager.updateConfig).toBe('function');
      expect(typeof configManager.resetToDefault).toBe('function');
      expect(typeof configManager.validateConfig).toBe('function');
      expect(typeof configManager.exportConfig).toBe('function');
      expect(typeof configManager.importConfig).toBe('function');
    });
  });

  describe('StockListManager 基本功能', () => {
    let stockListManager: StockListManager;

    beforeEach(() => {
      stockListManager = new StockListManager();
    });

    it('應該有 getAllStocks 方法', () => {
      expect(typeof stockListManager.getAllStocks).toBe('function');
    });

    it('應該有 getStocksByMarket 方法', () => {
      expect(typeof stockListManager.getStocksByMarket).toBe('function');
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

    it('應該有 addStockToMarket 方法', () => {
      expect(typeof stockListManager.addStockToMarket).toBe('function');
    });

    it('應該有 removeStockFromMarket 方法', () => {
      expect(typeof stockListManager.removeStockFromMarket).toBe('function');
    });

    it('應該有股票管理方法', () => {
      expect(typeof stockListManager.addStockToMarket).toBe('function');
      expect(typeof stockListManager.removeStockFromMarket).toBe('function');
      expect(typeof stockListManager.loadMarketConfig).toBe('function');
    });

    it('應該有 getStocksNeedingUpdate 方法', () => {
      expect(typeof stockListManager.getStocksNeedingUpdate).toBe('function');
    });
  });

  describe('系統整合測試', () => {
    it('應該能夠完整初始化所有組件', () => {
      expect(() => {
        new StockDataCollector();
        new DataCollectionScheduler();
        new CollectionMonitor();
        new CollectionConfigManager();
        new StockListManager();
      }).not.toThrow();
    });

    it('應該能夠運行基本的資料收集流程', async () => {
      const collector = new StockDataCollector();
      const monitor = new CollectionMonitor();

      // 執行收集
      const result = await collector.collectStockData([]);

      // 驗證結果
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');

      const systemStatus = monitor.getSystemStatus();
      expect(systemStatus).toHaveProperty('isCollecting');
    });

    it('應該能夠處理排程器基本操作', () => {
      const scheduler = new DataCollectionScheduler();
      
      const status = scheduler.getStatus();
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('activeJobs');
    });
  });

  describe('錯誤處理測試', () => {
    it('應該處理檔案系統錯誤', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new CollectionConfigManager()).not.toThrow();
      expect(() => new StockListManager()).not.toThrow();
    });

    it('應該有錯誤處理機制', () => {
      // 測試基本的錯誤處理能力
      expect(() => {
        const configManager = new CollectionConfigManager();
        const stockListManager = new StockListManager();
        
        expect(configManager).toBeInstanceOf(CollectionConfigManager);
        expect(stockListManager).toBeInstanceOf(StockListManager);
      }).not.toThrow();
    });

    it('應該處理監控器錯誤', () => {
      const monitor = new CollectionMonitor();

      // 測試不存在的工作 ID
      expect(() => monitor.updateJobProgress('non-existent', {
        completed: 1,
        failed: 0,
        currentBatch: 1,
        totalBatches: 1
      })).not.toThrow();

      expect(() => monitor.completeJob('non-existent', 'completed')).not.toThrow();
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

      expect(initTime).toBeLessThan(1000); // 1 秒內完成
    });

    it('應該能夠快速取得系統狀態', () => {
      const monitor = new CollectionMonitor();
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        monitor.getSystemStatus();
      }

      const endTime = performance.now();
      const queryTime = endTime - startTime;

      expect(queryTime).toBeLessThan(1000); // 100 次查詢在 1 秒內完成
    });

    it('應該能夠快速處理配置操作', () => {
      const configManager = new CollectionConfigManager();
      const startTime = performance.now();

      for (let i = 0; i < 50; i++) {
        configManager.getConfig();
      }

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      expect(operationTime).toBeLessThan(2000); // 50 次查詢在 2 秒內完成
    });
  });

  describe('API 一致性測試', () => {
    it('所有組件應該有一致的方法簽名', () => {
      const collector = new StockDataCollector();
      const scheduler = new DataCollectionScheduler();
      const monitor = new CollectionMonitor();
      const configManager = new CollectionConfigManager();
      const stockListManager = new StockListManager();

      // 檢查關鍵方法存在
      expect(typeof collector.collectStockData).toBe('function');
      expect(typeof collector.getMonitor).toBe('function');
      
      expect(typeof scheduler.start).toBe('function');
      expect(typeof scheduler.stop).toBe('function');
      expect(typeof scheduler.getStatus).toBe('function');
      
      expect(typeof monitor.startJob).toBe('function');
      expect(typeof monitor.getSystemStatus).toBe('function');
      
      expect(typeof configManager.getConfig).toBe('function');
      expect(typeof configManager.updateConfig).toBe('function');
      
      expect(typeof stockListManager.getAllStocks).toBe('function');
      expect(typeof stockListManager.getStocksByMarket).toBe('function');
    });
  });
});
