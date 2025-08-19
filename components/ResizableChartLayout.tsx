'use client';

import { useState, useRef, useEffect } from 'react';
import { Candle } from '@/types';
import { IndicatorType } from './TechnicalIndicators';
import PriceChart from './PriceChart';

interface ResizableChartLayoutProps {
  data: Candle[];
  symbol: string;
  market: string;
  timeframe: string;
  selectedIndicators: IndicatorType[];
  onIndicatorChange: (indicators: IndicatorType[]) => void;
}

export default function ResizableChartLayout({
  data,
  symbol,
  market,
  timeframe,
  selectedIndicators,
  onIndicatorChange
}: ResizableChartLayoutProps) {
  const [mainChartHeight, setMainChartHeight] = useState(60); // 主圖表高度百分比
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 處理分割線拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
      
      // 限制高度範圍在 20% - 80% 之間
      const clampedHeight = Math.max(20, Math.min(80, newHeight));
      setMainChartHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);



  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* 主圖表區域 */}
      <div 
        className="w-full relative"
        style={{ height: `${mainChartHeight}%` }}
      >
        <PriceChart 
          data={data}
          symbol={symbol}
          market={market}
          timeframe={timeframe}
          selectedIndicators={selectedIndicators}
          isMainChart={true}
        />
      </div>

      {/* 可拖拽的分割線 */}
      <div
        className="w-full h-1 bg-gray-300 cursor-ns-resize hover:bg-gray-400 transition-colors relative"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-6 bg-gray-300 rounded flex items-center justify-center">
          <div className="w-4 h-0.5 bg-gray-600"></div>
        </div>
      </div>

      {/* 技術指標圖表區域 */}
      <div 
        className="w-full relative"
        style={{ height: `${100 - mainChartHeight}%` }}
      >
        <PriceChart 
          data={data}
          symbol={symbol}
          market={market}
          timeframe={timeframe}
          selectedIndicators={selectedIndicators}
          isMainChart={false}
        />
      </div>
    </div>
  );
}
