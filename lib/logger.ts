import { LogConfig, LogLevel } from '@/types';

// 預設日誌配置
const defaultLogConfig: LogConfig = {
  api: {
    enabled: true,
    request: true,
    response: true,
    error: true,
    timing: true,
  },
  yahooFinance: {
    enabled: true,
    request: true,
    response: true,
    error: true,
    dataRange: true,
  },
  frontend: {
    enabled: true,
    dataFetch: true,
    chartRender: false,
    error: true,
  },
  system: {
    enabled: true,
    cache: false,
    performance: false,
  },
};

class Logger {
  private config: LogConfig;
  private logs: LogLevel[] = [];
  private maxLogs = 1000; // 最多保留 1000 條日誌

  constructor() {
    // 從 localStorage 讀取配置，如果沒有則使用預設配置
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('logConfig');
      this.config = savedConfig ? JSON.parse(savedConfig) : defaultLogConfig;
    } else {
      this.config = defaultLogConfig;
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<LogConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      localStorage.setItem('logConfig', JSON.stringify(this.config));
    }
  }

  // 獲取配置
  getConfig(): LogConfig {
    return this.config;
  }

  // 重置配置
  resetConfig() {
    this.config = defaultLogConfig;
    if (typeof window !== 'undefined') {
      localStorage.setItem('logConfig', JSON.stringify(this.config));
    }
  }

  // 記錄日誌
  private log(level: LogLevel['level'], category: string, message: string, data?: any) {
    const logEntry: LogLevel = {
      level,
      timestamp: new Date().toISOString(),
      category,
      message,
      data,
    };

    this.logs.push(logEntry);

    // 限制日誌數量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 根據配置決定是否輸出到 console
    const categoryConfig = this.config[category as keyof LogConfig];
    if (categoryConfig && categoryConfig.enabled) {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 
                           level === 'info' ? 'info' : 'log';
      
      console[consoleMethod](`[${category.toUpperCase()}] ${message}`, data || '');
    }
  }

  // API 相關日誌
  api = {
    request: (message: string, data?: any) => {
      if (this.config.api.request) {
        this.log('info', 'api', `REQUEST: ${message}`, data);
      }
    },
    response: (message: string, data?: any) => {
      if (this.config.api.response) {
        this.log('info', 'api', `RESPONSE: ${message}`, data);
      }
    },
    error: (message: string, data?: any) => {
      if (this.config.api.error) {
        this.log('error', 'api', `ERROR: ${message}`, data);
      }
    },
    warn: (message: string, data?: any) => {
      if (this.config.api.error) {
        this.log('warn', 'api', `WARN: ${message}`, data);
      }
    },
    timing: (message: string, data?: any) => {
      if (this.config.api.timing) {
        this.log('info', 'api', `TIMING: ${message}`, data);
      }
    },
  };

  // Yahoo Finance 相關日誌
  yahooFinance = {
    request: (message: string, data?: any) => {
      if (this.config.yahooFinance.request) {
        this.log('info', 'yahooFinance', `REQUEST: ${message}`, data);
      }
    },
    response: (message: string, data?: any) => {
      if (this.config.yahooFinance.response) {
        this.log('info', 'yahooFinance', `RESPONSE: ${message}`, data);
      }
    },
    error: (message: string, data?: any) => {
      if (this.config.yahooFinance.error) {
        this.log('error', 'yahooFinance', `ERROR: ${message}`, data);
      }
    },
    warn: (message: string, data?: any) => {
      if (this.config.yahooFinance.error) {
        this.log('warn', 'yahooFinance', `WARN: ${message}`, data);
      }
    },
    dataRange: (message: string, data?: any) => {
      if (this.config.yahooFinance.dataRange) {
        this.log('info', 'yahooFinance', `DATA_RANGE: ${message}`, data);
      }
    },
  };

  // 前端相關日誌
  frontend = {
    dataFetch: (message: string, data?: any) => {
      if (this.config.frontend.dataFetch) {
        this.log('info', 'frontend', `DATA_FETCH: ${message}`, data);
      }
    },
    chartRender: (message: string, data?: any) => {
      if (this.config.frontend.chartRender) {
        this.log('info', 'frontend', `CHART_RENDER: ${message}`, data);
      }
    },
    error: (message: string, data?: any) => {
      if (this.config.frontend.error) {
        this.log('error', 'frontend', `ERROR: ${message}`, data);
      }
    },
  };

  // 系統相關日誌
  system = {
    cache: (message: string, data?: any) => {
      if (this.config.system.cache) {
        this.log('info', 'system', `CACHE: ${message}`, data);
      }
    },
    performance: (message: string, data?: any) => {
      if (this.config.system.performance) {
        this.log('info', 'system', `PERFORMANCE: ${message}`, data);
      }
    },
  };

  // 股票元資料相關日誌
  stockMetadata = {
    info: (message: string, data?: any) => {
      this.log('info', 'stockMetadata', message, data);
    },
    warn: (message: string, data?: any) => {
      this.log('warn', 'stockMetadata', message, data);
    },
    error: (message: string, data?: any) => {
      this.log('error', 'stockMetadata', message, data);
    },
  };

  // 獲取所有日誌
  getLogs(): LogLevel[] {
    return [...this.logs];
  }

  // 清空日誌
  clearLogs() {
    this.logs = [];
  }

  // 導出日誌
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// 創建全域實例
export const logger = new Logger();
