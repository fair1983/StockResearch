import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultiChartLayout from '@/components/MultiChartLayout';
import TradingViewIndicatorSelector from '@/components/TradingViewIndicatorSelector';
import fs from 'fs';
import path from 'path';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock lightweight-charts
jest.mock('lightweight-charts', () => ({
  createChart: jest.fn(() => ({
    addCandlestickSeries: jest.fn(() => ({
      setData: jest.fn(),
      update: jest.fn(),
    })),
    addLineSeries: jest.fn(() => ({
      setData: jest.fn(),
      update: jest.fn(),
    })),
    addHistogramSeries: jest.fn(() => ({
      setData: jest.fn(),
      update: jest.fn(),
    })),
    subscribeCrosshairMove: jest.fn(),
    subscribeVisibleTimeRangeChange: jest.fn(),
    timeScale: {
      fitContent: jest.fn(),
      setVisibleRange: jest.fn(),
    },
    remove: jest.fn(),
  })),
}));

// Mock technical indicators
jest.mock('@/lib/technical-indicators', () => ({
  calculateAllIndicators: jest.fn().mockReturnValue({
    ma5: [115, 114, 113, 112, 111],
    ma10: [110, 109, 108, 107, 106],
    ma20: [105, 104, 103, 102, 101],
    rsi: [65, 64, 63, 62, 61],
    macd: { macd: [2.5, 2.4, 2.3, 2.2, 2.1], signal: [2.0, 1.9, 1.8, 1.7, 1.6], histogram: [0.5, 0.4, 0.3, 0.2, 0.1] },
    kdj: { k: [70, 69, 68, 67, 66], d: [65, 64, 63, 62, 61], j: [80, 79, 78, 77, 76] },
    stoch: { k: [75, 74, 73, 72, 71], d: [70, 69, 68, 67, 66] },
    obv: [1000000, 990000, 980000, 970000, 960000],
    atr: [8.5, 8.2, 8.8, 9.1, 8.9],
    bollinger: { upper: [130, 129, 128, 127, 126], middle: [115, 114, 113, 112, 111], lower: [100, 99, 98, 97, 96] }
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('前端組件測試', () => {
  let mockData: any[];

  beforeAll(() => {
    // 載入測試資料
    const testDataPath = path.join(process.cwd(), 'test-data', 'test-stocks-data.json');
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
    mockData = testData.find(stock => stock.symbol === '2330.TW').data;
  });

  beforeEach(() => {
    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
  });

  describe('MultiChartLayout 組件測試', () => {
    const defaultProps = {
      data: mockData,
      symbol: '2330',
      market: 'TW',
      timeframe: '1d',
      selectedIndicators: new Set(['MA', 'RSI']),
      loading: false,
    };

    it('應該正確渲染組件', () => {
      render(<MultiChartLayout {...defaultProps} />);
      
      expect(screen.getByText('2330')).toBeInTheDocument();
      expect(screen.getByText('TW')).toBeInTheDocument();
      expect(screen.getByText('1d')).toBeInTheDocument();
    });

    it('應該顯示載入狀態', () => {
      render(<MultiChartLayout {...defaultProps} loading={true} />);
      
      expect(screen.getByText(/載入中/i)).toBeInTheDocument();
    });

    it('應該根據選擇的指標創建對應的圖表', () => {
      const propsWithIndicators = {
        ...defaultProps,
        selectedIndicators: new Set(['MA', 'RSI', 'MACD', 'ATR']),
      };
      
      render(<MultiChartLayout {...propsWithIndicators} />);
      
      // 檢查是否有主圖表容器
      expect(document.querySelector('[data-testid="main-chart"]')).toBeInTheDocument();
    });

    it('應該處理空數據', () => {
      render(<MultiChartLayout {...defaultProps} data={[]} />);
      
      expect(screen.getByText(/無資料可顯示/i)).toBeInTheDocument();
    });
  });

  describe('TradingViewIndicatorSelector 組件測試', () => {
    const defaultProps = {
      selectedIndicators: new Set(['MA', 'RSI']),
      onIndicatorChange: jest.fn(),
    };

    it('應該正確渲染組件', () => {
      render(<TradingViewIndicatorSelector {...defaultProps} />);
      
      expect(screen.getByText(/技術指標/i)).toBeInTheDocument();
    });

    it('應該能夠切換指標選擇', () => {
      const onIndicatorChange = jest.fn();
      render(<TradingViewIndicatorSelector {...defaultProps} onIndicatorChange={onIndicatorChange} />);
      
      const indicatorButton = screen.getByText(/技術指標/i);
      fireEvent.click(indicatorButton);
      
      // 檢查下拉選單是否出現
      expect(screen.getByText(/趨勢指標/i)).toBeInTheDocument();
      expect(screen.getByText(/震盪指標/i)).toBeInTheDocument();
    });

    it('應該顯示已選擇的指標數量', () => {
      const propsWithManyIndicators = {
        ...defaultProps,
        selectedIndicators: new Set(['MA', 'EMA', 'RSI', 'MACD', 'ATR']),
      };
      
      render(<TradingViewIndicatorSelector {...propsWithManyIndicators} />);
      
      expect(screen.getByText(/5/i)).toBeInTheDocument();
    });
  });

  describe('圖表同步測試', () => {
    it('應該同步多個圖表的時間軸', () => {
      const propsWithMultipleCharts = {
        data: mockData,
        symbol: '2330',
        market: 'TW',
        timeframe: '1d',
        selectedIndicators: new Set(['MA', 'RSI', 'MACD']),
        loading: false,
      };
      
      render(<MultiChartLayout {...propsWithMultipleCharts} />);
      
      // 檢查是否有多個圖表容器
      const chartContainers = document.querySelectorAll('[data-testid*="chart"]');
      expect(chartContainers.length).toBeGreaterThan(1);
    });
  });

  describe('指標分類測試', () => {
    it('應該將趨勢指標放在主圖表', () => {
      const trendIndicators = new Set(['MA', 'EMA', 'BOLL']);
      const props = {
        data: mockData,
        symbol: '2330',
        market: 'TW',
        timeframe: '1d',
        selectedIndicators: trendIndicators,
        loading: false,
      };
      
      render(<MultiChartLayout {...props} />);
      
      // 檢查主圖表是否存在
      expect(document.querySelector('[data-testid="main-chart"]')).toBeInTheDocument();
    });

    it('應該將震盪指標放在專用圖表', () => {
      const oscillatorIndicators = new Set(['RSI', 'KDJ', 'STOCH']);
      const props = {
        data: mockData,
        symbol: '2330',
        market: 'TW',
        timeframe: '1d',
        selectedIndicators: oscillatorIndicators,
        loading: false,
      };
      
      render(<MultiChartLayout {...props} />);
      
      // 檢查震盪指標圖表是否存在
      expect(document.querySelector('[data-testid="oscillator-chart"]')).toBeInTheDocument();
    });
  });

  describe('響應式設計測試', () => {
    it('應該在不同螢幕尺寸下正確顯示', () => {
      const props = {
        data: mockData,
        symbol: '2330',
        market: 'TW',
        timeframe: '1d',
        selectedIndicators: new Set(['MA', 'RSI']),
        loading: false,
      };
      
      // 測試桌面尺寸
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      
      const { rerender } = render(<MultiChartLayout {...props} />);
      expect(screen.getByText('2330')).toBeInTheDocument();
      
      // 測試平板尺寸
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      rerender(<MultiChartLayout {...props} />);
      expect(screen.getByText('2330')).toBeInTheDocument();
      
      // 測試手機尺寸
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      rerender(<MultiChartLayout {...props} />);
      expect(screen.getByText('2330')).toBeInTheDocument();
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內渲染', () => {
      const props = {
        data: mockData,
        symbol: '2330',
        market: 'TW',
        timeframe: '1d',
        selectedIndicators: new Set(['MA', 'RSI']),
        loading: false,
      };
      
      const startTime = performance.now();
      
      render(<MultiChartLayout {...props} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(200); // 應該在 200ms 內渲染
    });

    it('應該在合理時間內處理指標選擇', async () => {
      const onIndicatorChange = jest.fn();
      const props = {
        selectedIndicators: new Set(['MA']),
        onIndicatorChange,
      };
      
      render(<TradingViewIndicatorSelector {...props} />);
      
      const indicatorButton = screen.getByText(/技術指標/i);
      
      const startTime = performance.now();
      
      fireEvent.click(indicatorButton);
      
      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      expect(interactionTime).toBeLessThan(100); // 應該在 100ms 內處理互動
    });
  });
});
