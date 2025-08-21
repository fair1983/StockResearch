import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

export interface CollectionConfig {
  // 基本配置
  enabled: boolean;
  autoStart: boolean;
  
  // 時間間隔配置
  scheduleInterval: string; // cron 表達式
  updateInterval: number; // 更新間隔（小時）
  maxAgeHours: number; // 最大年齡（小時）
  
  // 收集器配置
  collector: {
    maxConcurrent: number; // 最大並發數
    delayBetweenRequests: number; // 請求間隔 (ms)
    retryAttempts: number; // 重試次數
    batchSize: number; // 批次大小
    timeout: number; // 請求超時時間 (ms)
    batchDelay: number; // 批次間隔 (ms)
  };
  
  // 市場配置
  markets: {
    [market: string]: {
      enabled: boolean;
      priority: number;
      updateInterval?: number; // 個別市場更新間隔（小時）
      maxConcurrent?: number; // 個別市場並發數
    };
  };
  
  // 監控配置
  monitoring: {
    enabled: boolean;
    refreshInterval: number; // 監控刷新間隔 (ms)
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    maxLogRetention: number; // 日誌保留天數
  };
  
  // 效能配置
  performance: {
    enableThrottling: boolean;
    adaptiveThrottling: boolean; // 自適應限流
    maxMemoryUsage: number; // 最大記憶體使用量 (MB)
    cleanupInterval: number; // 清理間隔 (小時)
  };
}

export class CollectionConfigManager {
  private configPath: string;
  private config: CollectionConfig;

  constructor() {
    this.configPath = path.join(process.cwd(), 'data', 'config', 'collection-config.json');
    this.config = this.loadConfig();
  }

  /**
   * 載入配置
   */
  private loadConfig(): CollectionConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(configData);
        return this.mergeWithDefaults(loadedConfig);
      }
    } catch (error) {
      logger.system.cache('載入配置失敗', error);
    }

    return this.getDefaultConfig();
  }

  /**
   * 取得預設配置
   */
  private getDefaultConfig(): CollectionConfig {
    return {
      enabled: false,
      autoStart: false,
      scheduleInterval: '0 */4 * * *', // 每4小時
      updateInterval: 4, // 4小時
      maxAgeHours: 24,
      
      collector: {
        maxConcurrent: 3,
        delayBetweenRequests: 1000,
        retryAttempts: 3,
        batchSize: 50,
        timeout: 30000,
        batchDelay: 5000
      },
      
      markets: {
        TW: {
          enabled: true,
          priority: 5,
          updateInterval: 4,
          maxConcurrent: 3
        },
        US: {
          enabled: true,
          priority: 4,
          updateInterval: 6,
          maxConcurrent: 2
        },
        HK: {
          enabled: true,
          priority: 3,
          updateInterval: 8,
          maxConcurrent: 2
        }
      },
      
      monitoring: {
        enabled: true,
        refreshInterval: 5000,
        logLevel: 'info',
        maxLogRetention: 7
      },
      
      performance: {
        enableThrottling: true,
        adaptiveThrottling: true,
        maxMemoryUsage: 512,
        cleanupInterval: 24
      }
    };
  }

  /**
   * 合併配置與預設值
   */
  private mergeWithDefaults(config: Partial<CollectionConfig>): CollectionConfig {
    const defaultConfig = this.getDefaultConfig();
    return {
      ...defaultConfig,
      ...config,
      collector: {
        ...defaultConfig.collector,
        ...config.collector
      },
      markets: {
        ...defaultConfig.markets,
        ...config.markets
      },
      monitoring: {
        ...defaultConfig.monitoring,
        ...config.monitoring
      },
      performance: {
        ...defaultConfig.performance,
        ...config.performance
      }
    };
  }

  /**
   * 儲存配置
   */
  saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      logger.system.cache('配置已儲存');
    } catch (error) {
              logger.system.cache('儲存配置失敗', error);
      throw error;
    }
  }

  /**
   * 取得完整配置
   */
  getConfig(): CollectionConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<CollectionConfig>): void {
    this.config = this.mergeWithDefaults({
      ...this.config,
      ...updates
    });
    this.saveConfig();
          logger.system.cache('配置已更新', updates);
  }

  /**
   * 更新收集器配置
   */
  updateCollectorConfig(updates: Partial<CollectionConfig['collector']>): void {
    this.config.collector = {
      ...this.config.collector,
      ...updates
    };
    this.saveConfig();
          logger.system.cache('收集器配置已更新', updates);
  }

  /**
   * 更新市場配置
   */
  updateMarketConfig(market: string, updates: Partial<CollectionConfig['markets'][string]>): void {
    if (!this.config.markets[market]) {
      this.config.markets[market] = {
        enabled: true,
        priority: 3
      };
    }
    
    this.config.markets[market] = {
      ...this.config.markets[market],
      ...updates
    };
    this.saveConfig();
          logger.system.cache(`市場 ${market} 配置已更新`, updates);
  }

  /**
   * 更新監控配置
   */
  updateMonitoringConfig(updates: Partial<CollectionConfig['monitoring']>): void {
    this.config.monitoring = {
      ...this.config.monitoring,
      ...updates
    };
    this.saveConfig();
          logger.system.cache('監控配置已更新', updates);
  }

  /**
   * 更新效能配置
   */
  updatePerformanceConfig(updates: Partial<CollectionConfig['performance']>): void {
    this.config.performance = {
      ...this.config.performance,
      ...updates
    };
    this.saveConfig();
          logger.system.cache('效能配置已更新', updates);
  }

  /**
   * 設定時間間隔
   */
  setScheduleInterval(interval: string): void {
    this.config.scheduleInterval = interval;
    this.saveConfig();
          logger.system.cache(`排程間隔已設定為: ${interval}`);
  }

  /**
   * 設定更新間隔
   */
  setUpdateInterval(hours: number): void {
    this.config.updateInterval = hours;
    this.saveConfig();
          logger.system.cache(`更新間隔已設定為: ${hours} 小時`);
  }

  /**
   * 設定市場更新間隔
   */
  setMarketUpdateInterval(market: string, hours: number): void {
    this.updateMarketConfig(market, { updateInterval: hours });
          logger.system.cache(`市場 ${market} 更新間隔已設定為: ${hours} 小時`);
  }

  /**
   * 啟用/停用市場
   */
  setMarketEnabled(market: string, enabled: boolean): void {
    this.updateMarketConfig(market, { enabled });
          logger.system.cache(`市場 ${market} 已${enabled ? '啟用' : '停用'}`);
  }

  /**
   * 設定市場優先級
   */
  setMarketPriority(market: string, priority: number): void {
    this.updateMarketConfig(market, { priority });
          logger.system.cache(`市場 ${market} 優先級已設定為: ${priority}`);
  }

  /**
   * 取得市場配置
   */
  getMarketConfig(market: string): CollectionConfig['markets'][string] | null {
    return this.config.markets[market] || null;
  }

  /**
   * 取得啟用的市場
   */
  getEnabledMarkets(): string[] {
    return Object.entries(this.config.markets)
      .filter(([_, config]) => config.enabled)
      .map(([market, _]) => market);
  }

  /**
   * 取得市場優先級排序
   */
  getMarketsByPriority(): string[] {
    return Object.entries(this.config.markets)
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => b.priority - a.priority)
      .map(([market, _]) => market);
  }

  /**
   * 驗證配置
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 驗證基本配置
    if (this.config.updateInterval < 1) {
      errors.push('更新間隔不能小於1小時');
    }

    if (this.config.maxAgeHours < 1) {
      errors.push('最大年齡不能小於1小時');
    }

    // 驗證收集器配置
    if (this.config.collector.maxConcurrent < 1) {
      errors.push('最大並發數不能小於1');
    }

    if (this.config.collector.delayBetweenRequests < 100) {
      errors.push('請求間隔不能小於100ms');
    }

    if (this.config.collector.batchSize < 1) {
      errors.push('批次大小不能小於1');
    }

    // 驗證監控配置
    if (this.config.monitoring.refreshInterval < 1000) {
      errors.push('監控刷新間隔不能小於1000ms');
    }

    // 驗證市場配置
    const enabledMarkets = this.getEnabledMarkets();
    if (enabledMarkets.length === 0) {
      errors.push('至少需要啟用一個市場');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 重置為預設配置
   */
  resetToDefault(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
          logger.system.cache('配置已重置為預設值');
  }

  /**
   * 匯出配置
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 匯入配置
   */
  importConfig(configJson: string): { success: boolean; error?: string } {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = this.mergeWithDefaults(importedConfig);
      this.saveConfig();
      logger.system.cache('配置已匯入');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
              logger.system.cache('匯入配置失敗', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 取得配置摘要
   */
  getConfigSummary(): {
    enabled: boolean;
    scheduleInterval: string;
    updateInterval: number;
    enabledMarkets: string[];
    totalMarkets: number;
    collectorSettings: {
      maxConcurrent: number;
      batchSize: number;
      timeout: number;
    };
    monitoringEnabled: boolean;
  } {
    return {
      enabled: this.config.enabled,
      scheduleInterval: this.config.scheduleInterval,
      updateInterval: this.config.updateInterval,
      enabledMarkets: this.getEnabledMarkets(),
      totalMarkets: Object.keys(this.config.markets).length,
      collectorSettings: {
        maxConcurrent: this.config.collector.maxConcurrent,
        batchSize: this.config.collector.batchSize,
        timeout: this.config.collector.timeout
      },
      monitoringEnabled: this.config.monitoring.enabled
    };
  }
}
