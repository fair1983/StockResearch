import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { measurePerformanceSync, measurePerformance } from './performance-monitor';

/**
 * 測試工具類
 */
export class TestUtils {
  /**
   * 測量組件渲染效能
   */
  static async measureRenderPerformance<T>(
    component: React.ReactElement,
    testName: string
  ): Promise<T> {
    return measurePerformance(testName, async () => {
      const result = render(component);
      await waitFor(() => {
        expect(screen.getByTestId('test-ready')).toBeTruthy();
      });
      return result as T;
    });
  }

  /**
   * 測量用戶交互效能
   */
  static async measureInteractionPerformance(
    element: HTMLElement,
    action: () => void,
    testName: string
  ): Promise<void> {
    return measurePerformance(testName, async () => {
      fireEvent.click(element);
      await waitFor(() => {
        // 等待交互完成
      });
      action();
    });
  }

  /**
   * 測量 API 調用效能
   */
  static async measureAPIPerformance<T>(
    apiCall: () => Promise<T>,
    testName: string
  ): Promise<T> {
    return measurePerformance(testName, apiCall);
  }

  /**
   * 創建模擬數據
   */
  static createMockStockData(symbol: string, market: string = 'TW') {
    return {
      symbol,
      name: `測試股票 ${symbol}`,
      market,
      category: '測試類別',
      yahoo_symbol: market === 'TW' ? `${symbol}.TW` : symbol,
    };
  }

  /**
   * 創建模擬 OHLC 數據
   */
  static createMockOHLCData(count: number = 100) {
    const data = [];
    const basePrice = 100;
    
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (count - i));
      
      const open = basePrice + Math.random() * 10;
      const high = open + Math.random() * 5;
      const low = open - Math.random() * 5;
      const close = open + (Math.random() - 0.5) * 10;
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      data.push({
        time: Math.floor(date.getTime() / 1000),
        open,
        high,
        low,
        close,
        volume,
      });
    }
    
    return data;
  }

  /**
   * 創建模擬關注列表數據
   */
  static createMockWatchlistData(count: number = 5) {
    const data = [];
    
    for (let i = 0; i < count; i++) {
      data.push({
        symbol: `TEST${i + 1}`,
        name: `測試股票 ${i + 1}`,
        market: i % 2 === 0 ? 'TW' : 'US',
        category: i % 2 === 0 ? '股票' : 'ETF',
        addedAt: new Date().toISOString(),
      });
    }
    
    return data;
  }

  /**
   * 設置 localStorage 模擬數據
   */
  static setupLocalStorageMock(data: any) {
    const mockGetItem = jest.fn((key: string) => {
      if (key === 'stock_watchlist') {
        return JSON.stringify(data);
      }
      return null;
    });
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
    
    return mockGetItem;
  }

  /**
   * 設置 fetch 模擬響應
   */
  static setupFetchMock(response: any, status: number = 200) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: status === 200,
      status,
      json: async () => response,
    });
  }

  /**
   * 等待異步操作完成
   */
  static async waitForAsync(ms: number = 100) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 驗證效能指標
   */
  static validatePerformanceMetric(
    metric: any,
    expectedMaxDuration: number = 1000
  ) {
    expect(metric).toBeDefined();
    expect(metric.duration).toBeDefined();
    expect(metric.duration).toBeLessThan(expectedMaxDuration);
    expect(metric.duration).toBeGreaterThan(0);
  }

  /**
   * 驗證組件渲染效能
   */
  static async validateRenderPerformance(
    component: React.ReactElement,
    testName: string,
    maxDuration: number = 500
  ) {
    const startTime = performance.now();
    const result = render(component);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(maxDuration);
    expect(result).toBeDefined();
    
    return result;
  }

  /**
   * 驗證 API 響應效能
   */
  static async validateAPIResponsePerformance(
    apiCall: () => Promise<any>,
    testName: string,
    maxDuration: number = 2000
  ) {
    const startTime = performance.now();
    const result = await apiCall();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(maxDuration);
    expect(result).toBeDefined();
    
    return result;
  }
}

/**
 * 測試數據生成器
 */
export class TestDataGenerator {
  /**
   * 生成隨機股票代碼
   */
  static generateStockSymbol(market: string = 'TW'): string {
    if (market === 'TW') {
      return Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    } else {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return Array.from({ length: 4 }, () => 
        letters[Math.floor(Math.random() * letters.length)]
      ).join('');
    }
  }

  /**
   * 生成隨機股票名稱
   */
  static generateStockName(): string {
    const names = ['科技', '金融', '製造', '服務', '能源', '醫療', '消費', '通訊'];
    const suffixes = ['公司', '集團', '企業', '股份', '有限'];
    
    const name = names[Math.floor(Math.random() * names.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${name}${suffix}`;
  }

  /**
   * 生成隨機價格數據
   */
  static generatePriceData(basePrice: number = 100, volatility: number = 0.1) {
    const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
    return basePrice + change;
  }

  /**
   * 生成隨機成交量
   */
  static generateVolume(min: number = 100000, max: number = 10000000): number {
    return Math.floor(Math.random() * (max - min) + min);
  }
}

/**
 * 測試斷言工具
 */
export class TestAssertions {
  /**
   * 驗證股票數據格式
   */
  static validateStockData(stock: any) {
    expect(stock).toHaveProperty('symbol');
    expect(stock).toHaveProperty('name');
    expect(stock).toHaveProperty('market');
    expect(stock).toHaveProperty('category');
    expect(typeof stock.symbol).toBe('string');
    expect(typeof stock.name).toBe('string');
    expect(['TW', 'US']).toContain(stock.market);
  }

  /**
   * 驗證 OHLC 數據格式
   */
  static validateOHLCData(data: any[]) {
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    
    data.forEach(item => {
      expect(item).toHaveProperty('time');
      expect(item).toHaveProperty('open');
      expect(item).toHaveProperty('high');
      expect(item).toHaveProperty('low');
      expect(item).toHaveProperty('close');
      expect(item).toHaveProperty('volume');
      
      expect(typeof item.time).toBe('number');
      expect(typeof item.open).toBe('number');
      expect(typeof item.high).toBe('number');
      expect(typeof item.low).toBe('number');
      expect(typeof item.close).toBe('number');
      expect(typeof item.volume).toBe('number');
    });
  }

  /**
   * 驗證關注列表數據格式
   */
  static validateWatchlistData(watchlist: any[]) {
    expect(Array.isArray(watchlist)).toBe(true);
    
    watchlist.forEach(item => {
      expect(item).toHaveProperty('symbol');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('market');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('addedAt');
      
      expect(typeof item.symbol).toBe('string');
      expect(typeof item.name).toBe('string');
      expect(['TW', 'US']).toContain(item.market);
      expect(typeof item.category).toBe('string');
      expect(typeof item.addedAt).toBe('string');
    });
  }
}
