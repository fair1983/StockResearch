'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { CandlestickSeries } from 'lightweight-charts';
import { Candle } from '@/types';
import { logger } from '@/lib/logger';
import { IndicatorType } from './TechnicalIndicators';
import { getStockName } from '@/lib/stock-utils';
import { MultiChartIndicatorRenderer, IndicatorData } from './charts/MultiChartIndicatorRenderer';
import { ChartConfigManager } from './charts/ChartConfigManager';
import { DataTransformer } from './charts/DataTransformer';
import { IndicatorDataManager } from './charts/IndicatorDataManager';

interface MultiChartLayoutProps {
  data: Candle[];
  symbol: string;
  market: string;
  timeframe?: string;
  selectedIndicators?: IndicatorType[];
  loading?: boolean; // 添加載入狀態
}

export default function MultiChartLayout({ 
  data, 
  symbol, 
  market, 
  timeframe = '1d', 
  selectedIndicators = [],
  loading = false
}: MultiChartLayoutProps) {
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const volumeChartContainerRef = useRef<HTMLDivElement>(null);
  const obvChartContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartContainerRef = useRef<HTMLDivElement>(null);
  const macdChartContainerRef = useRef<HTMLDivElement>(null);
  const volatilityChartContainerRef = useRef<HTMLDivElement>(null);
  
  const mainChartRef = useRef<IChartApi | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const obvChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const volatilityChartRef = useRef<IChartApi | null>(null);
  
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRef = useRef<{ [key: string]: ISeriesApi<'Line'> | ISeriesApi<'Histogram'> }>({});
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // 時間軸同步相關 refs
  const syncingRef = useRef(false);
  const mainSyncUnsub = useRef<(() => void) | null>(null);
  const childSyncUnsubsRef = useRef<(() => void)[]>([]);

  // memo 化 K 線資料，避免每次只改指標就重算一次 candle 轉換
  const chartData = useMemo(() => {
    if (!DataTransformer.validateData(data)) return null;
    // ✅ 先做 timeframe 歸一化與重採樣
    const resampled = DataTransformer.resampleToTimeframe(data, timeframe);
    // ✅ 圖用的資料也用 resampled（跟指標完全同一份）
    return DataTransformer.transformCandleData(resampled, timeframe);
  }, [data, timeframe]);

  // 時間軸同步相關函數
  const allCharts = () =>
    [mainChartRef.current, volumeChartRef.current, obvChartRef.current, rsiChartRef.current, macdChartRef.current, volatilityChartRef.current]
    .filter(Boolean) as IChartApi[];

  function wireTimeSync(chart: IChartApi) {
    const onLogical = (range: any) => {
      if (!range || syncingRef.current) return;
      syncingRef.current = true;
      allCharts().filter(c => c !== chart).forEach(c => {
        try { 
          c.timeScale().setVisibleLogicalRange({ from: range.from, to: range.to }); 
        } catch {}
      });
      syncingRef.current = false;
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(onLogical);
    return () => {
      try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(onLogical); } catch {}
    };
  }

  function initRangeFromMain(target: IChartApi) {
    const main = mainChartRef.current;
    if (!main) return;
    const lr = main.timeScale().getVisibleLogicalRange?.();
    if (lr) {
      // 安全複製範圍，避免內部物件共用
      target.timeScale().setVisibleLogicalRange({ 
        from: +lr.from, 
        to: +lr.to 
      });
    }
  }

  // 十字線移動事件處理函數
  const handleCrosshairMove = (param: any) => {
    if (!param || !param.time) {
      setHoverInfo(null);
      return;
    }
    const ohlc = (param.seriesData && seriesRef.current) ? (param.seriesData.get(seriesRef.current as any) || {}) : {};

    const info: any = {
      time: param.time,
      o: ohlc.open,
      h: ohlc.high,
      l: ohlc.low,
      c: ohlc.close,
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

  // 分離圖表初始化和指標渲染
  useEffect(() => {
    console.log('🔄 MultiChartLayout 圖表初始化 triggered:', {
      dataLength: data.length,
      timeframe,
      market,
      symbol,
      loading,
      isInitializing
    });
    
    // 如果正在載入、沒有資料或正在初始化，不初始化圖表
    if (loading || !data || data.length === 0 || isInitializing) {
      console.log('⏳ 跳過圖表初始化：載入中、無資料或正在初始化');
      return;
    }
    
    const initializeCharts = async () => {
      if (!mainChartContainerRef.current) return;
      
      setIsInitializing(true);
      console.log('🚀 開始圖表初始化...');

      // 清理舊的圖表
      console.log('🧹 開始清理舊圖表...');
      [mainChartRef, volumeChartRef, obvChartRef, rsiChartRef, macdChartRef, volatilityChartRef].forEach(chartRef => {
        if (chartRef.current) {
          try {
            console.log('🗑️ 清理圖表實例:', chartRef.current);
            chartRef.current.remove();
            chartRef.current = null;
          } catch (error) {
            console.log('⚠️ 圖表已銷毀或清理失敗:', error);
            chartRef.current = null;
          }
        }
      });
      
      // 清理指標系列引用
      console.log('🧹 清理指標系列引用...');
      Object.values(indicatorSeriesRef.current).forEach(series => {
        try {
          // 嘗試從所有可能的圖表移除系列
          [mainChartRef, volumeChartRef, obvChartRef, rsiChartRef, macdChartRef, volatilityChartRef].forEach(chartRef => {
            if (chartRef.current) {
              try {
                chartRef.current.removeSeries(series);
              } catch {}
            }
          });
        } catch (error) {
          console.log('⚠️ 清理指標系列失敗:', error);
        }
      });
      indicatorSeriesRef.current = {};

      // 驗證資料
      if (!DataTransformer.validateData(data)) {
        logger.frontend.chartRender('No data available for chart');
        setIsInitializing(false);            // ← 提早終止也要復位
        return;
      }

      // 使用 memo 化的 chartData
      if (!chartData) {
        logger.frontend.chartRender('No valid chart data available');
        setIsInitializing(false);
        return;
      }
      const dataRangeInfo = DataTransformer.getDataRangeInfo(data);

      logger.frontend.chartRender('Chart data prepared', { 
        sampleData: chartData.slice(0, 3), 
        dataLength: chartData.length,
        dataRange: dataRangeInfo.dateRange
      });

      // 建立主圖表（K線圖）
      const mainChart = createChart(mainChartContainerRef.current, 
        ChartConfigManager.getMainChartConfig(
          mainChartContainerRef.current.clientWidth,
          400,
          timeframe
        )
      );

      // 圖表創建現在由專門的指標 useEffect 動態處理

      // 建立 K 線圖系列
      const candlestickSeries = mainChart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      
      // 設定K線資料
      candlestickSeries.setData(chartData);
      
      // 設定主圖初始顯示範圍
      ChartConfigManager.setInitialTimeRange(mainChart, timeframe, chartData.length);

      // 指標渲染現在由專門的 useEffect 處理

      // 儲存參考
      mainChartRef.current = mainChart;
      volumeChartRef.current = null; // 由指標 useEffect 動態創建
      obvChartRef.current = null;    // 由指標 useEffect 動態創建
      rsiChartRef.current = null;    // 由指標 useEffect 動態創建
      macdChartRef.current = null;   // 由指標 useEffect 動態創建
      volatilityChartRef.current = null; // 由指標 useEffect 動態創建
      seriesRef.current = candlestickSeries;

      // 先清掉舊的主圖同步
      if (mainSyncUnsub.current) mainSyncUnsub.current();
      mainSyncUnsub.current = wireTimeSync(mainChart);

      // 響應式調整
      const handleResize = () => {
        const charts = [
          { ref: mainChartRef, container: mainChartContainerRef },
          { ref: volumeChartRef, container: volumeChartContainerRef },
          { ref: obvChartRef, container: obvChartContainerRef },
          { ref: rsiChartRef, container: rsiChartContainerRef },
          { ref: macdChartRef, container: macdChartContainerRef },
          { ref: volatilityChartRef, container: volatilityChartContainerRef }
        ];

        charts.forEach(({ ref, container }) => {
          if (container.current && ref.current) {
            try {
              ref.current.applyOptions({
                width: container.current.clientWidth,
              });
            } catch (error) {
              console.log('⚠️ 圖表調整大小失敗:', error);
              // 如果圖表已銷毀，清理引用
              ref.current = null;
            }
          }
        });
      };

      // 使用組件頂層定義的 handleCrosshairMove 函數

      // 添加事件監聽器
      window.addEventListener('resize', handleResize);
      mainChart.subscribeCrosshairMove(handleCrosshairMove);
      // 其他圖表的事件監聽器由指標 useEffect 處理

      // ✅ 這裡就把初始化狀態關掉（很關鍵）
      setIsInitializing(false);
      console.log('✅ 圖表初始化完成（isInitializing=false）');

      return () => {
        // 移除事件監聽器
        window.removeEventListener('resize', handleResize);
        try { mainChart.unsubscribeCrosshairMove(handleCrosshairMove); } catch {}
        // 其他圖表的清理由指標 useEffect 處理

        // 清理主圖同步訂閱
        if (mainSyncUnsub.current) mainSyncUnsub.current();
        mainSyncUnsub.current = null;

        // 清理圖表
        [mainChartRef, volumeChartRef, obvChartRef, rsiChartRef, macdChartRef, volatilityChartRef].forEach(chartRef => {
          if (chartRef.current) {
            try {
              chartRef.current.remove();
            } catch (error) {
              // 如果圖表已經被銷毀，這是正常的
              if (error instanceof Error && error.message.includes('disposed')) {
                console.log('ℹ️ 圖表已經被銷毀');
              } else {
                console.log('⚠️ 圖表清理失敗:', error);
              }
            } finally {
              chartRef.current = null;
            }
          }
        });
        
        setIsInitializing(false);  // 保險：卸載/重建時也復位
        console.log('✅ 圖表清理完成');
      };
    };

    // 呼叫初始化函數
    initializeCharts();
  }, [data, timeframe, market, symbol, loading]); // 添加 loading 依賴

  // 專門處理指標變化的 useEffect
  useEffect(() => {
    console.log('🎯 指標選擇變化 triggered:', {
      selectedIndicators,
      hasMainChart: !!mainChartRef.current,
      dataLength: data.length,
      loading,
      isInitializing,
      isRendering
    });

    // 如果正在載入、初始化或渲染中，跳過指標渲染
    if (loading || isInitializing || isRendering) {
      console.log('⏳ 跳過指標渲染：載入中、初始化中或渲染中');
      return;
    }

    const renderIndicators = async () => {
      // 確保主圖表已經初始化且有資料
      if (!mainChartRef.current || !data || data.length === 0) {
        console.log('⚠️ 主圖表未初始化或無資料，跳過指標渲染');
        return;
      }

      // 確保 chartData 已準備好
      if (!chartData) {
        console.log('⚠️ chartData 未準備好，跳過指標渲染');
        return;
      }
      
      setIsRendering(true);
      console.log('🚀 開始指標渲染...');

      try {
        // 🚿 先清理不再需要的子圖表（容器已不在 DOM）
        const safeUnsubscribe = (chart: IChartApi | null) => {
          if (!chart) return;
          try { chart.unsubscribeCrosshairMove(handleCrosshairMove); } catch {}
        };

        const disposeChart = (ref: React.MutableRefObject<IChartApi | null>, name: string) => {
          if (ref.current) {
            try {
              safeUnsubscribe(ref.current);
              // 使用 try-catch 來安全地移除圖表
              ref.current.remove();
            } catch (error) {
              // 如果圖表已經被銷毀，這是正常的，不需要報錯
              if (error instanceof Error && error.message.includes('disposed')) {
                console.log(`ℹ️ 圖表 ${name} 已經被銷毀`);
              } else {
                console.log(`⚠️ 銷毀子圖表 ${name} 時發生錯誤:`, error);
              }
            } finally {
              ref.current = null;
              console.log(`🗑️ 已銷毀子圖表: ${name}`);
            }
          }
        };

        // volume: 只有 VOL 不選 -> 銷毀
        if (!selectedIndicators.includes('VOL') && volumeChartRef.current) {
          disposeChart(volumeChartRef, 'volume');
        }

        // obv: 只有 OBV 不選 -> 銷毀
        if (!selectedIndicators.includes('OBV') && obvChartRef.current) {
          disposeChart(obvChartRef, 'obv');
        }

        // rsi-osc: RSI/KDJ/STOCH/CCI 全不選 -> 銷毀
        if (!selectedIndicators.some(i => i === 'RSI' || i === 'KDJ' || i === 'STOCH' || i === 'CCI') && rsiChartRef.current) {
          disposeChart(rsiChartRef, 'oscillator');
        }

        // volatility: ATR/ADX 皆不選 -> 銷毀
        if (!selectedIndicators.some(i => i === 'ATR' || i === 'ADX') && volatilityChartRef.current) {
          disposeChart(volatilityChartRef, 'volatility');
        }

        // macd: 不選 -> 銷毀
        if (!selectedIndicators.includes('MACD') && macdChartRef.current) {
          disposeChart(macdChartRef, 'macd');
        }

        // 動態創建所需的圖表
        let volumeChart: IChartApi | null = volumeChartRef.current;
        let obvChart: IChartApi | null = obvChartRef.current;
        let rsiChart: IChartApi | null = rsiChartRef.current;
        let macdChart: IChartApi | null = macdChartRef.current;
        
        console.log('🔍 圖表創建前檢查:', {
          selectedIndicators,
          volumeChartExists: !!volumeChart,
          obvChartExists: !!obvChart,
          rsiChartExists: !!rsiChart,
          macdChartExists: !!macdChart,
          volatilityChartExists: !!volatilityChartRef.current
        });

        // 根據選中的指標動態創建圖表
        if (selectedIndicators.includes('VOL') && !volumeChart) {
          if (!volumeChartContainerRef.current) {
            console.log('⏸️ volume 容器尚未掛載，跳過本輪創建');
          } else {
            volumeChart = createChart(volumeChartContainerRef.current, 
              ChartConfigManager.getIndicatorChartConfig(
                volumeChartContainerRef.current.clientWidth,
                150,
                timeframe
              )
            );
            volumeChartRef.current = volumeChart;
            
            // 對齊主圖時間軸並綁定同步
            initRangeFromMain(volumeChart);
            childSyncUnsubsRef.current.push(wireTimeSync(volumeChart));
          }
        }

        // 創建 OBV 圖表（獨立子圖）
        if (selectedIndicators.includes('OBV') && !obvChart) {
          if (!obvChartContainerRef.current) {
            console.log('⏸️ obv 容器尚未掛載，跳過本輪創建');
          } else {
            obvChart = createChart(obvChartContainerRef.current, 
              ChartConfigManager.getIndicatorChartConfig(
                obvChartContainerRef.current.clientWidth,
                150,
                timeframe
              )
            );
            obvChartRef.current = obvChart;
            
            // 對齊主圖時間軸並綁定同步
            initRangeFromMain(obvChart);
            childSyncUnsubsRef.current.push(wireTimeSync(obvChart));
          }
        }

        // 創建振盪器圖表（動量指標）
        if ((selectedIndicators.includes('RSI') || selectedIndicators.includes('KDJ') || 
            selectedIndicators.includes('STOCH') || selectedIndicators.includes('CCI')) && !rsiChart) {
          if (!rsiChartContainerRef.current) {
            console.log('⏸️ rsi 容器尚未掛載，跳過本輪創建');
          } else {
            rsiChart = createChart(rsiChartContainerRef.current, 
              ChartConfigManager.getIndicatorChartConfig(
                rsiChartContainerRef.current.clientWidth,
                150,
                timeframe
              )
            );
            rsiChartRef.current = rsiChart;
            
            // 對齊主圖時間軸並綁定同步
            initRangeFromMain(rsiChart);
            childSyncUnsubsRef.current.push(wireTimeSync(rsiChart));
          }
        }

        // 創建波動圖表（波動指標）
        let volatilityChart: IChartApi | null = volatilityChartRef.current;
        if ((selectedIndicators.includes('ATR') || selectedIndicators.includes('ADX')) && !volatilityChart) {
          if (!volatilityChartContainerRef.current) {
            console.log('⏸️ volatility 容器尚未掛載，跳過本輪創建');
          } else {
            volatilityChart = createChart(volatilityChartContainerRef.current, 
              ChartConfigManager.getIndicatorChartConfig(
                volatilityChartContainerRef.current.clientWidth,
                150,
                timeframe
              )
            );
            volatilityChartRef.current = volatilityChart;
            
            // 對齊主圖時間軸並綁定同步
            initRangeFromMain(volatilityChart);
            childSyncUnsubsRef.current.push(wireTimeSync(volatilityChart));
          }
        }

        if (selectedIndicators.includes('MACD') && !macdChart) {
          if (!macdChartContainerRef.current) {
            console.log('⏸️ macd 容器尚未掛載，跳過本輪創建');
          } else {
            macdChart = createChart(macdChartContainerRef.current, 
              ChartConfigManager.getIndicatorChartConfig(
                macdChartContainerRef.current.clientWidth,
                150,
                timeframe
              )
            );
            macdChartRef.current = macdChart;
            
            // 對齊主圖時間軸並綁定同步
            initRangeFromMain(macdChart);
            childSyncUnsubsRef.current.push(wireTimeSync(macdChart));
          }
        }

        // 獲取並渲染指標
        if (selectedIndicators.length > 0) {
          console.log('🔄 開始獲取指標資料...');
          
          // 轉換資料格式（跟初始化一致）
          const { norm } = DataTransformer.normalizeTimeframe(timeframe);

          // ✅ 先重採樣，確保圖與指標長度一致
          const resampled = DataTransformer.resampleToTimeframe(data, timeframe);
          const chartData = DataTransformer.transformCandleData(resampled, timeframe);

          console.log('📊 資料長度檢查:', {
            originalLength: data.length,
            resampledLength: resampled.length,
            chartDataLength: chartData.length
          });

          // ✅ 指標也用 resampled（不要用原始 data）
          const indicators = await IndicatorDataManager.getIndicatorData(
            market, symbol, norm, /* ← 用標準 timeframe 當作 interval */
            resampled              /* ← 這裡傳重採樣後的資料 */
          );
          
          console.log('✅ 指標資料獲取成功:', {
            hasIndicators: !!indicators,
            indicatorsKeys: Object.keys(indicators || {}),
            selectedIndicators
          });
          
          // 驗證指標資料
          if (IndicatorDataManager.validateIndicatorData(indicators)) {
            // 檢查主圖表是否仍然有效
            if (!mainChartRef.current) {
              console.log('⚠️ 主圖表已銷毀，跳過指標渲染');
              return;
            }

            // 使用多圖表指標渲染器
            const indicatorRenderer = new MultiChartIndicatorRenderer({
              mainChart: mainChartRef.current,
              volumeChart: volumeChart || mainChartRef.current,
              obvChart: obvChart || mainChartRef.current,
              rsiChart: rsiChart || mainChartRef.current,
              macdChart: macdChart || mainChartRef.current,
              volatilityChart: volatilityChart || mainChartRef.current,
              chartData,
              indicators,
              selectedIndicators,
              indicatorSeriesRef
            });

            // 渲染所有指標
            indicatorRenderer.renderAllIndicators();
            
            console.log('🎨 指標渲染完成，當前指標:', selectedIndicators);
            console.log('📊 指標系列引用:', Object.keys(indicatorSeriesRef.current));

            // 為新創建的圖表添加事件監聽器
            if (volumeChart) {
              try { volumeChart.subscribeCrosshairMove(handleCrosshairMove); } catch {}
            }
            if (obvChart) {
              try { obvChart.subscribeCrosshairMove(handleCrosshairMove); } catch {}
            }
            if (rsiChart) {
              try { rsiChart.subscribeCrosshairMove(handleCrosshairMove); } catch {}
            }
            if (macdChart) {
              try { macdChart.subscribeCrosshairMove(handleCrosshairMove); } catch {}
            }
            if (volatilityChart) {
              try { volatilityChart.subscribeCrosshairMove(handleCrosshairMove); } catch {}
            }
          } else {
            console.log('❌ 指標資料驗證失敗');
          }
        } else {
          // 如果沒有選中任何指標，清理所有指標
          console.log('🧹 清理所有指標...');
          Object.values(indicatorSeriesRef.current).forEach(series => {
            try {
              mainChartRef.current?.removeSeries(series);
              volumeChartRef.current?.removeSeries(series);
              rsiChartRef.current?.removeSeries(series);
              macdChartRef.current?.removeSeries(series);
              volatilityChartRef.current?.removeSeries(series);
            } catch {}
          });
          indicatorSeriesRef.current = {};
          
          // 清理圖表引用
          volumeChartRef.current = null;
          obvChartRef.current = null;
          rsiChartRef.current = null;
          macdChartRef.current = null;
          volatilityChartRef.current = null;
        }
      } catch (error) {
        console.error('❌ 指標渲染失敗:', error);
        // 渲染失敗時清空殘留的指標系列引用
        indicatorSeriesRef.current = {};
      } finally {
        setIsRendering(false);  // ← 確保任何路徑都會復位
        console.log('✅ 指標渲染完成');
      }
    };

    renderIndicators();

    // 清理函數
    return () => {
      // 清理子圖同步訂閱
      childSyncUnsubsRef.current.forEach(fn => fn());
      childSyncUnsubsRef.current = [];
    };
  }, [selectedIndicators, loading, isInitializing]); // 添加 isInitializing 依賴

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <div className="text-gray-500 text-lg mb-2">載入中...</div>
          <div className="text-gray-400 text-sm">正在獲取股票資料</div>
        </div>
      </div>
    );
  }

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
      
      {/* 主圖表（K線圖） */}
      <div 
        ref={mainChartContainerRef} 
        className="w-full h-[400px] border border-gray-200 rounded-lg overflow-hidden mb-2"
      />

      {/* 成交量圖表 */}
      {selectedIndicators.includes('VOL') && (
        <div 
          ref={volumeChartContainerRef} 
          className="w-full h-[150px] border border-gray-200 rounded-lg overflow-hidden mb-2"
        />
      )}

      {/* OBV 圖表 */}
      {selectedIndicators.includes('OBV') && (
        <div 
          ref={obvChartContainerRef} 
          className="w-full h-[150px] border border-gray-200 rounded-lg overflow-hidden mb-2"
        />
      )}

      {/* 振盪器圖表（動量指標） */}
      {(selectedIndicators.includes('RSI') || selectedIndicators.includes('KDJ') || 
        selectedIndicators.includes('STOCH') || selectedIndicators.includes('CCI')) && (
        <div 
          ref={rsiChartContainerRef} 
          className="w-full h-[150px] border border-gray-200 rounded-lg overflow-hidden mb-2"
        />
      )}

      {/* 波動圖表（波動指標） */}
      {(selectedIndicators.includes('ATR') || selectedIndicators.includes('ADX')) && (
        <div 
          ref={volatilityChartContainerRef} 
          className="w-full h-[150px] border border-gray-200 rounded-lg overflow-hidden mb-2"
        />
      )}

      {/* MACD 圖表 */}
      {selectedIndicators.includes('MACD') && (
        <div 
          ref={macdChartContainerRef} 
          className="w-full h-[150px] border border-gray-200 rounded-lg overflow-hidden mb-2"
        />
      )}

      {/* 調試資訊 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500">
          選中指標: {selectedIndicators.join(', ') || '無'}
        </div>
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
            indicators: {},
          };
          return (
            <>
              <span>O: {typeof show.o === 'number' ? show.o.toFixed(2) : '-'}</span>
              <span>H: {typeof show.h === 'number' ? show.h.toFixed(2) : '-'}</span>
              <span>L: {typeof show.l === 'number' ? show.l.toFixed(2) : '-'}</span>
              <span>C: {typeof show.c === 'number' ? show.c.toFixed(2) : '-'}</span>

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
        <p>• 不同類型的指標顯示在對應的圖表區域</p>
      </div>
    </div>
  );
}
