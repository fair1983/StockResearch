// === /lib/logger.ts ===
import {
  LogConfig, LogLevel, LogLevelName, FrontendChartRenderConfig
} from '@/types';

// 預設配置（相容你原本的邏輯，並新增 frontend.chartRender 細分 + level）
const defaultLogConfig: LogConfig = {
  api: { enabled: true, level: 'info', request: true, response: true, error: true, timing: true },
  yahooFinance: { enabled: true, level: 'info', request: true, response: true, error: true, dataRange: true },
  frontend: {
    enabled: true,
    level: 'info',
    dataFetch: true,
    error: true,
    chartRender: {
      enabled: false,      // 產線建議關閉，除非要查問題
      level: 'info',
      init: false,
      indicators: false,
      resize: false,
      crosshair: false,
      cleanup: false,
      misc: false,
    },
  },
  system: { enabled: true, cache: false, performance: false, level: 'info' },
  configuration: { enabled: true, info: true, error: true, level: 'info' },
  ai: { enabled: true, analysis: true, error: true, level: 'info' },
  monitor: { enabled: true, info: true, progress: true, complete: true, level: 'info' },
  scheduler: { enabled: true, level: 'info', info: true, warn: true, error: true, start: true, stop: true, complete: true },
  dataCollection: {
    enabled: true, level: 'info',
    start: true, progress: true, complete: true, error: true, request: true, success: true, info: true,
  },
  stockList: { enabled: true, level: 'info', info: true, warn: true, error: true },
  stockMetadata: { enabled: true, level: 'info', info: true, warn: true, error: true },
};

class Logger {
  private config: LogConfig;
  private logs: LogLevel[] = [];
  private maxLogs = 1000;
  private subscribers = new Set<(log: LogLevel) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('logConfig');
        this.config = saved ? JSON.parse(saved) : defaultLogConfig;
      } catch {
        this.config = defaultLogConfig;
      }
    } else {
      this.config = defaultLogConfig;
    }
  }

  // ====== 事件訂閱（AdminPage 即時更新用）======
  subscribe(cb: (log: LogLevel) => void) {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }
  private emit(log: LogLevel) {
    this.subscribers.forEach(cb => cb(log));
  }

  // ====== 等級閘 ======
  private levelRank(l: LogLevel['level']) {
    return ({ error: 1, warn: 2, info: 3, debug: 4 } as const)[l];
  }
  private configLevelToRank(l?: LogLevelName) {
    if (!l || l === 'info') return 3;
    return ({ off: 0, error: 1, warn: 2, info: 3, debug: 4 } as const)[l];
  }
  private allowed(current: LogLevel['level'], categoryEnabled: boolean, categoryLevel?: LogLevelName) {
    if (!categoryEnabled) return false;
    return this.configLevelToRank(categoryLevel) >= this.levelRank(current);
  }

  // ====== 基礎 log ======
  private _log(level: LogLevel['level'], category: string, message: string, data?: any, tags?: string[]) {
    const entry: LogLevel = {
      level, timestamp: new Date().toISOString(), category, message, data, tags,
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs = this.logs.slice(-this.maxLogs);

    // console 輸出（避免拋錯）
    try {
      const meth = level === 'error' ? 'error' : level === 'warn' ? 'warn' : level === 'info' ? 'info' : 'log';
      // 僅在該分類 enabled 時寫入 console
      const catCfg = (this.config as any)[category];
      if (catCfg?.enabled) {
        // 避免資料中 circular，保留 console 原始資料即可
        console[meth](`[${category.toUpperCase()}] ${message}`, data ?? '');
      }
    } catch {}

    // 通知訂閱者
    this.emit(entry);
  }

  updateConfig(newConfig: Partial<LogConfig>) {
    this.config = { ...this.config, ...newConfig } as LogConfig;
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('logConfig', JSON.stringify(this.config)); } catch {}
    }
  }
  getConfig(): LogConfig { return this.config; }
  resetConfig() {
    this.config = defaultLogConfig;
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('logConfig', JSON.stringify(this.config)); } catch {}
    }
  }

  // ====== API ======
  api = {
    request: (m: string, d?: any) => {
      const c = this.config.api;
      if (!this.allowed('info', c.enabled, c.level) || !c.request) return;
      this._log('info','api',`REQUEST: ${m}`, d);
    },
    response: (m: string, d?: any) => {
      const c = this.config.api;
      if (!this.allowed('info', c.enabled, c.level) || !c.response) return;
      this._log('info','api',`RESPONSE: ${m}`, d);
    },
    timing: (m: string, d?: any) => {
      const c = this.config.api;
      if (!this.allowed('info', c.enabled, c.level) || !c.timing) return;
      this._log('info','api',`TIMING: ${m}`, d);
    },
    error: (m: string, d?: any) => {
      const c = this.config.api;
      if (!this.allowed('error', c.enabled, c.level) || !c.error) return;
      this._log('error','api',`ERROR: ${m}`, d);
    },
    warn: (m: string, d?: any) => {
      const c = this.config.api;
      if (!this.allowed('warn', c.enabled, c.level)) return;
      this._log('warn','api',`WARN: ${m}`, d);
    },
  };

  // ====== Yahoo Finance ======
  yahooFinance = {
    request: (m: string, d?: any) => {
      const c = this.config.yahooFinance;
      if (!this.allowed('info', c.enabled, c.level) || !c.request) return;
      this._log('info','yahooFinance',`REQUEST: ${m}`, d);
    },
    response: (m: string, d?: any) => {
      const c = this.config.yahooFinance;
      if (!this.allowed('info', c.enabled, c.level) || !c.response) return;
      this._log('info','yahooFinance',`RESPONSE: ${m}`, d);
    },
    dataRange: (m: string, d?: any) => {
      const c = this.config.yahooFinance;
      if (!this.allowed('info', c.enabled, c.level) || !c.dataRange) return;
      this._log('info','yahooFinance',`DATA_RANGE: ${m}`, d);
    },
    error: (m: string, d?: any) => {
      const c = this.config.yahooFinance;
      if (!this.allowed('error', c.enabled, c.level) || !c.error) return;
      this._log('error','yahooFinance',`ERROR: ${m}`, d);
    },
    warn: (m: string, d?: any) => {
      const c = this.config.yahooFinance;
      if (!this.allowed('warn', c.enabled, c.level)) return;
      this._log('warn','yahooFinance',`WARN: ${m}`, d);
    },
  };

  // ====== Frontend（含技術圖細分）======
  frontend = {
    dataFetch: (m: string, d?: any) => {
      const f = this.config.frontend;
      if (!this.allowed('info', f.enabled, f.level) || !f.dataFetch) return;
      this._log('info','frontend',`DATA_FETCH: ${m}`, d);
    },
    error: (m: string, d?: any) => {
      const f = this.config.frontend;
      if (!this.allowed('error', f.enabled, f.level) || !f.error) return;
      this._log('error','frontend',`ERROR: ${m}`, d);
    },
    /** 細分技術圖渲染；舊呼叫點不帶 tag 時會被歸類到 'misc' */
    chartRender: (
      m: string,
      d?: any,
      tag: 'init' | 'indicators' | 'resize' | 'crosshair' | 'cleanup' | 'misc' = 'misc'
    ) => {
      const f = this.config.frontend;
      if (!f.enabled) return;

      const c: FrontendChartRenderConfig =
        typeof f.chartRender === 'boolean'
          ? { enabled: f.chartRender, level: f.level ?? 'info', init:true, indicators:true, resize:true, crosshair:true, cleanup:true, misc:true }
          : (f.chartRender as FrontendChartRenderConfig);

      if (!c.enabled || !c[tag]) return;
      const level = c.level ?? f.level ?? 'info';
      if (!this.allowed('info', true, level)) return;

      this._log('info','frontend',`CHART_${tag.toUpperCase()}: ${m}`, d, [`chart:${tag}`]);
    },
  };

  // ====== 其他分類（與原本一致，補上等級判斷）======
  system = {
    cache: (m: string, d?: any) => {
      const c = this.config.system;
      if (!this.allowed('info', c.enabled, c.level) || !c.cache) return;
      this._log('info','system',`CACHE: ${m}`, d);
    },
    performance: (m: string, d?: any) => {
      const c = this.config.system;
      if (!this.allowed('info', c.enabled, c.level) || !c.performance) return;
      this._log('info','system',`PERFORMANCE: ${m}`, d);
    },
  };

  configuration = {
    info: (m: string, d?: any) => {
      const c = this.config.configuration;
      if (!this.allowed('info', c.enabled, c.level) || !c.info) return;
      this._log('info','configuration',`CONFIG: ${m}`, d);
    },
    error: (m: string, d?: any) => {
      const c = this.config.configuration;
      if (!this.allowed('error', c.enabled, c.level) || !c.error) return;
      this._log('error','configuration',`CONFIG_ERROR: ${m}`, d);
    },
  };

  ai = {
    analysis: (m: string, d?: any) => {
      const c = this.config.ai;
      if (!this.allowed('info', c.enabled, c.level) || !c.analysis) return;
      this._log('info','ai',`ANALYSIS: ${m}`, d);
    },
    error: (m: string, d?: any) => {
      const c = this.config.ai;
      if (!this.allowed('error', c.enabled, c.level) || !c.error) return;
      this._log('error','ai',`ERROR: ${m}`, d);
    },
  };

  monitor = {
    info: (m: string, d?: any) => {
      const c = this.config.monitor;
      if (!this.allowed('info', c.enabled, c.level) || !c.info) return;
      this._log('info','monitor',`MONITOR: ${m}`, d);
    },
    progress: (m: string, d?: any) => {
      const c = this.config.monitor;
      if (!this.allowed('info', c.enabled, c.level) || !c.progress) return;
      this._log('info','monitor',`PROGRESS: ${m}`, d);
    },
    complete: (m: string, d?: any) => {
      const c = this.config.monitor;
      if (!this.allowed('info', c.enabled, c.level) || !c.complete) return;
      this._log('info','monitor',`COMPLETE: ${m}`, d);
    },
  };

  scheduler = {
    info: (m: string, d?: any) => {
      const c = this.config.scheduler;
      if (!this.allowed('info', c.enabled, c.level) || !c.info) return;
      this._log('info','scheduler',`SCHEDULER: ${m}`, d);
    },
    warn: (m: string, d?: any) => {
      const c = this.config.scheduler;
      if (!this.allowed('warn', c.enabled, c.level) || !c.warn) return;
      this._log('warn','scheduler',`SCHEDULER_WARN: ${m}`, d);
    },
    error: (m: string, d?: any) => {
      const c = this.config.scheduler;
      if (!this.allowed('error', c.enabled, c.level) || !c.error) return;
      this._log('error','scheduler',`SCHEDULER_ERROR: ${m}`, d);
    },
    start: (m: string, d?: any) => {
      const c = this.config.scheduler;
      if (!this.allowed('info', c.enabled, c.level) || !c.start) return;
      this._log('info','scheduler',`SCHEDULER_START: ${m}`, d);
    },
    stop: (m: string, d?: any) => {
      const c = this.config.scheduler;
      if (!this.allowed('info', c.enabled, c.level) || !c.stop) return;
      this._log('info','scheduler',`SCHEDULER_STOP: ${m}`, d);
    },
    complete: (m: string, d?: any) => {
      const c = this.config.scheduler;
      if (!this.allowed('info', c.enabled, c.level) || !c.complete) return;
      this._log('info','scheduler',`SCHEDULER_COMPLETE: ${m}`, d);
    },
  };

  dataCollection = {
    start: (m: string, d?: any) => {
      const c = this.config.dataCollection;
      if (!this.allowed('info', c.enabled, c.level) || !c.start) return;
      this._log('info','dataCollection',`START: ${m}`, d);
    },
    progress: (m: string, d?: any) => {
      const c = this.config.dataCollection;
      if (!this.allowed('info', c.enabled, c.level) || !c.progress) return;
      this._log('info','dataCollection',`PROGRESS: ${m}`, d);
    },
    complete: (m: string, d?: any) => {
      const c = this.config.dataCollection;
      if (!this.allowed('info', c.enabled, c.level) || !c.complete) return;
      this._log('info','dataCollection',`COMPLETE: ${m}`, d);
    },
    error: (m: string, d?: any) => {
      const c = this.config.dataCollection;
      if (!this.allowed('error', c.enabled, c.level) || !c.error) return;
      this._log('error','dataCollection',`ERROR: ${m}`, d);
    },
    request: (m: string, d?: any) => {
      const c = this.config.dataCollection;
      if (!this.allowed('info', c.enabled, c.level) || !c.request) return;
      this._log('info','dataCollection',`REQUEST: ${m}`, d);
    },
    success: (m: string, d?: any) => {
      const c = this.config.dataCollection;
      if (!this.allowed('info', c.enabled, c.level) || !c.success) return;
      this._log('info','dataCollection',`SUCCESS: ${m}`, d);
    },
    info: (m: string, d?: any) => {
      const c = this.config.dataCollection;
      if (!this.allowed('info', c.enabled, c.level) || !c.info) return;
      this._log('info','dataCollection',`INFO: ${m}`, d);
    },
  };

  stockList = {
    info: (m: string, d?: any) => {
      const c = this.config.stockList;
      if (!this.allowed('info', c.enabled, c.level) || !c.info) return;
      this._log('info','stockList',`STOCK_LIST: ${m}`, d);
    },
    warn: (m: string, d?: any) => {
      const c = this.config.stockList;
      if (!this.allowed('warn', c.enabled, c.level) || !c.warn) return;
      this._log('warn','stockList',`STOCK_LIST_WARN: ${m}`, d);
    },
    error: (m: string, d?: any) => {
      const c = this.config.stockList;
      if (!this.allowed('error', c.enabled, c.level) || !c.error) return;
      this._log('error','stockList',`STOCK_LIST_ERROR: ${m}`, d);
    },
  };

  stockMetadata = {
    info: (m: string, d?: any) => {
      const c = this.config.stockMetadata;
      if (!this.allowed('info', c.enabled, c.level) || !c.info) return;
      this._log('info','stockMetadata', m, d);
    },
    warn: (m: string, d?: any) => {
      const c = this.config.stockMetadata;
      if (!this.allowed('warn', c.enabled, c.level) || !c.warn) return;
      this._log('warn','stockMetadata', m, d);
    },
    error: (m: string, d?: any) => {
      const c = this.config.stockMetadata;
      if (!this.allowed('error', c.enabled, c.level) || !c.error) return;
      this._log('error','stockMetadata', m, d);
    },
  };

  // ====== Logs 操作 ======
  getLogs(): LogLevel[] { return [...this.logs]; }
  clearLogs() { this.logs = []; }
  exportLogs(): string {
    const seen = new WeakSet();
    return JSON.stringify(this.logs, function (_key, value) {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (value instanceof Error) {
        return { name: value.name, message: value.message, stack: value.stack };
      }
      return value;
    }, 2);
  }
}

export const logger = new Logger();
