'use client';

import { useState } from 'react';

export type IndicatorType = 'MA' | 'EMA' | 'MACD' | 'RSI' | 'BOLL' | 'KDJ' | 'VOL' | 'ATR' | 'STOCH' | 'CCI' | 'ADX' | 'OBV';

interface TechnicalIndicatorsProps {
  onIndicatorChange: (indicators: IndicatorType[]) => void;
  selectedIndicators: IndicatorType[];
  loading?: boolean;
}

export default function TechnicalIndicators({
  onIndicatorChange,
  selectedIndicators,
  loading = false
}: TechnicalIndicatorsProps) {
  
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

  // 按類別分組指標
  const groupedIndicators = indicators.reduce((acc, indicator) => {
    if (!acc[indicator.category]) {
      acc[indicator.category] = [];
    }
    acc[indicator.category].push(indicator);
    return acc;
  }, {} as Record<string, typeof indicators>);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">技術指標</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleSelectAll}
            disabled={loading}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
          >
            全選
          </button>
          <button
            onClick={handleClearAll}
            disabled={loading}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            清除
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedIndicators).map(([category, categoryIndicators]) => (
          <div key={category} className="border-b border-gray-100 pb-3 last:border-b-0">
            <h4 className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">
              {category}
            </h4>
            <div className="space-y-2">
              {categoryIndicators.map((indicator) => (
                <label
                  key={indicator.type}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIndicators.includes(indicator.type)}
                    onChange={() => handleIndicatorToggle(indicator.type)}
                    disabled={loading}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: indicator.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {indicator.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {indicator.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedIndicators.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">
            已選擇 {selectedIndicators.length} 個指標
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedIndicators.map((indicatorType) => {
              const indicator = indicators.find(i => i.type === indicatorType);
              return (
                <span
                  key={indicatorType}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${indicator?.color}20`,
                    color: indicator?.color,
                    border: `1px solid ${indicator?.color}40`
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-1" 
                    style={{ backgroundColor: indicator?.color }}
                  />
                  {indicator?.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
