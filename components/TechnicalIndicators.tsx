'use client';

import { useState } from 'react';

export type IndicatorType = 'MA' | 'EMA' | 'MACD' | 'RSI' | 'BOLL' | 'KDJ' | 'VOL' | 'ATR' | 'STOCH' | 'CCI' | 'ADX' | 'OBV';

interface TechnicalIndicatorsProps {
  onIndicatorChange: (indicators: IndicatorType[]) => void;
  selectedIndicators: IndicatorType[];
  loading?: boolean;
  floating?: boolean; // 是否為浮動模式
}

interface TooltipProps {
  content: string;
  isVisible: boolean;
  position: { x: number; y: number };
}

export default function TechnicalIndicators({
  onIndicatorChange,
  selectedIndicators,
  loading = false,
  floating = false
}: TechnicalIndicatorsProps) {
  const [tooltip, setTooltip] = useState<TooltipProps>({
    content: '',
    isVisible: false,
    position: { x: 0, y: 0 }
  });
  
  const indicators = [
    { 
      type: 'MA' as IndicatorType, 
      label: '移動平均線', 
      description: 'Simple Moving Average (MA5, MA10, MA20)',
      color: '#FF6B6B',
      category: '趨勢'
    },
    { 
      type: 'EMA' as IndicatorType, 
      label: '指數移動平均線', 
      description: 'Exponential Moving Average (EMA12, EMA26)',
      color: '#4ECDC4',
      category: '趨勢'
    },
    { 
      type: 'BOLL' as IndicatorType, 
      label: '布林通道', 
      description: 'Bollinger Bands (20, 2)',
      color: '#96CEB4',
      category: '趨勢'
    },
    { 
      type: 'MACD' as IndicatorType, 
      label: 'MACD', 
      description: 'Moving Average Convergence Divergence',
      color: '#45B7D1',
      category: '動量'
    },
    { 
      type: 'RSI' as IndicatorType, 
      label: 'RSI', 
      description: 'Relative Strength Index (14)',
      color: '#FFEAA7',
      category: '動量'
    },
    { 
      type: 'STOCH' as IndicatorType, 
      label: '隨機指標', 
      description: 'Stochastic Oscillator (14, 3, 3)',
      color: '#DDA0DD',
      category: '動量'
    },
    { 
      type: 'KDJ' as IndicatorType, 
      label: 'KDJ', 
      description: 'Stochastic RSI',
      color: '#98D8C8',
      category: '動量'
    },
    { 
      type: 'CCI' as IndicatorType, 
      label: 'CCI', 
      description: 'Commodity Channel Index (20)',
      color: '#F7DC6F',
      category: '動量'
    },
    { 
      type: 'ATR' as IndicatorType, 
      label: 'ATR', 
      description: 'Average True Range (14)',
      color: '#BB8FCE',
      category: '波動'
    },
    { 
      type: 'ADX' as IndicatorType, 
      label: 'ADX', 
      description: 'Average Directional Index (14)',
      color: '#85C1E9',
      category: '趨勢'
    },
    { 
      type: 'OBV' as IndicatorType, 
      label: 'OBV', 
      description: 'On Balance Volume',
      color: '#F8C471',
      category: '成交量'
    },
    { 
      type: 'VOL' as IndicatorType, 
      label: '成交量', 
      description: 'Volume',
      color: '#82E0AA',
      category: '成交量'
    },
  ];

  const handleIndicatorToggle = (indicator: IndicatorType) => {
    const newIndicators = selectedIndicators.includes(indicator)
      ? selectedIndicators.filter(i => i !== indicator)
      : [...selectedIndicators, indicator];
    
    onIndicatorChange(newIndicators);
  };

  const handleSelectAll = () => {
    onIndicatorChange(indicators.map(i => i.type));
  };

  const handleClearAll = () => {
    onIndicatorChange([]);
  };

  const handleMouseEnter = (e: React.MouseEvent, description: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      content: description,
      isVisible: true,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      }
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, isVisible: false }));
  };

  return (
    <div className="relative">
      {/* 工具提示 */}
      {tooltip.isVisible && (
        <div
          className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltip.position.x,
            top: tooltip.position.y,
            transform: 'translateX(-50%) translateY(-100%)',
            opacity: 0.7
          }}
        >
          {tooltip.content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      )}

      {/* 收縮式技術指標選擇器 */}
      <div className="flex flex-wrap gap-2">
        {indicators.map((indicator) => (
          <label
            key={indicator.type}
            className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 border ${
              selectedIndicators.includes(indicator.type)
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            }`}
            onMouseEnter={(e) => handleMouseEnter(e, indicator.description)}
            onMouseLeave={handleMouseLeave}
          >
            <input
              type="checkbox"
              checked={selectedIndicators.includes(indicator.type)}
              onChange={() => handleIndicatorToggle(indicator.type)}
              disabled={loading}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: indicator.color }}
            />
            <span className="text-sm font-medium whitespace-nowrap">
              {indicator.label}
            </span>
          </label>
        ))}
      </div>

      {/* 操作按鈕 */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex space-x-2">
          <button
            onClick={handleSelectAll}
            disabled={loading}
            className="px-3 py-1 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            全選
          </button>
          <button
            onClick={handleClearAll}
            disabled={loading}
            className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            清除
          </button>
        </div>
        
        {selectedIndicators.length > 0 && (
          <div className="text-xs text-gray-500">
            已選擇 {selectedIndicators.length} 個指標
          </div>
        )}
      </div>
    </div>
  );
}
