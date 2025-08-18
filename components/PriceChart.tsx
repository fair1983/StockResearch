'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { Candle } from '@/types';
import { logger } from '@/lib/logger';

// 取得時間框架顯示名稱
function getTimeframeDisplayName(timeframe: string): string {
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

// 根據時間框架取得時間軸設定
function getTimeScaleOptions(timeframe: string) {
  switch (timeframe) {
    case '1m':
    case '5m':
    case '15m':
    case '30m':
    case '60m':
      return {
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          // 分K顯示：HH:MM 格式
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        },
      };
    case '1w':
      return {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          // 週K顯示：MM/DD 格式
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${month}/${day}`;
        },
      };
    case '1M':
      return {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          // 月K顯示：MM/YYYY 格式
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          return `${month}/${year}`;
        },
      };
    case '1d':
    default:
      return {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          // 日K顯示：MM/DD 格式 (參考 TradingView)
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${month}/${day}`;
        },
      };
  }
}

interface PriceChartProps {
  data: Candle[];
  symbol: string;
  market: string;
  timeframe?: string; // 新增時間框架參數
}

export default function PriceChart({ data, symbol, market, timeframe = '1d' }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 清理舊的圖表
    if (chartRef.current) {
      try {
        chartRef.current.remove();
        chartRef.current = null; // 清空參考
      } catch (error) {
        // 忽略已清理的圖表錯誤
        logger.frontend.chartRender('Chart already disposed', error);
        chartRef.current = null; // 清空參考
      }
    }

    // 確保容器存在且沒有舊圖表
    if (!chartContainerRef.current || chartRef.current) {
      return;
    }

    // 建立新圖表
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1, // 十字線模式
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        // 根據時間框架設定時間軸格式
        ...getTimeScaleOptions(timeframe),
        // 確保時間軸顯示正確
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    });

    // 建立 K 線圖系列
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // 驗證資料
    if (!data || data.length === 0) {
      logger.frontend.chartRender('No data available for chart');
      return;
    }

    // 轉換資料格式
    const chartData: CandlestickData[] = data.map(candle => {
      let time: any;
      
      if (timeframe === '1d' || timeframe === '1w' || timeframe === '1M') {
        // 日K/週K/月K：將 YYYY-MM-DD 轉換為 Unix timestamp
        const date = new Date(candle.time + 'T00:00:00');
        time = Math.floor(date.getTime() / 1000);
      } else {
        // 分K：將 YYYY-MM-DD HH:MM 轉換為 Unix timestamp
        const date = new Date(candle.time);
        time = Math.floor(date.getTime() / 1000);
      }
      
      return {
        time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      };
    });

    logger.frontend.chartRender('Chart data prepared', { 
      sampleData: chartData.slice(0, 3), 
      dataLength: chartData.length 
    });

    // 設定資料
    candlestickSeries.setData(chartData);

    // 儲存參考
    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // 響應式調整
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        } catch (error) {
          logger.frontend.chartRender('Resize error', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        try {
          chartRef.current.remove();
          chartRef.current = null; // 清空參考
        } catch (error) {
          // 忽略已清理的圖表錯誤
          logger.frontend.chartRender('Chart already disposed in cleanup', error);
          chartRef.current = null; // 清空參考
        }
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">無資料可顯示</div>
          <div className="text-gray-400 text-sm">請檢查股票代碼是否正確</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
                        <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {market === 'US' ? symbol : `${symbol} (台股)`}
                    </h2>
                    <p className="text-sm text-gray-600">
                      資料期間: {data[data.length - 1]?.time} 至 {data[0]?.time} ({data.length} 筆資料)
                      {timeframe !== '1d' && ` • ${getTimeframeDisplayName(timeframe)}`}
                    </p>
                  </div>
      
      <div 
        ref={chartContainerRef} 
        className="w-full h-[500px] border border-gray-200 rounded-lg overflow-hidden"
      />
      
      <div className="mt-6 text-xs text-gray-500">
        <p>• 綠色表示上漲，紅色表示下跌</p>
        <p>• 可使用滑鼠拖拽移動圖表，滾輪縮放</p>
        <p>• 滑鼠懸停顯示十字線和詳細資訊</p>
      </div>
    </div>
  );
}
