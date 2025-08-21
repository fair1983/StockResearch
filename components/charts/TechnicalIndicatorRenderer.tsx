'use client';

import { IChartApi, ISeriesApi, LineData } from 'lightweight-charts';
import { LineSeries, HistogramSeries } from 'lightweight-charts';
import { Candle } from '@/types';
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

export interface TechnicalIndicatorRendererProps {
  chart: IChartApi;
  chartData: any[];
  indicators: IndicatorData;
  selectedIndicators: string[];
  indicatorSeriesRef: React.MutableRefObject<{ [key: string]: ISeriesApi<'Line'> | ISeriesApi<'Histogram'> }>;
}

export class TechnicalIndicatorRenderer {
  private chart: IChartApi;
  private chartData: any[];
  private indicators: IndicatorData;
  private selectedIndicators: string[];
  private indicatorSeriesRef: React.MutableRefObject<{ [key: string]: ISeriesApi<'Line'> | ISeriesApi<'Histogram'> }>;

  constructor(props: TechnicalIndicatorRendererProps) {
    this.chart = props.chart;
    this.chartData = props.chartData;
    this.indicators = props.indicators;
    this.selectedIndicators = props.selectedIndicators;
    this.indicatorSeriesRef = props.indicatorSeriesRef;
  }

  /**
   * 清除所有指標線
   */
  clearAllIndicators(): void {
    Object.values(this.indicatorSeriesRef.current).forEach(series => {
      try {
        this.chart.removeSeries(series);
      } catch (error) {
        // 忽略已移除的系列錯誤
      }
    });
    this.indicatorSeriesRef.current = {};
  }

  /**
   * 渲染移動平均線
   */
  renderMovingAverages(): void {
    if (!this.selectedIndicators.includes('MA')) return;

    const maConfigs = [
      { data: this.indicators.ma5, color: '#FF6B6B', title: 'MA5' },
      { data: this.indicators.ma10, color: '#4ECDC4', title: 'MA10' },
      { data: this.indicators.ma20, color: '#45B7D1', title: 'MA20' }
    ];

    maConfigs.forEach(config => {
      if (config.data) {
        const maData: LineData[] = this.chartData.map((candle, i) => ({
          time: candle.time,
          value: config.data![i] && !isNaN(config.data![i]) ? config.data![i] : 0
        })).filter(item => item.value !== 0);

        if (maData.length > 0) {
          const maSeries = this.chart.addSeries(LineSeries, {
            color: config.color,
            lineWidth: 2,
            title: config.title
          });
          maSeries.setData(maData);
          this.indicatorSeriesRef.current[config.title] = maSeries;
        }
      }
    });
  }

  /**
   * 渲染指數移動平均線
   */
  renderExponentialMovingAverages(): void {
    if (!this.selectedIndicators.includes('EMA')) return;

    const emaConfigs = [
      { data: this.indicators.ema12, color: '#FF6B6B', title: 'EMA12' },
      { data: this.indicators.ema26, color: '#4ECDC4', title: 'EMA26' }
    ];

    emaConfigs.forEach(config => {
      if (config.data) {
        const emaData: LineData[] = this.chartData.map((candle, i) => ({
          time: candle.time,
          value: config.data![i] && !isNaN(config.data![i]) ? config.data![i] : 0
        })).filter(item => item.value !== 0);

        if (emaData.length > 0) {
          const emaSeries = this.chart.addSeries(LineSeries, {
            color: config.color,
            lineWidth: 2,
            title: config.title
          });
          emaSeries.setData(emaData);
          this.indicatorSeriesRef.current[config.title] = emaSeries;
        }
      }
    });
  }

  /**
   * 渲染布林通道
   */
  renderBollingerBands(): void {
    if (!this.selectedIndicators.includes('BOLL') || !this.indicators.bollinger) return;

    const bollConfigs = [
      { data: this.indicators.bollinger.upper, color: '#FFEAA7', title: 'BOLL Upper' },
      { data: this.indicators.bollinger.middle, color: '#96CEB4', title: 'BOLL Middle' },
      { data: this.indicators.bollinger.lower, color: '#FFEAA7', title: 'BOLL Lower' }
    ];

    bollConfigs.forEach(config => {
      if (config.data) {
        const bollData: LineData[] = this.chartData.map((candle, i) => ({
          time: candle.time,
          value: config.data![i] && !isNaN(config.data![i]) ? config.data![i] : 0
        })).filter(item => item.value !== 0);

        if (bollData.length > 0) {
          const bollSeries = this.chart.addSeries(LineSeries, {
            color: config.color,
            lineWidth: config.title === 'BOLL Middle' ? 2 : 1,
            title: config.title
          });
          bollSeries.setData(bollData);
          this.indicatorSeriesRef.current[config.title] = bollSeries;
        }
      }
    });
  }

  /**
   * 渲染 RSI
   */
  renderRSI(): void {
    if (!this.selectedIndicators.includes('RSI') || !this.indicators.rsi) return;

    const rsiData: LineData[] = this.chartData.map((candle, i) => ({
      time: candle.time,
      value: this.indicators.rsi![i] && !isNaN(this.indicators.rsi![i]) ? this.indicators.rsi![i] : 0
    })).filter(item => item.value !== 0);

    if (rsiData.length > 0) {
      const rsiSeries = this.chart.addSeries(LineSeries, {
        color: '#FFEAA7',
        lineWidth: 2,
        title: 'RSI'
      });
      rsiSeries.setData(rsiData);
      this.indicatorSeriesRef.current['RSI'] = rsiSeries;
    }
  }

  /**
   * 渲染 MACD
   */
  renderMACD(): void {
    if (!this.selectedIndicators.includes('MACD') || !this.indicators.macd) return;

    // MACD 線
    const macdData: LineData[] = this.chartData.map((candle, i) => ({
      time: candle.time,
      value: this.indicators.macd!.macd[i] && !isNaN(this.indicators.macd!.macd[i]) ? this.indicators.macd!.macd[i] : 0
    })).filter(item => item.value !== 0);

    if (macdData.length > 0) {
      const macdSeries = this.chart.addSeries(LineSeries, {
        color: '#FF6B6B',
        lineWidth: 2,
        title: 'MACD'
      });
      macdSeries.setData(macdData);
      this.indicatorSeriesRef.current['MACD'] = macdSeries;
    }

    // Signal 線
    const signalData: LineData[] = this.chartData.map((candle, i) => ({
      time: candle.time,
      value: this.indicators.macd!.signal[i] && !isNaN(this.indicators.macd!.signal[i]) ? this.indicators.macd!.signal[i] : 0
    })).filter(item => item.value !== 0);

    if (signalData.length > 0) {
      const signalSeries = this.chart.addSeries(LineSeries, {
        color: '#4ECDC4',
        lineWidth: 2,
        title: 'Signal'
      });
      signalSeries.setData(signalData);
      this.indicatorSeriesRef.current['Signal'] = signalSeries;
    }

    // Histogram
    const histogramData = this.chartData.map((candle, i) => ({
      time: candle.time,
      value: this.indicators.macd!.histogram[i] && !isNaN(this.indicators.macd!.histogram[i]) ? this.indicators.macd!.histogram[i] : 0,
      color: this.indicators.macd!.histogram[i] >= 0 ? '#26a69a' : '#ef5350'
    })).filter(item => item.value !== 0);

    if (histogramData.length > 0) {
      const histogramSeries = this.chart.addSeries(HistogramSeries, {
        title: 'Histogram'
      });
      histogramSeries.setData(histogramData);
      this.indicatorSeriesRef.current['Histogram'] = histogramSeries;
    }
  }

  /**
   * 渲染 KDJ
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
        const kdjData: LineData[] = this.chartData.map((candle, i) => ({
          time: candle.time,
          value: config.data![i] && !isNaN(config.data![i]) ? config.data![i] : 0
        })).filter(item => item.value !== 0);

        if (kdjData.length > 0) {
          const kdjSeries = this.chart.addSeries(LineSeries, {
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
   * 渲染隨機指標
   */
  renderStochastic(): void {
    if (!this.selectedIndicators.includes('STOCH') || !this.indicators.stochastic) return;

    const stochConfigs = [
      { data: this.indicators.stochastic.k, color: '#DDA0DD', title: 'Stoch-K' },
      { data: this.indicators.stochastic.d, color: '#98D8C8', title: 'Stoch-D' }
    ];

    stochConfigs.forEach(config => {
      if (config.data) {
        const stochData: LineData[] = this.chartData.map((candle, i) => ({
          time: candle.time,
          value: config.data![i] && !isNaN(config.data![i]) ? config.data![i] : 0
        })).filter(item => item.value !== 0);

        if (stochData.length > 0) {
          const stochSeries = this.chart.addSeries(LineSeries, {
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
   * 渲染 CCI
   */
  renderCCI(): void {
    if (!this.selectedIndicators.includes('CCI') || !this.indicators.cci) return;

    const cciData: LineData[] = this.chartData.map((candle, i) => ({
      time: candle.time,
      value: this.indicators.cci![i] && !isNaN(this.indicators.cci![i]) ? this.indicators.cci![i] : 0
    })).filter(item => item.value !== 0);

    if (cciData.length > 0) {
      const cciSeries = this.chart.addSeries(LineSeries, {
        color: '#F7DC6F',
        lineWidth: 2,
        title: 'CCI'
      });
      cciSeries.setData(cciData);
      this.indicatorSeriesRef.current['CCI'] = cciSeries;
    }
  }

  /**
   * 渲染 ATR
   */
  renderATR(): void {
    if (!this.selectedIndicators.includes('ATR') || !this.indicators.atr) return;

    const atrData: LineData[] = this.chartData.map((candle, i) => ({
      time: candle.time,
      value: this.indicators.atr![i] && !isNaN(this.indicators.atr![i]) ? this.indicators.atr![i] : 0
    })).filter(item => item.value !== 0);

    if (atrData.length > 0) {
      const atrSeries = this.chart.addSeries(LineSeries, {
        color: '#BB8FCE',
        lineWidth: 2,
        title: 'ATR'
      });
      atrSeries.setData(atrData);
      this.indicatorSeriesRef.current['ATR'] = atrSeries;
    }
  }

  /**
   * 渲染 ADX
   */
  renderADX(): void {
    if (!this.selectedIndicators.includes('ADX') || !this.indicators.adx) return;

    const adxData: LineData[] = this.chartData.map((candle, i) => ({
      time: candle.time,
      value: this.indicators.adx![i] && !isNaN(this.indicators.adx![i]) ? this.indicators.adx![i] : 0
    })).filter(item => item.value !== 0);

    if (adxData.length > 0) {
      const adxSeries = this.chart.addSeries(LineSeries, {
        color: '#85C1E9',
        lineWidth: 2,
        title: 'ADX'
      });
      adxSeries.setData(adxData);
      this.indicatorSeriesRef.current['ADX'] = adxSeries;
    }
  }

  /**
   * 渲染 OBV
   */
  renderOBV(): void {
    if (!this.selectedIndicators.includes('OBV') || !this.indicators.obv) return;

    const obvData: LineData[] = this.chartData.map((candle, i) => ({
      time: candle.time,
      value: this.indicators.obv![i] && !isNaN(this.indicators.obv![i]) ? this.indicators.obv![i] : 0
    })).filter(item => item.value !== 0);

    if (obvData.length > 0) {
      const obvSeries = this.chart.addSeries(LineSeries, {
        color: '#F8C471',
        lineWidth: 2,
        title: 'OBV'
      });
      obvSeries.setData(obvData);
      this.indicatorSeriesRef.current['OBV'] = obvSeries;
    }
  }

  /**
   * 渲染成交量
   */
  renderVolume(): void {
    if (!this.selectedIndicators.includes('VOL') || !this.indicators.volume) return;

    // 計算成交量的最大值，用於比例計算
    const validVolumes = this.indicators.volume.filter((v: any) => typeof v === 'number' && v > 0) as number[];
    const maxVolume = validVolumes.length > 0 ? Math.max(...validVolumes) : 1;

    const volumeData = this.chartData.map((candle, i) => {
      const volume = this.indicators.volume![i] || 0;
      // 將成交量轉換為 0-100 的比例值
      const volumeRatio = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
      return {
        time: candle.time,
        value: volumeRatio,
        color: candle.close >= candle.open ? '#26a69a' : '#ef5350'
      };
    });

    const volumeSeries = this.chart.addSeries(HistogramSeries, {
      title: '成交量 (比例)'
    });
    volumeSeries.setData(volumeData);
    this.indicatorSeriesRef.current['VOL'] = volumeSeries;
  }

  /**
   * 渲染所有選中的指標
   */
  renderAllIndicators(): void {
    this.clearAllIndicators();

    this.renderMovingAverages();
    this.renderExponentialMovingAverages();
    this.renderBollingerBands();
    this.renderRSI();
    this.renderMACD();
    this.renderKDJ();
    this.renderStochastic();
    this.renderCCI();
    this.renderATR();
    this.renderADX();
    this.renderOBV();
    this.renderVolume();

    logger.frontend.chartRender(`Rendered ${Object.keys(this.indicatorSeriesRef.current).length} indicators`);
  }
}
