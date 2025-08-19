export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageDuration: number;
    slowestTest: PerformanceMetric | null;
    fastestTest: PerformanceMetric | null;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeMetrics: Map<string, PerformanceMetric> = new Map();

  /**
   * 開始效能監控
   */
  start(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    const metric: PerformanceMetric = {
      name,
      startTime,
      metadata,
    };
    
    this.activeMetrics.set(name, metric);
    
    if (typeof window !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * 結束效能監控
   */
  end(name: string): PerformanceMetric | null {
    const metric = this.activeMetrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;

    this.metrics.push(metric);
    this.activeMetrics.delete(name);

    if (typeof window !== 'undefined' && performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    return metric;
  }

  /**
   * 測量函數執行時間
   */
  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * 同步測量函數執行時間
   */
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * 獲取效能報告
   */
  getReport(): PerformanceReport {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        metrics: [],
        summary: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          averageDuration: 0,
          slowestTest: null,
          fastestTest: null,
        },
      };
    }

    const durations = completedMetrics.map(m => m.duration!);
    const averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    
    const slowestTest = completedMetrics.reduce((slowest, current) => 
      current.duration! > slowest.duration! ? current : slowest
    );
    
    const fastestTest = completedMetrics.reduce((fastest, current) => 
      current.duration! < fastest.duration! ? current : fastest
    );

    return {
      metrics: completedMetrics,
      summary: {
        totalTests: completedMetrics.length,
        passedTests: completedMetrics.length, // 假設所有完成的測試都通過
        failedTests: 0,
        averageDuration,
        slowestTest,
        fastestTest,
      },
    };
  }

  /**
   * 清除所有指標
   */
  clear(): void {
    this.metrics = [];
    this.activeMetrics.clear();
    
    if (typeof window !== 'undefined' && performance.clearMarks && performance.clearMeasures) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  /**
   * 獲取特定指標
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.find(m => m.name === name);
  }

  /**
   * 檢查是否有效能警告
   */
  checkPerformanceWarnings(threshold: number = 1000): string[] {
    const warnings: string[] = [];
    const slowMetrics = this.metrics.filter(m => m.duration && m.duration > threshold);
    
    slowMetrics.forEach(metric => {
      warnings.push(`Slow performance: ${metric.name} took ${metric.duration?.toFixed(2)}ms`);
    });
    
    return warnings;
  }
}

// 創建全局實例
export const performanceMonitor = new PerformanceMonitor();

// 導出便捷函數
export const startPerformanceMonitoring = (name: string, metadata?: Record<string, any>) => 
  performanceMonitor.start(name, metadata);

export const endPerformanceMonitoring = (name: string) => 
  performanceMonitor.end(name);

export const measurePerformance = <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) => 
  performanceMonitor.measure(name, fn, metadata);

export const measurePerformanceSync = <T>(name: string, fn: () => T, metadata?: Record<string, any>) => 
  performanceMonitor.measureSync(name, fn, metadata);

export const getPerformanceReport = () => 
  performanceMonitor.getReport();

export const clearPerformanceMetrics = () => 
  performanceMonitor.clear();
