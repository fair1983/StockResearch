'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';
import { Candle } from '@/types';
import { logger } from '@/lib/logger';
import { calculateAllIndicators } from '@/lib/technical-indicators';
import { IndicatorType } from './TechnicalIndicators';
import { getStockName } from '@/lib/stock-utils';

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
  // X軸標籤格式：yyyy MM/dd
  const formatXAxisLabel = (time: number) => {
    const date = new Date(time * 1000);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year} ${month}/${day}`;
  };

  // 十字線下方格式：yyyy MM/dd HH:mm
  const formatCrosshairLabel = (time: number) => {
    const date = new Date(time * 1000);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year} ${month}/${day} ${hours}:${minutes}`;
  };

  switch (timeframe) {
    case '1m':
    case '5m':
    case '15m':
    case '30m':
    case '60m':
      return {
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: formatXAxisLabel,
        crosshairLabelFormatter: formatCrosshairLabel,
      };
    case '1w':
      return {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: formatXAxisLabel,
        crosshairLabelFormatter: formatCrosshairLabel,
      };
    case '1M':
      return {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: formatXAxisLabel,
        crosshairLabelFormatter: formatCrosshairLabel,
      };
    case '1d':
    default:
      return {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: formatXAxisLabel,
        crosshairLabelFormatter: formatCrosshairLabel,
      };
  }
}

interface PriceChartProps {
  data: Candle[];
  symbol: string;
  market: string;
  timeframe?: string; // 新增時間框架參數
  selectedIndicators?: IndicatorType[]; // 新增技術指標參數
  isMainChart?: boolean; // 是否為主圖表
}

export default function PriceChart({ data, symbol, market, timeframe = '1d', selectedIndicators = [], isMainChart = true }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const indicatorChartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const indicatorChartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRef = useRef<{ [key: string]: ISeriesApi<'Line'> | ISeriesApi<'Histogram'> }>({});
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [hoverInfo, setHoverInfo] = useState<any>(null);

  useEffect(() => {
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

    // 確保容器存在且沒有舊圖表
    if (!chartContainerRef.current || chartRef.current) {
      return;
    }

    // 建立K線圖表
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
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
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
        },
        handleScale: {
          mouseWheel: true,
          axisPressedMouseMove: true,
          pinch: true,
        },
        autoScale: true,
        autoScaleInfoProvider: () => ({
          priceRange: null,
          margins: null,
        }),
      },
      timeScale: {
        borderColor: '#cccccc',
        ...getTimeScaleOptions(timeframe),
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    });

    // 建立技術指標圖表（如果有選擇指標）
    let indicatorChart: IChartApi | null = null;
    if (selectedIndicators.length > 0 && indicatorChartContainerRef.current) {
      indicatorChart = createChart(indicatorChartContainerRef.current, {
        width: indicatorChartContainerRef.current.clientWidth,
        height: 250,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
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
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
          },
          handleScale: {
            mouseWheel: true,
            axisPressedMouseMove: true,
            pinch: true,
          },
          autoScale: true,
        },
        timeScale: {
          borderColor: '#cccccc',
          ...getTimeScaleOptions(timeframe),
          fixLeftEdge: true,
          fixRightEdge: true,
        },
      });
    }

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

    // 檢查數據是否包含有效的時間和價格信息
    const validData = data.filter(candle => 
      candle.time && 
      typeof candle.open === 'number' && 
      typeof candle.high === 'number' && 
      typeof candle.low === 'number' && 
      typeof candle.close === 'number' &&
      !isNaN(candle.open) && 
      !isNaN(candle.high) && 
      !isNaN(candle.low) && 
      !isNaN(candle.close)
    );

    if (validData.length === 0) {
      logger.frontend.chartRender('No valid data available for chart');
      return;
    }

    if (validData.length !== data.length) {
      logger.frontend.chartRender(`Filtered out ${data.length - validData.length} invalid data points`);
    }

    // 轉換資料格式
    const chartData: CandlestickData[] = validData.map(candle => {
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

    // 建立時間對索引的映射，便於十字線查詢各指標值
    const timeToIndex = new Map<number, number>();
    chartData.forEach((d, i) => {
      if (typeof d.time === 'number') {
        timeToIndex.set(d.time as number, i);
      }
    });

    logger.frontend.chartRender('Chart data prepared', { 
      sampleData: chartData.slice(0, 3), 
      dataLength: chartData.length 
    });

    // 設定K線資料
    candlestickSeries.setData(chartData);

    // 計算技術指標
    const indicators = calculateAllIndicators(validData);
    
    // 主圖表：添加基本指標（MA、EMA、BOLL）
    if (isMainChart && selectedIndicators.length > 0 && validData.length > 0 && chart) {
      // 添加移動平均線到主圖表
      if (selectedIndicators.includes('MA')) {
        const ma5Data: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.ma5[i] || NaN
        }));
        const ma10Data: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.ma10[i] || NaN
        }));
        const ma20Data: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.ma20[i] || NaN
        }));
        
        const ma5Series = chart.addLineSeries({ 
          color: '#FF6B6B', 
          lineWidth: 2, 
          title: 'MA5',
          lineStyle: 0
        });
        const ma10Series = chart.addLineSeries({ 
          color: '#4ECDC4', 
          lineWidth: 2, 
          title: 'MA10',
          lineStyle: 0
        });
        const ma20Series = chart.addLineSeries({ 
          color: '#45B7D1', 
          lineWidth: 2, 
          title: 'MA20',
          lineStyle: 0
        });
        
        ma5Series.setData(ma5Data);
        ma10Series.setData(ma10Data);
        ma20Series.setData(ma20Data);
      }
      
      // 添加指數移動平均線到主圖表
      if (selectedIndicators.includes('EMA')) {
        const ema12Data: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.ema12[i] || NaN
        }));
        const ema26Data: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.ema26[i] || NaN
        }));
        
        const ema12Series = chart.addLineSeries({ 
          color: '#FF6B6B', 
          lineWidth: 2, 
          title: 'EMA12',
          lineStyle: 0
        });
        const ema26Series = chart.addLineSeries({ 
          color: '#4ECDC4', 
          lineWidth: 2, 
          title: 'EMA26',
          lineStyle: 0
        });
        
        ema12Series.setData(ema12Data);
        ema26Series.setData(ema26Data);
      }
      
      // 添加布林通道到主圖表
      if (selectedIndicators.includes('BOLL')) {
        const upperData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.bollinger.upper[i] || NaN
        }));
        const middleData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.bollinger.middle[i] || NaN
        }));
        const lowerData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.bollinger.lower[i] || NaN
        }));
        
        const upperSeries = chart.addLineSeries({ 
          color: '#96CEB4', 
          lineWidth: 1, 
          title: 'BOLL Upper',
          lineStyle: 0
        });
        const middleSeries = chart.addLineSeries({ 
          color: '#96CEB4', 
          lineWidth: 1, 
          title: 'BOLL Middle',
          lineStyle: 0
        });
        const lowerSeries = chart.addLineSeries({ 
          color: '#96CEB4', 
          lineWidth: 1, 
          title: 'BOLL Lower',
          lineStyle: 0
        });
        
        upperSeries.setData(upperData);
        middleSeries.setData(middleData);
        lowerSeries.setData(lowerData);
      }
    }
    
    // 技術指標圖表：添加其他指標
    if (!isMainChart && selectedIndicators.length > 0 && validData.length > 0 && indicatorChart) {
      
      // 清除舊的指標線
      Object.values(indicatorSeriesRef.current).forEach(series => {
        try {
          indicatorChart!.removeSeries(series);
        } catch (error) {
          // 忽略已移除的系列錯誤
        }
      });
      indicatorSeriesRef.current = {};
      
      // 技術指標圖表只顯示非基本指標（MACD、RSI、KDJ等）
      // 基本指標（MA、EMA、BOLL）已在主圖表中顯示
      
      // 添加 KDJ 指標到指標圖表
      if (selectedIndicators.includes('KDJ')) {
        const kData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.kdj.k[i] || NaN
        }));
        const dData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.kdj.d[i] || NaN
        }));
        const jData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.kdj.j[i] || NaN
        }));
        
        const kSeries = indicatorChart.addLineSeries({ 
          color: '#FF6B6B', 
          lineWidth: 2, 
          title: 'KDJ-K',
          lineStyle: 0
        });
        const dSeries = indicatorChart.addLineSeries({ 
          color: '#4ECDC4', 
          lineWidth: 2, 
          title: 'KDJ-D',
          lineStyle: 0
        });
        const jSeries = indicatorChart.addLineSeries({ 
          color: '#45B7D1', 
          lineWidth: 2, 
          title: 'KDJ-J',
          lineStyle: 0
        });
        
        kSeries.setData(kData);
        dSeries.setData(dData);
        jSeries.setData(jData);
        
        indicatorSeriesRef.current['KDJ-K'] = kSeries;
        indicatorSeriesRef.current['KDJ-D'] = dSeries;
        indicatorSeriesRef.current['KDJ-J'] = jSeries;
      }
      
      // 添加 MACD 指標到指標圖表
      if (selectedIndicators.includes('MACD')) {
        const macdData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.macd.macd[i] || NaN
        }));
        const signalData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.macd.signal[i] || NaN
        }));
        const histogramData = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.macd.histogram[i] || 0,
          color: indicators.macd.histogram[i] >= 0 ? '#26a69a' : '#ef5350'
        }));
        
        const macdSeries = indicatorChart.addLineSeries({ 
          color: '#FF6B6B', 
          lineWidth: 2, 
          title: 'MACD',
          lineStyle: 0
        });
        const signalSeries = indicatorChart.addLineSeries({ 
          color: '#4ECDC4', 
          lineWidth: 2, 
          title: 'Signal',
          lineStyle: 0
        });
        const histogramSeries = indicatorChart.addHistogramSeries({
          color: '#98D8C8',
          title: 'Histogram',
        });
        
        macdSeries.setData(macdData);
        signalSeries.setData(signalData);
        histogramSeries.setData(histogramData);
        
        indicatorSeriesRef.current['MACD'] = macdSeries;
        indicatorSeriesRef.current['Signal'] = signalSeries;
        indicatorSeriesRef.current['Histogram'] = histogramSeries;
      }
      
      // 添加 RSI 指標到指標圖表
      if (selectedIndicators.includes('RSI')) {
        const rsiData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.rsi[i] || NaN
        }));
        
        const rsiSeries = indicatorChart.addLineSeries({ 
          color: '#FFEAA7', 
          lineWidth: 2, 
          title: 'RSI',
          lineStyle: 0
        });
        
        rsiSeries.setData(rsiData);
        indicatorSeriesRef.current['RSI'] = rsiSeries;
      }
      
      // 添加隨機指標到指標圖表
      if (selectedIndicators.includes('STOCH')) {
        const kData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.stochastic.k[i] || NaN
        }));
        const dData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.stochastic.d[i] || NaN
        }));
        
        const kSeries = indicatorChart.addLineSeries({ 
          color: '#DDA0DD', 
          lineWidth: 2, 
          title: 'Stoch-K',
          lineStyle: 0
        });
        const dSeries = indicatorChart.addLineSeries({ 
          color: '#98D8C8', 
          lineWidth: 2, 
          title: 'Stoch-D',
          lineStyle: 0
        });
        
        kSeries.setData(kData);
        dSeries.setData(dData);
        
        indicatorSeriesRef.current['Stoch-K'] = kSeries;
        indicatorSeriesRef.current['Stoch-D'] = dSeries;
      }
      
      // 添加 CCI 指標到指標圖表
      if (selectedIndicators.includes('CCI')) {
        const cciData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.cci[i] || NaN
        }));
        
        const cciSeries = indicatorChart.addLineSeries({ 
          color: '#F7DC6F', 
          lineWidth: 2, 
          title: 'CCI',
          lineStyle: 0
        });
        
        cciSeries.setData(cciData);
        indicatorSeriesRef.current['CCI'] = cciSeries;
      }
      
      // 添加 ATR 指標到指標圖表
      if (selectedIndicators.includes('ATR')) {
        const atrData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.atr[i] || NaN
        }));
        
        const atrSeries = indicatorChart.addLineSeries({ 
          color: '#BB8FCE', 
          lineWidth: 2, 
          title: 'ATR',
          lineStyle: 0
        });
        
        atrSeries.setData(atrData);
        indicatorSeriesRef.current['ATR'] = atrSeries;
      }
      
      // 添加 ADX 指標到指標圖表
      if (selectedIndicators.includes('ADX')) {
        const adxData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.adx[i] || NaN
        }));
        
        const adxSeries = indicatorChart.addLineSeries({ 
          color: '#85C1E9', 
          lineWidth: 2, 
          title: 'ADX',
          lineStyle: 0
        });
        
        adxSeries.setData(adxData);
        indicatorSeriesRef.current['ADX'] = adxSeries;
      }
      
      // 添加 OBV 指標到指標圖表
      if (selectedIndicators.includes('OBV')) {
        const obvData: LineData[] = chartData.map((candle, i) => ({
          time: candle.time,
          value: indicators.obv[i] || NaN
        }));
        
        const obvSeries = indicatorChart.addLineSeries({ 
          color: '#F8C471', 
          lineWidth: 2, 
          title: 'OBV',
          lineStyle: 0
        });
        
        obvSeries.setData(obvData);
        indicatorSeriesRef.current['OBV'] = obvSeries;
      }
      
      // 添加成交量到指標圖表
      if (selectedIndicators.includes('VOL')) {
        // 計算成交量的最大值，用於比例計算
        const validVolumes = indicators.volume.filter(v => typeof v === 'number' && v > 0);
        const maxVolume = validVolumes.length > 0 ? Math.max(...validVolumes) : 1;
        const volumeData = chartData.map((candle, i) => {
          const volume = indicators.volume[i] || 0;
          // 將成交量轉換為 0-100 的比例值
          const volumeRatio = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
          return {
            time: candle.time,
            value: volumeRatio,
            color: candle.close >= candle.open ? '#26a69a' : '#ef5350'
          };
        });
        
        const volumeSeries = indicatorChart.addHistogramSeries({
          color: '#98D8C8',
          priceFormat: {
            type: 'volume',
          },
          title: '成交量 (比例)',
        });
        
        volumeSeries.setData(volumeData);
        indicatorSeriesRef.current['VOL'] = volumeSeries;
        volumeSeriesRef.current = volumeSeries;
      }
    }

         // 儲存參考
    chartRef.current = chart;
    indicatorChartRef.current = indicatorChart;
    seriesRef.current = candlestickSeries;

    // 處理Y軸滾輪縮放
    const handleWheel = (event: WheelEvent) => {
      if (!chartRef.current) return;
      
      // 檢查滑鼠是否在Y軸區域
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = event.clientX - rect.left;
      const chartWidth = rect.width;
      
      // 如果滑鼠在右側Y軸區域（最後20%的寬度）
      if (mouseX > chartWidth * 0.8) {
        event.preventDefault();
        
        const delta = event.deltaY;
        const scale = delta > 0 ? 0.9 : 1.1; // 縮小或放大
        
        // 獲取當前價格範圍
        const priceScale = chartRef.current.priceScale('right');
        if (priceScale && typeof priceScale.getVisiblePriceRange === 'function') {
          try {
            const priceRange = priceScale.getVisiblePriceRange();
            
            if (priceRange && typeof priceRange.minValue === 'function' && typeof priceRange.maxValue === 'function') {
              const center = (priceRange.minValue() + priceRange.maxValue()) / 2;
              const range = priceRange.maxValue() - priceRange.minValue();
              const newRange = range * scale;
              
              // 設定新的價格範圍
              if (typeof priceScale.setVisiblePriceRange === 'function') {
                priceScale.setVisiblePriceRange({
                  minValue: center - newRange / 2,
                  maxValue: center + newRange / 2,
                });
              }
            }
          } catch (error) {
            logger.frontend.chartRender('Price scale zoom error', error);
          }
        }
      }
    };

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
    if (chartContainerRef.current) {
      chartContainerRef.current.addEventListener('wheel', handleWheel, { passive: false });
    }
    window.addEventListener('resize', handleResize);
    chart.subscribeCrosshairMove(handleCrosshairMove);
    if (indicatorChart) {
      indicatorChart.subscribeCrosshairMove(handleCrosshairMove);
    }

    return () => {
      // 移除事件監聽器
      if (chartContainerRef.current) {
        chartContainerRef.current.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('resize', handleResize);
      try { chart.unsubscribeCrosshairMove(handleCrosshairMove); } catch {}
      if (indicatorChart) {
        try { indicatorChart.unsubscribeCrosshairMove(handleCrosshairMove); } catch {}
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
  }, [data, selectedIndicators, timeframe]);

  // 驗證資料
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

  // 檢查數據是否包含有效的時間和價格信息
  const validData = data.filter(candle => 
    candle.time && 
    typeof candle.open === 'number' && 
    typeof candle.high === 'number' && 
    typeof candle.low === 'number' && 
    typeof candle.close === 'number' &&
    !isNaN(candle.open) && 
    !isNaN(candle.high) && 
    !isNaN(candle.low) && 
    !isNaN(candle.close)
  );

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">無有效資料可顯示</div>
          <div className="text-gray-400 text-sm">資料格式錯誤或包含無效值</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* 主圖表：顯示 K 線和基本指標 */}
      {isMainChart && (
        <>
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-gray-800">
              {getStockName(market, symbol)}
            </h2>
            <p className="text-xs text-gray-600">
              {validData[0]?.time} 至 {validData[validData.length - 1]?.time} ({validData.length} 筆)
              {timeframe !== '1d' && ` • ${getTimeframeDisplayName(timeframe)}`}
            </p>
          </div>
          
          {/* K線圖表 */}
          <div 
            ref={chartContainerRef} 
            className="w-full h-full border border-gray-200 rounded-lg overflow-hidden"
          />
        </>
      )}

      {/* 技術指標圖表：只顯示指標 */}
      {!isMainChart && selectedIndicators.length > 0 && (
        <>
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-700">技術指標</h3>
          </div>
          <div 
            ref={indicatorChartContainerRef} 
            className="w-full h-full border border-gray-200 rounded-lg overflow-hidden"
          />
        </>
      )}

      {/* 空狀態 */}
      {!isMainChart && selectedIndicators.length === 0 && (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <p className="text-sm">請選擇技術指標</p>
        </div>
      )}

      {/* 十字線資訊面板 */}
      <div className="mt-3 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
        {(() => {
          const last = validData[validData.length - 1];
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
        <p>• 將滑鼠移到Y軸區域，使用左鍵拖拽調整價格範圍</p>
      </div>
    </div>
  );
}
