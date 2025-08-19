'use client';

import { useRef, useState, useEffect } from 'react';
import PriceChart from './PriceChart';
import { Candle } from '@/types';
import { IndicatorType } from './TechnicalIndicators';

interface ResizableChartLayoutProps {
  data: Candle[];
  symbol: string;
  market: string;
  timeframe: string;
  selectedIndicators: IndicatorType[];
}

export default function ResizableChartLayout({ 
  data, 
  symbol, 
  market, 
  timeframe, 
  selectedIndicators 
}: ResizableChartLayoutProps) {
  console.log('🚀 DEBUG ResizableChartLayout: Component rendered with props:', {
    dataLength: data?.length,
    symbol,
    market,
    timeframe,
    selectedIndicatorsLength: selectedIndicators?.length,
    hasData: !!data && data.length > 0,
    firstDataItem: data?.[0],
    selectedIndicators
  });

  return (
    <div className="w-full h-full flex flex-col">
      {/* 單一 PriceChart 實例，會根據 selectedIndicators 自動決定顯示內容 */}
      <PriceChart
        data={data}
        symbol={symbol}
        market={market}
        timeframe={timeframe}
        selectedIndicators={selectedIndicators}
      />
    </div>
  );
}
