'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { CandlestickSeries } from 'lightweight-charts';
import { Candle } from '@/types';
import { logger } from '@/lib/logger';
import { IndicatorType } from './TechnicalIndicators';
import { getStockName } from '@/lib/stock-utils';
import { TechnicalIndicatorRenderer, IndicatorData } from './charts/TechnicalIndicatorRenderer';
import { ChartConfigManager } from './charts/ChartConfigManager';
import { DataTransformer } from './charts/DataTransformer';
import { IndicatorDataManager } from './charts/IndicatorDataManager';

interface PriceChartProps {
  data: Candle[];
  symbol: string;
  market: string;
  timeframe?: string;
  selectedIndicators?: IndicatorType[];
}

export default function PriceChart({ data, symbol, market, timeframe = '1d', selectedIndicators = [] }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const indicatorChartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const indicatorChartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRef = useRef<{ [key: string]: ISeriesApi<'Line'> | ISeriesApi<'Histogram'> }>({});
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [hoverInfo, setHoverInfo] = useState<any>(null);

  useEffect(() => {
    const initializeChart = async () => {
    if (!chartContainerRef.current) return;

    // 清理舊的圖表
    if (chartRef.current) {
      try {
        chartRef.current.remove();
        chartRef.current = null;
      } catch (error) {
        logger.frontend.chartRender('Chart already disposed', error);
        chartRef.current = null;
      }
    }
    
    if (indicatorChartRef.current) {
      try {
        indicatorChartRef.current.remove();
        indicatorChartRef.current = null;
      } catch (error) {
        logger.frontend.chartRender('Indicator chart already disposed', error);
        indicatorChartRef.current = null;
      }
    }

    // 驗證資料
      if (!DataTransformer.validateData(data)) {
      logger.frontend.chartRender('No data available for chart');
      return;
    }

    // 轉換資料格式
      const chartData = DataTransformer.transformCandleData(data, timeframe);
      const dataRangeInfo = DataTransformer.getDataRangeInfo(data);

    logger.frontend.chartRender('Chart data prepared', { 
      sampleData: chartData.slice(0, 3), 
        dataLength: chartData.length,
        dataRange: dataRangeInfo.dateRange
    });

    // 建立K線圖表
      const chart = createChart(chartContainerRef.current, 
        ChartConfigManager.getMainChartConfig(
          chartContainerRef.current.clientWidth,
          400,
          timeframe
        )
      );

    // 建立技術指標圖表（如果有選擇指標）
    let indicatorChart: IChartApi | null = null;
    if (selectedIndicators.length > 0 && indicatorChartContainerRef.current) {
        indicatorChart = createChart(indicatorChartContainerRef.current, 
          ChartConfigManager.getIndicatorChartConfig(
            indicatorChartContainerRef.current.clientWidth,
            250,
            timeframe
          )
        );
    }

    // 建立 K 線圖系列
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    
    // 設定K線資料
    candlestickSeries.setData(chartData);

      // 計算並添加技術指標
    if (selectedIndicators.length > 0 && data.length > 0 && indicatorChart) {
        try {
          // 獲取指標資料
          const indicators = await IndicatorDataManager.getIndicatorData(market, symbol, timeframe, data);
          
          // 驗證指標資料
          if (IndicatorDataManager.validateIndicatorData(indicators)) {
            // 使用技術指標渲染器
            const indicatorRenderer = new TechnicalIndicatorRenderer({
              chart: indicatorChart,
              chartData,
              indicators,
              selectedIndicators,
              indicatorSeriesRef
            });

            // 渲染所有指標
            indicatorRenderer.renderAllIndicators();

            // 取得指標統計資訊
            const stats = IndicatorDataManager.getIndicatorStats(indicators);
            logger.frontend.chartRender(`Rendered ${stats.totalIndicators} indicators with ${stats.dataPoints} data points`);
          } else {
            logger.frontend.chartRender('No valid indicator data available');
          }
        } catch (error) {
          logger.frontend.chartRender('Failed to render indicators', error);
        }
      }

      // 同步時間軸（在指標渲染完成後）
      if (indicatorChart) {
        // 延遲同步，確保圖表完全載入
        setTimeout(() => {
          ChartConfigManager.syncTimeScales(chart, indicatorChart, timeframe);
        }, 100);
    }

    // 儲存參考
    chartRef.current = chart;
    indicatorChartRef.current = indicatorChart;
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
      if (indicatorChartContainerRef.current && indicatorChartRef.current) {
        try {
          indicatorChartRef.current.applyOptions({
            width: indicatorChartContainerRef.current.clientWidth,
          });
        } catch (error) {
          logger.frontend.chartRender('Indicator resize error', error);
        }
      }
    };

    // 十字線移動事件：更新 OHLC、成交量與指標值
    const handleCrosshairMove = (param: any) => {
      if (!param || !param.time) {
        setHoverInfo(null);
        return;
      }
      const ohlc = (param.seriesData && seriesRef.current) ? (param.seriesData.get(seriesRef.current as any) || {}) : {};
      const vol = volumeSeriesRef.current ? (param.seriesData.get(volumeSeriesRef.current as any) || {}) : {};

      const info: any = {
        time: param.time,
        o: ohlc.open,
        h: ohlc.high,
        l: ohlc.low,
        c: ohlc.close,
        v: vol.value,
        indicators: {},
      };

      Object.entries(indicatorSeriesRef.current).forEach(([key, s]) => {
        const val = param.seriesData.get(s as any);
        if (val && typeof (val as any).value !== 'undefined') {
          (info.indicators as any)[key] = (val as any).value;
        }
      });

      setHoverInfo(info);
    };

    // 添加事件監聽器
    window.addEventListener('resize', handleResize);
    chart.subscribeCrosshairMove(handleCrosshairMove);
    if (indicatorChart) {
      indicatorChart.subscribeCrosshairMove(handleCrosshairMove);
    }

    return () => {
      // 移除事件監聽器
      window.removeEventListener('resize', handleResize);
      try { chart.unsubscribeCrosshairMove(handleCrosshairMove); } catch {}
      if (indicatorChart) {
        try { indicatorChart.unsubscribeCrosshairMove(handleCrosshairMove); } catch {}
      }

        // 清理時間軸同步
        if (indicatorChart) {
          ChartConfigManager.cleanupTimeScaleSync(chart, indicatorChart);
      }

      if (chartRef.current) {
        try {
          chartRef.current.remove();
          chartRef.current = null;
        } catch (error) {
          logger.frontend.chartRender('Chart already disposed in cleanup', error);
          chartRef.current = null;
        }
      }
      if (indicatorChartRef.current) {
        try {
          indicatorChartRef.current.remove();
          indicatorChartRef.current = null;
        } catch (error) {
          logger.frontend.chartRender('Indicator chart already disposed in cleanup', error);
          indicatorChartRef.current = null;
        }
      }
    };
    };

    // 呼叫初始化函數
    initializeChart();
  }, [data, selectedIndicators, timeframe, market, symbol]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">無資料可顯示</div>
          <div className="text-gray-400 text-sm">請檢查股票代碼是否正確或是否有交易資料</div>
        </div>
      </div>
    );
  }

  const dataRangeInfo = DataTransformer.getDataRangeInfo(data);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {getStockName(market, symbol)}
        </h2>
        <p className="text-sm text-gray-600">
          資料期間: {dataRangeInfo.dateRange} ({dataRangeInfo.totalRecords} 筆資料)
          {timeframe !== '1d' && ` • ${ChartConfigManager.getTimeframeDisplayName(timeframe)}`}
        </p>
      </div>
      
      {/* K線圖表 */}
      <div 
        ref={chartContainerRef} 
        className="w-full h-[400px] border border-gray-200 rounded-lg overflow-hidden mb-4"
      />

      {/* 技術指標圖表 */}
      {selectedIndicators.length > 0 && (
        <div 
          ref={indicatorChartContainerRef} 
          className="w-full h-[250px] border border-gray-200 rounded-lg overflow-hidden mb-4"
        />
      )}

      {/* 十字線資訊面板 */}
      <div className="mt-3 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
        {(() => {
          const last = data[data.length - 1];
          const show = hoverInfo || {
            o: last?.open,
            h: last?.high,
            l: last?.low,
            c: last?.close,
            v: last?.volume,
            indicators: {},
          };
          return (
            <>
              <span>O: {typeof show.o === 'number' ? show.o.toFixed(2) : '-'}</span>
              <span>H: {typeof show.h === 'number' ? show.h.toFixed(2) : '-'}</span>
              <span>L: {typeof show.l === 'number' ? show.l.toFixed(2) : '-'}</span>
              <span>C: {typeof show.c === 'number' ? show.c.toFixed(2) : '-'}</span>
              <span>Vol: {typeof show.v === 'number' ? (show.v >= 1000 ? (show.v / 1000).toFixed(1) + 'K' : Math.round(show.v)) : '-'}</span>

              {selectedIndicators.includes('MACD') && (
                <>
                  <span>MACD: {show.indicators?.['MACD'] ? Number(show.indicators['MACD']).toFixed(4) : '-'}</span>
                  <span>Signal: {show.indicators?.['Signal'] ? Number(show.indicators['Signal']).toFixed(4) : '-'}</span>
                  <span>Hist: {show.indicators?.['Histogram'] ? Number(show.indicators['Histogram']).toFixed(4) : '-'}</span>
                </>
              )}
              {selectedIndicators.includes('RSI') && (
                <span>RSI: {show.indicators?.['RSI'] ? Number(show.indicators['RSI']).toFixed(2) : '-'}</span>
              )}
              {selectedIndicators.includes('STOCH') && (
                <>
                  <span>Stoch-K: {show.indicators?.['Stoch-K'] ? Number(show.indicators['Stoch-K']).toFixed(2) : '-'}</span>
                  <span>Stoch-D: {show.indicators?.['Stoch-D'] ? Number(show.indicators['Stoch-D']).toFixed(2) : '-'}</span>
                </>
              )}
              {selectedIndicators.includes('CCI') && (
                <span>CCI: {show.indicators?.['CCI'] ? Number(show.indicators['CCI']).toFixed(2) : '-'}</span>
              )}
              {selectedIndicators.includes('ATR') && (
                <span>ATR: {show.indicators?.['ATR'] ? Number(show.indicators['ATR']).toFixed(2) : '-'}</span>
              )}
              {selectedIndicators.includes('ADX') && (
                <span>ADX: {show.indicators?.['ADX'] ? Number(show.indicators['ADX']).toFixed(2) : '-'}</span>
              )}
              {selectedIndicators.includes('OBV') && (
                <span>OBV: {show.indicators?.['OBV'] ? Number(show.indicators['OBV']).toFixed(0) : '-'}</span>
              )}
              {selectedIndicators.includes('KDJ') && (
                <>
                  <span>K: {show.indicators?.['KDJ-K'] ? Number(show.indicators['KDJ-K']).toFixed(2) : '-'}</span>
                  <span>D: {show.indicators?.['KDJ-D'] ? Number(show.indicators['KDJ-D']).toFixed(2) : '-'}</span>
                  <span>J: {show.indicators?.['KDJ-J'] ? Number(show.indicators['KDJ-J']).toFixed(2) : '-'}</span>
                </>
              )}
            </>
          );
        })()}
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p>• 綠色表示上漲，紅色表示下跌</p>
        <p>• 可使用滑鼠拖拽移動圖表，滾輪縮放</p>
        <p>• 滑鼠懸停顯示十字線和詳細資訊</p>
      </div>
    </div>
  );
}