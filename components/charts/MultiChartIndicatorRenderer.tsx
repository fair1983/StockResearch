'use client';

import { IChartApi, ISeriesApi, LineData } from 'lightweight-charts';
import { LineSeries, HistogramSeries } from 'lightweight-charts';
import { logger } from '@/lib/logger';

export interface IndicatorData {
  ma5?: number[];
  ma10?: number[];
  ma20?: number[];
  ema12?: number[];
  ema26?: number[];
  rsi?: number[];
  macd?: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollinger?: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  kdj?: {
    k: number[];
    d: number[];
    j: number[];
  };
  stochastic?: {
    k: number[];
    d: number[];
  };
  cci?: number[];
  atr?: number[];
  adx?: number[];
  obv?: number[];
  volume?: number[];
}

export interface MultiChartIndicatorRendererProps {
  mainChart: IChartApi;           // 主圖表（K線圖）
  volumeChart: IChartApi;         // 成交量圖表
  obvChart: IChartApi;           // OBV 圖表
  rsiChart: IChartApi;           // 振盪器圖表（動量指標）
  macdChart: IChartApi;          // MACD 圖表
  volatilityChart: IChartApi;    // 波動圖表（波動指標）
  chartData: any[];
  indicators: IndicatorData;
  selectedIndicators: string[];
  indicatorSeriesRef: React.MutableRefObject<{ [key: string]: ISeriesApi<'Line'> | ISeriesApi<'Histogram'> }>;
}

export class MultiChartIndicatorRenderer {
  private mainChart: IChartApi;
  private volumeChart: IChartApi;
  private obvChart: IChartApi;
  private rsiChart: IChartApi;
  private macdChart: IChartApi;
  private volatilityChart: IChartApi;
  private chartData: any[];
  private indicators: IndicatorData;
  private selectedIndicators: string[];
  private indicatorSeriesRef: React.MutableRefObject<{ [key: string]: ISeriesApi<'Line'> | ISeriesApi<'Histogram'> }>;

  constructor(props: MultiChartIndicatorRendererProps) {
    this.mainChart = props.mainChart;
    this.volumeChart = props.volumeChart;
    this.obvChart = props.obvChart;
    this.rsiChart = props.rsiChart;
    this.macdChart = props.macdChart;
    this.volatilityChart = props.volatilityChart;
    this.chartData = props.chartData;
    this.indicators = props.indicators;
    this.selectedIndicators = props.selectedIndicators;
    this.indicatorSeriesRef = props.indicatorSeriesRef;
    
    console.log('🏗️ 指標渲染器初始化:', {
      selectedIndicators: this.selectedIndicators,
      hasMainChart: !!this.mainChart,
      hasVolumeChart: !!this.volumeChart,
      hasObvChart: !!this.obvChart,
      hasRsiChart: !!this.rsiChart,
      hasMacdChart: !!this.macdChart,
      hasVolatilityChart: !!this.volatilityChart,
      dataLength: this.chartData.length,
      rsiChartIsMain: this.rsiChart === this.mainChart,
      volumeChartIsMain: this.volumeChart === this.mainChart,
      obvChartIsMain: this.obvChart === this.mainChart,
      macdChartIsMain: this.macdChart === this.mainChart,
      volatilityChartIsMain: this.volatilityChart === this.mainChart
    });
  }

  /**
   * 清除所有指標線
   */
  clearAllIndicators(): void {
    console.log('🧹 開始清理指標:', {
      currentIndicators: Object.keys(this.indicatorSeriesRef.current),
      selectedIndicators: this.selectedIndicators
    });
    
    Object.values(this.indicatorSeriesRef.current).forEach(series => {
      try {
        // 嘗試從所有圖表移除
        try { this.mainChart.removeSeries(series); } catch {}
        try { this.volumeChart.removeSeries(series); } catch {}
        try { this.obvChart.removeSeries(series); } catch {}
        try { this.rsiChart.removeSeries(series); } catch {}
        try { this.macdChart.removeSeries(series); } catch {}
        try { this.volatilityChart.removeSeries(series); } catch {}
      } catch (error) {
        // 忽略已移除的系列錯誤
      }
    });
    this.indicatorSeriesRef.current = {};
    
    console.log('✅ 指標清理完成');
  }

  /**
   * 渲染主圖表指標（與K線重疊的趨勢指標）
   */
  renderMainChartIndicators(): void {
    // 移動平均線 - 顯示在主圖表上
    this.renderMovingAverages();
    
    // 指數移動平均線 - 顯示在主圖表上
    this.renderExponentialMovingAverages();
    
    // 布林通道 - 顯示在主圖表上
    this.renderBollingerBands();
  }

  /**
   * 渲染成交量圖表指標
   */
  renderVolumeChartIndicators(): void {
    // 成交量 - 顯示在成交量圖表上
    this.renderVolume();
  }

  /**
   * 渲染 OBV 圖表指標
   */
  renderOBVChartIndicators(): void {
    // 確保 OBV 圖表存在
    if (this.obvChart === this.mainChart) {
      console.log('⚠️ OBV 圖表未創建，跳過 OBV 圖表指標渲染');
      return;
    }
    
    console.log('🎯 開始渲染 OBV 圖表指標，OBV 圖表已創建');
    
    // OBV - 顯示在 OBV 圖表上
    this.renderOBV();
  }

  /**
   * 渲染振盪器圖表指標（動量指標）
   */
  renderOscillatorChartIndicators(): void {
    // 確保振盪器圖表存在
    if (this.rsiChart === this.mainChart) {
      console.log('⚠️ 振盪器圖表未創建，跳過振盪器圖表指標渲染');
      return;
    }
    
    console.log('🎯 開始渲染振盪器圖表指標，振盪器圖表已創建');
    
    // RSI - 顯示在振盪器圖表上
    this.renderRSI();
    
    // KDJ - 顯示在振盪器圖表上（因為都是 0-100 範圍）
    this.renderKDJ();
    
    // 隨機指標 - 顯示在振盪器圖表上（因為都是 0-100 範圍）
    this.renderStochastic();
    
    // CCI - 顯示在振盪器圖表上
    this.renderCCI();
  }

  /**
   * 渲染 MACD 圖表指標
   */
  renderMACDChartIndicators(): void {
    // 確保 MACD 圖表存在
    if (this.macdChart === this.mainChart) {
      console.log('⚠️ MACD 圖表未創建，跳過 MACD 圖表指標渲染');
      return;
    }
    
    console.log('🎯 開始渲染 MACD 圖表指標，MACD 圖表已創建');
    
    // MACD - 顯示在 MACD 圖表上
    this.renderMACD();
  }

  /**
   * 渲染波動圖表指標（波動指標）
   */
  renderVolatilityChartIndicators(): void {
    // 確保波動圖表存在
    if (this.volatilityChart === this.mainChart) {
      console.log('⚠️ 波動圖表未創建，跳過波動圖表指標渲染');
      return;
    }
    
    console.log('🎯 開始渲染波動圖表指標，波動圖表已創建');
    
    // ATR - 顯示在波動圖表上
    this.renderATR();
    
    // ADX - 顯示在波動圖表上
    this.renderADX();
  }

  /**
   * 渲染移動平均線（主圖表）
   */
  renderMovingAverages(): void {
    if (!this.selectedIndicators.includes('MA')) return;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 開始渲染 MA 指標:', {
        hasMa5: !!this.indicators.ma5,
        ma5Length: this.indicators.ma5?.length,
        hasMa10: !!this.indicators.ma10,
        hasMa20: !!this.indicators.ma20
      });
    }

    const maConfigs = [
      { data: this.indicators.ma5, color: '#FF6B6B', title: 'MA5' },
      { data: this.indicators.ma10, color: '#4ECDC4', title: 'MA10' },
      { data: this.indicators.ma20, color: '#45B7D1', title: 'MA20' }
    ];

    maConfigs.forEach(config => {
      if (config.data) {
        const maData: LineData[] = this.chartData.map((candle, i) => {
          const v = config.data?.[i];
          return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
        }).filter(Boolean) as LineData[];
        
        console.log(`📊 ${config.title} 資料處理:`, {
          originalLength: config.data?.length,
          mappedLength: this.chartData.length,
          filteredLength: maData.length,
          sampleValues: maData.slice(0, 3)
        });

        if (maData.length > 0) {
          console.log(`✅ 渲染 ${config.title}:`, {
            dataLength: maData.length,
            sampleData: maData.slice(0, 3)
          });
          
          const maSeries = this.mainChart.addSeries(LineSeries, {
            color: config.color,
            lineWidth: 2,
            title: config.title
          });
          maSeries.setData(maData);
          this.indicatorSeriesRef.current[config.title] = maSeries;
          console.log(`🎯 ${config.title} 系列已添加到主圖表，當前指標系列:`, Object.keys(this.indicatorSeriesRef.current));
        } else {
          console.log(`❌ ${config.title} 沒有有效資料`);
        }
      }
    });
  }

  /**
   * 渲染指數移動平均線（主圖表）
   */
  renderExponentialMovingAverages(): void {
    if (!this.selectedIndicators.includes('EMA')) return;
    
    console.log('🎯 開始渲染 EMA 指標:', {
      hasEma12: !!this.indicators.ema12,
      ema12Length: this.indicators.ema12?.length,
      hasEma26: !!this.indicators.ema26,
      ema26Length: this.indicators.ema26?.length
    });

    const emaConfigs = [
      { data: this.indicators.ema12, color: '#FF6B6B', title: 'EMA12' },
      { data: this.indicators.ema26, color: '#4ECDC4', title: 'EMA26' }
    ];

    emaConfigs.forEach(config => {
      if (config.data) {
        const emaData: LineData[] = this.chartData.map((candle, i) => {
          const v = config.data?.[i];
          return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
        }).filter(Boolean) as LineData[];

        if (emaData.length > 0) {
          const emaSeries = this.mainChart.addSeries(LineSeries, {
            color: config.color,
            lineWidth: 2,
            title: config.title
          });
          emaSeries.setData(emaData);
          this.indicatorSeriesRef.current[config.title] = emaSeries;
          console.log(`🎯 ${config.title} 系列已添加到主圖表，當前指標系列:`, Object.keys(this.indicatorSeriesRef.current));
        }
      }
    });
  }

  /**
   * 渲染布林通道（主圖表）
   */
  renderBollingerBands(): void {
    if (!this.selectedIndicators.includes('BOLL') || !this.indicators.bollinger) return;
    
    console.log('🎯 開始渲染 BOLL 指標:', {
      hasBollinger: !!this.indicators.bollinger,
      upperLength: this.indicators.bollinger?.upper?.length,
      middleLength: this.indicators.bollinger?.middle?.length,
      lowerLength: this.indicators.bollinger?.lower?.length
    });

    const bollConfigs = [
      { data: this.indicators.bollinger.upper, color: '#FF6B6B', title: 'BOLL Upper' },
      { data: this.indicators.bollinger.middle, color: '#96CEB4', title: 'BOLL Middle' },
      { data: this.indicators.bollinger.lower, color: '#4ECDC4', title: 'BOLL Lower' }
    ];

    bollConfigs.forEach(config => {
      if (config.data) {
        const bollData: LineData[] = this.chartData.map((candle, i) => {
          const v = config.data?.[i];
          return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
        }).filter(Boolean) as LineData[];

        if (bollData.length > 0) {
          const bollSeries = this.mainChart.addSeries(LineSeries, {
            color: config.color,
            lineWidth: config.title === 'BOLL Middle' ? 2 : 1,
            title: config.title
          });
          bollSeries.setData(bollData);
          this.indicatorSeriesRef.current[config.title] = bollSeries;
          console.log(`🎯 ${config.title} 系列已添加到主圖表，當前指標系列:`, Object.keys(this.indicatorSeriesRef.current));
        }
      }
    });
  }

  /**
   * 渲染 ATR（波動圖表）
   */
  renderATR(): void {
    if (!this.selectedIndicators.includes('ATR') || !this.indicators.atr) return;

    console.log('🎯 開始渲染 ATR 指標:', {
      hasAtr: !!this.indicators.atr,
      atrLength: this.indicators.atr?.length
    });

    const atrData: LineData[] = this.chartData.map((candle, i) => {
      const v = this.indicators.atr?.[i];
      return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
    }).filter(Boolean) as LineData[];

    if (atrData.length > 0) {
      const atrSeries = this.volatilityChart.addSeries(LineSeries, {
        color: '#BB8FCE',
        lineWidth: 2,
        title: 'ATR'
      });
      atrSeries.setData(atrData);
      this.indicatorSeriesRef.current['ATR'] = atrSeries;
      
      console.log('🎯 ATR 系列已添加到波動圖表');
    } else {
      console.log('❌ ATR 沒有有效資料');
    }
  }

  /**
   * 渲染 ADX（波動圖表）
   */
  renderADX(): void {
    if (!this.selectedIndicators.includes('ADX') || !this.indicators.adx) return;

    console.log('🎯 開始渲染 ADX 指標:', {
      hasAdx: !!this.indicators.adx,
      adxLength: this.indicators.adx?.length
    });

    const adxData: LineData[] = this.chartData.map((candle, i) => {
      const v = this.indicators.adx?.[i];
      return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
    }).filter(Boolean) as LineData[];

    if (adxData.length > 0) {
      const adxSeries = this.volatilityChart.addSeries(LineSeries, {
        color: '#85C1E9',
        lineWidth: 2,
        title: 'ADX'
      });
      adxSeries.setData(adxData);
      this.indicatorSeriesRef.current['ADX'] = adxSeries;
      
      console.log('🎯 ADX 系列已添加到波動圖表');
    } else {
      console.log('❌ ADX 沒有有效資料');
    }
  }

  /**
   * 渲染成交量（成交量圖表）
   */
  renderVolume(): void {
    if (!this.selectedIndicators.includes('VOL') || !this.indicators.volume) return;

    // 使用實際成交量，不進行換算
    const volumeData = this.chartData.map((candle, i) => {
      const volume = this.indicators.volume![i] || 0;
      return {
        time: candle.time,
        value: volume, // 使用實際成交量
        color: candle.close >= candle.open ? '#26a69a' : '#ef5350'
      };
    }).filter(item => item.value > 0); // 只保留有效的成交量資料

    if (volumeData.length > 0) {
      const volumeSeries = this.volumeChart.addSeries(HistogramSeries, {
        title: '成交量'
      });
      volumeSeries.setData(volumeData);
      this.indicatorSeriesRef.current['VOL'] = volumeSeries;
    }
  }

  /**
   * 渲染 OBV（OBV 圖表）
   */
  renderOBV(): void {
    if (!this.selectedIndicators.includes('OBV') || !this.indicators.obv) return;

    const obvData: LineData[] = this.chartData.map((candle, i) => {
      const v = this.indicators.obv?.[i];
      return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
    }).filter(Boolean) as LineData[];

    if (obvData.length > 0) {
      const obvSeries = this.obvChart.addSeries(LineSeries, {
        color: '#F8C471',
        lineWidth: 2,
        title: 'OBV'
      });
      obvSeries.setData(obvData);
      this.indicatorSeriesRef.current['OBV'] = obvSeries;
    }
  }

  /**
   * 渲染 RSI（RSI 圖表）
   */
  renderRSI(): void {
    if (!this.selectedIndicators.includes('RSI') || !this.indicators.rsi) return;

    console.log('🎯 開始渲染 RSI 指標:', {
      hasRsi: !!this.indicators.rsi,
      rsiLength: this.indicators.rsi?.length
    });

    const rsiData: LineData[] = this.chartData.map((candle, i) => {
      const v = this.indicators.rsi?.[i];
      return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
    }).filter(Boolean) as LineData[];

    if (rsiData.length > 0) {
      const rsiSeries = this.rsiChart.addSeries(LineSeries, {
        color: '#FFEAA7',
        lineWidth: 2,
        title: 'RSI'
      });
      rsiSeries.setData(rsiData);
      this.indicatorSeriesRef.current['RSI'] = rsiSeries;
      
      console.log('🎯 RSI 系列已添加到 RSI 圖表');
    } else {
      console.log('❌ RSI 沒有有效資料');
    }
  }

  /**
   * 渲染 KDJ（RSI 圖表）
   */
  renderKDJ(): void {
    if (!this.selectedIndicators.includes('KDJ') || !this.indicators.kdj) return;

    const kdjConfigs = [
      { data: this.indicators.kdj.k, color: '#FF6B6B', title: 'KDJ-K' },
      { data: this.indicators.kdj.d, color: '#4ECDC4', title: 'KDJ-D' },
      { data: this.indicators.kdj.j, color: '#45B7D1', title: 'KDJ-J' }
    ];

    kdjConfigs.forEach(config => {
      if (config.data) {
        const kdjData: LineData[] = this.chartData.map((candle, i) => {
          const v = config.data?.[i];
          return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
        }).filter(Boolean) as LineData[];

        if (kdjData.length > 0) {
          const kdjSeries = this.rsiChart.addSeries(LineSeries, {
            color: config.color,
            lineWidth: 2,
            title: config.title
          });
          kdjSeries.setData(kdjData);
          this.indicatorSeriesRef.current[config.title] = kdjSeries;
        }
      }
    });
  }

  /**
   * 渲染隨機指標（RSI 圖表）
   */
  renderStochastic(): void {
    if (!this.selectedIndicators.includes('STOCH') || !this.indicators.stochastic) return;

    const stochConfigs = [
      { data: this.indicators.stochastic.k, color: '#DDA0DD', title: 'Stoch-K' },
      { data: this.indicators.stochastic.d, color: '#98D8C8', title: 'Stoch-D' }
    ];

    stochConfigs.forEach(config => {
      if (config.data) {
        const stochData: LineData[] = this.chartData.map((candle, i) => {
          const v = config.data?.[i];
          return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
        }).filter(Boolean) as LineData[];

        if (stochData.length > 0) {
          const stochSeries = this.rsiChart.addSeries(LineSeries, {
            color: config.color,
            lineWidth: 2,
            title: config.title
          });
          stochSeries.setData(stochData);
          this.indicatorSeriesRef.current[config.title] = stochSeries;
        }
      }
    });
  }

  /**
   * 渲染 CCI（RSI 圖表）
   */
  renderCCI(): void {
    if (!this.selectedIndicators.includes('CCI') || !this.indicators.cci) return;

    const cciData: LineData[] = this.chartData.map((candle, i) => {
      const v = this.indicators.cci?.[i];
      return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
    }).filter(Boolean) as LineData[];

    if (cciData.length > 0) {
      const cciSeries = this.rsiChart.addSeries(LineSeries, {
        color: '#F7DC6F',
        lineWidth: 2,
        title: 'CCI'
      });
      cciSeries.setData(cciData);
      this.indicatorSeriesRef.current['CCI'] = cciSeries;
    }
  }

  /**
   * 渲染 MACD（MACD 圖表）
   */
  renderMACD(): void {
    if (!this.selectedIndicators.includes('MACD') || !this.indicators.macd) return;

    // 檢查圖表實例是否有效
    if (!this.macdChart || this.macdChart === this.mainChart) {
      console.log('⚠️ MACD 圖表無效，跳過渲染');
      return;
    }

    console.log('🎯 開始渲染 MACD 指標:', {
      hasMacd: !!this.indicators.macd,
      macdLength: this.indicators.macd?.macd?.length,
      signalLength: this.indicators.macd?.signal?.length,
      histogramLength: this.indicators.macd?.histogram?.length
    });

    try {
      // MACD 線
      const macdData: LineData[] = this.chartData.map((candle, i) => {
        const v = this.indicators.macd?.macd?.[i];
        return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
      }).filter(Boolean) as LineData[];

      if (macdData.length > 0) {
        const macdSeries = this.macdChart.addSeries(LineSeries, {
          color: '#FF6B6B',
          lineWidth: 2,
          title: 'MACD'
        });
        macdSeries.setData(macdData);
        this.indicatorSeriesRef.current['MACD'] = macdSeries;
        console.log('🎯 MACD 線已添加到 MACD 圖表');
          } else {
      console.log('❌ MACD 線沒有有效資料');
    }

    // Signal 線
    const signalData: LineData[] = this.chartData.map((candle, i) => {
      const v = this.indicators.macd?.signal?.[i];
      return Number.isFinite(v) ? { time: candle.time, value: v as number } : null;
    }).filter(Boolean) as LineData[];

    if (signalData.length > 0) {
      const signalSeries = this.macdChart.addSeries(LineSeries, {
        color: '#4ECDC4',
        lineWidth: 2,
        title: 'Signal'
      });
      signalSeries.setData(signalData);
      this.indicatorSeriesRef.current['Signal'] = signalSeries;
      console.log('🎯 Signal 線已添加到 MACD 圖表');
    } else {
      console.log('❌ Signal 線沒有有效資料');
    }

    // Histogram
    const histogramData = this.chartData.map((candle, i) => {
      const v = this.indicators.macd?.histogram?.[i];
      return Number.isFinite(v) ? {
        time: candle.time,
        value: v as number,
        color: (v as number) >= 0 ? '#26a69a' : '#ef5350'
      } : null;
    }).filter(Boolean) as any[];

    if (histogramData.length > 0) {
      const histogramSeries = this.macdChart.addSeries(HistogramSeries, {
        title: 'Histogram'
      });
      histogramSeries.setData(histogramData);
      this.indicatorSeriesRef.current['MACD-Hist'] = histogramSeries;
      console.log('🎯 Histogram 已添加到 MACD 圖表');
    } else {
      console.log('❌ Histogram 沒有有效資料');
    }
    } catch (error) {
      console.error('❌ MACD 渲染失敗:', error);
    }
  }

  /**
   * 渲染所有指標到正確的圖表
   */
  renderAllIndicators(): void {
    // 開發環境調試資訊
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 開始渲染所有指標...');
      console.log('📊 選中的指標:', this.selectedIndicators);
      console.log('📈 指標資料檢查:', {
        hasMa5: !!this.indicators.ma5,
        ma5Length: this.indicators.ma5?.length,
        hasEma12: !!this.indicators.ema12,
        ema12Length: this.indicators.ema12?.length,
        hasBollinger: !!this.indicators.bollinger,
        bollingerUpperLength: this.indicators.bollinger?.upper?.length
      });
      console.log('🎯 圖表實例檢查:', {
        mainChart: !!this.mainChart,
        volumeChart: !!this.volumeChart,
        obvChart: !!this.obvChart,
        rsiChart: !!this.rsiChart,
        macdChart: !!this.macdChart,
        volatilityChart: !!this.volatilityChart
      });
    }
    
    this.clearAllIndicators();

    // 主圖表指標（與K線重疊）
    this.renderMainChartIndicators();
    
    // 成交量圖表指標
    this.renderVolumeChartIndicators();
    
    // OBV 圖表指標
    this.renderOBVChartIndicators();
    
    // 振盪器圖表指標（動量指標）
    this.renderOscillatorChartIndicators();
    
    // 波動圖表指標（波動指標）
    this.renderVolatilityChartIndicators();
    
    // MACD 圖表指標
    this.renderMACDChartIndicators();

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ 指標渲染完成，總共渲染了', Object.keys(this.indicatorSeriesRef.current).length, '個指標');
      console.log('📋 渲染的指標:', Object.keys(this.indicatorSeriesRef.current));
    }
    logger.frontend.chartRender(`Rendered ${Object.keys(this.indicatorSeriesRef.current).length} indicators across multiple charts`);
  }
}
