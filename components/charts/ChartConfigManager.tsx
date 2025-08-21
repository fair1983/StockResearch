'use client';

import { IChartApi } from 'lightweight-charts';

export interface ChartConfig {
  width: number;
  height: number;
  timeframe: string;
}

export interface TimeScaleOptions {
  timeVisible: boolean;
  secondsVisible: boolean;
  tickMarkFormatter: (time: number) => string;
  fixLeftEdge: boolean;
  fixRightEdge: boolean;
}

export class ChartConfigManager {
  /**
   * 取得本地化設定
   */
  static getLocalization(timeframe: string) {
    const timeFormatter = (ts: number) => {
      const d = new Date(ts * 1000);
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return timeframe.includes('m') ? `${y} ${m}/${day} ${hh}:${mm}` : `${y} ${m}/${day}`;
    };
    return { timeFormatter, locale: 'zh-TW' };
  }

  /**
   * 取得時間框架顯示名稱
   */
  static getTimeframeDisplayName(timeframe: string): string {
    const timeframeMap: { [key: string]: string } = {
      '1m': '1分鐘K',
      '5m': '5分鐘K',
      '15m': '15分鐘K',
      '30m': '30分鐘K',
      '60m': '60分鐘K',
      '1d': '日K',
      '1w': '週K',
      '1M': '月K',
    };
    return timeframeMap[timeframe] || `${timeframe}K`;
  }

  /**
   * 根據時間框架取得時間軸設定
   */
  static getTimeScaleOptions(timeframe: string): TimeScaleOptions {
    // X軸標籤格式：yyyy MM/dd
    const formatXAxisLabel = (time: number) => {
      const date = new Date(time * 1000);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year} ${month}/${day}`;
    };

    return {
      timeVisible: true,
      secondsVisible: timeframe.includes('m'),
      tickMarkFormatter: formatXAxisLabel,
      fixLeftEdge: true,
      fixRightEdge: true,
    };
  }

  /**
   * 取得主圖表配置
   */
  static getMainChartConfig(width: number, height: number, timeframe: string) {
    return {
      width,
      height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      localization: this.getLocalization(timeframe),
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#cccccc',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#cccccc',
        rightBarStaysOnScroll: true,
        lockVisibleTimeRangeOnResize: true,
        borderVisible: false,
        ...this.getTimeScaleOptions(timeframe),
      },
    };
  }

  /**
   * 取得指標圖表配置
   */
  static getIndicatorChartConfig(width: number, height: number, timeframe: string) {
    return {
      width,
      height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      localization: this.getLocalization(timeframe),
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#cccccc',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#cccccc',
        rightBarStaysOnScroll: true,
        lockVisibleTimeRangeOnResize: true,
        borderVisible: false,
        ...this.getTimeScaleOptions(timeframe),
      },
    };
  }

  /**
   * 根據時間框架設定初始顯示範圍（從現在時間點開始，參考 TradingView）
   */
  static setInitialTimeRange(chart: IChartApi, timeframe: string, dataLength: number): void {
    try {
      // 先讓圖表適應內容，獲取完整的資料範圍
      chart.timeScale().fitContent();
      
      // 等待一下讓 fitContent 生效
      setTimeout(() => {
        try {
          // 獲取圖表的完整邏輯範圍
          const logicalRange = chart.timeScale().getVisibleLogicalRange();
          if (!logicalRange) {
            return;
          }

          // 計算要顯示的資料點數量（從現在時間點向前推算）
          let visibleBars: number;
          
          // 根據 TradingView 的預設設定，但從最新資料開始顯示
          switch (timeframe) {
            case '1m':
            case '5m':
            case '15m':
            case '30m':
              // 分鐘K：顯示最近 240 個點（約 4 小時）
              visibleBars = 240;
              break;
            case '60m':
              // 小時K：顯示最近 24 個點（約 1 天）
              visibleBars = 24;
              break;
            case '1d':
              // 日K：顯示最近 60 個點（約 2 個月）
              visibleBars = 60;
              break;
            case '1w':
              // 週K：顯示最近 26 個點（約 6 個月）
              visibleBars = 26;
              break;
            case '1M':
              // 月K：顯示最近 24 個點（約 2 年）
              visibleBars = 24;
              break;
            default:
              // 預設顯示最近 60 個點
              visibleBars = 60;
          }

          // 確保不超過可用資料範圍
          const totalBars = logicalRange.to - logicalRange.from;
          const barsToShow = Math.min(visibleBars, totalBars);
          
          // 如果資料量很少，顯示全部資料
          if (totalBars <= barsToShow) {
            return; // 保持 fitContent 的結果
          }
          
          // 設定邏輯範圍，從最新資料開始顯示指定數量的資料點
          // 這樣可以確保最新的資料（接近現在時間）在右側顯示
          const from = Math.max(logicalRange.from, logicalRange.to - barsToShow);
          const to = logicalRange.to;
          
          chart.timeScale().setVisibleLogicalRange({
            from: from,
            to: to
          });
          
          console.log(`📅 設定初始時間範圍 (${timeframe}):`, {
            totalBars,
            visibleBars: barsToShow,
            from,
            to,
            showingLatest: true
          });
          
        } catch (error) {
          console.error('Set initial time range error (delayed)', error);
        }
      }, 50);
      
    } catch (error) {
      console.error('Set initial time range error', error);
      // 如果設定失敗，回退到 fitContent
      chart.timeScale().fitContent();
    }
  }

  /**
   * 同步兩個圖表的時間軸
   */
  static syncTimeScales(mainChart: IChartApi, indicatorChart: IChartApi, timeframe: string): void {
    // 主圖表時間軸變化時，同步到指標圖表
    const mainToIndicatorHandler = () => {
      try {
        const visibleRange = mainChart.timeScale().getVisibleRange();
        if (visibleRange) {
          indicatorChart.timeScale().setVisibleRange(visibleRange);
        }
      } catch (error) {
        console.error('Time scale sync error (main to indicator)', error);
      }
    };

    // 指標圖表時間軸變化時，同步到主圖表
    const indicatorToMainHandler = () => {
      try {
        const visibleRange = indicatorChart.timeScale().getVisibleRange();
        if (visibleRange) {
          mainChart.timeScale().setVisibleRange(visibleRange);
        }
      } catch (error) {
        console.error('Time scale sync error (indicator to main)', error);
      }
    };

    // 訂閱事件
    mainChart.timeScale().subscribeVisibleTimeRangeChange(mainToIndicatorHandler);
    indicatorChart.timeScale().subscribeVisibleTimeRangeChange(indicatorToMainHandler);

    // 初始同步：設定主圖表的初始時間範圍，然後同步到指標圖表
    try {
      // 設定主圖表的初始時間範圍
      this.setInitialTimeRange(mainChart, timeframe, 0);
      
      // 同步到指標圖表
      const initialRange = mainChart.timeScale().getVisibleRange();
      if (initialRange) {
        indicatorChart.timeScale().setVisibleRange(initialRange);
      }
    } catch (error) {
      console.error('Initial time scale sync error', error);
      // 如果設定失敗，回退到 fitContent
      mainChart.timeScale().fitContent();
      indicatorChart.timeScale().fitContent();
    }

    // 儲存處理器引用以便清理
    (mainChart as any)._timeRangeHandlers = {
      mainToIndicator: mainToIndicatorHandler,
      indicatorToMain: indicatorToMainHandler,
    };
  }

  /**
   * 清理時間軸同步事件
   */
  static cleanupTimeScaleSync(mainChart: IChartApi, indicatorChart: IChartApi): void {
    if ((mainChart as any)._timeRangeHandlers) {
      try {
        const handlers = (mainChart as any)._timeRangeHandlers;
        mainChart.timeScale().unsubscribeVisibleTimeRangeChange(handlers.mainToIndicator);
        indicatorChart.timeScale().unsubscribeVisibleTimeRangeChange(handlers.indicatorToMain);
      } catch (error) {
        console.error('Time scale sync cleanup error', error);
      }
    }
  }
}
