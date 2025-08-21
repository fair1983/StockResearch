'use client';

import { useState, useRef, useEffect } from 'react';
import { IndicatorType } from './TechnicalIndicators';

interface TradingViewIndicatorSelectorProps {
  selectedIndicators: IndicatorType[];
  onIndicatorChange: (indicators: IndicatorType[]) => void;
  loading?: boolean;
}

export default function TradingViewIndicatorSelector({
  selectedIndicators,
  onIndicatorChange,
  loading = false
}: TradingViewIndicatorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const indicators = [
    { type: 'MA' as IndicatorType, label: 'MA', color: '#FF6B6B', category: '趨勢' },
    { type: 'EMA' as IndicatorType, label: 'EMA', color: '#4ECDC4', category: '趨勢' },
    { type: 'BOLL' as IndicatorType, label: 'BOLL', color: '#96CEB4', category: '趨勢' },
    { type: 'MACD' as IndicatorType, label: 'MACD', color: '#45B7D1', category: '動量' },
    { type: 'RSI' as IndicatorType, label: 'RSI', color: '#FFEAA7', category: '動量' },
    { type: 'STOCH' as IndicatorType, label: 'STOCH', color: '#DDA0DD', category: '動量' },
    { type: 'KDJ' as IndicatorType, label: 'KDJ', color: '#98D8C8', category: '動量' },
    { type: 'CCI' as IndicatorType, label: 'CCI', color: '#F7DC6F', category: '動量' },
    { type: 'ATR' as IndicatorType, label: 'ATR', color: '#BB8FCE', category: '波動' },
    { type: 'ADX' as IndicatorType, label: 'ADX', color: '#85C1E9', category: '趨勢' },
    { type: 'OBV' as IndicatorType, label: 'OBV', color: '#F8C471', category: '成交量' },
    { type: 'VOL' as IndicatorType, label: 'VOL', color: '#82E0AA', category: '成交量' },
  ];

  const handleIndicatorToggle = (indicator: IndicatorType) => {
    const newIndicators = selectedIndicators.includes(indicator)
      ? selectedIndicators.filter(i => i !== indicator)
      : [...selectedIndicators, indicator];
    
    console.log('🎯 指標選擇變更:', {
      indicator,
      action: selectedIndicators.includes(indicator) ? '移除' : '添加',
      oldIndicators: selectedIndicators,
      newIndicators
    });
    
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
    <div className="relative" ref={dropdownRef}>
      {/* 主按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded border transition-all duration-200 ${
          selectedIndicators.length > 0
            ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 shadow-sm'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
          isOpen ? 'ring-2 ring-blue-200 ring-offset-1' : ''
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>指標</span>
        {selectedIndicators.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full animate-pulse">
            {selectedIndicators.length}
          </span>
        )}
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in slide-in-from-top-2 duration-200">
          {/* 標題和操作按鈕 */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
            <h3 className="text-sm font-semibold text-gray-900">技術指標</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium"
              >
                全選
              </button>
              <button
                onClick={handleClearAll}
                className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
              >
                清除
              </button>
            </div>
          </div>

          {/* 指標列表 */}
          <div className="max-h-64 overflow-y-auto p-3">
            {Object.entries(groupedIndicators).map(([category, categoryIndicators]) => (
              <div key={category} className="mb-4 last:mb-0">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {category}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {categoryIndicators.map((indicator) => (
                                         <label
                       key={indicator.type}
                       className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition-all duration-150 ${
                         selectedIndicators.includes(indicator.type)
                           ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                           : 'hover:bg-gray-50 text-gray-700 hover:border hover:border-gray-200'
                       }`}
                     >
                       <input
                         type="checkbox"
                         checked={selectedIndicators.includes(indicator.type)}
                         onChange={() => handleIndicatorToggle(indicator.type)}
                         className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-1"
                       />
                       <div 
                         className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                         style={{ backgroundColor: indicator.color }}
                       />
                       <span className="text-sm font-medium">{indicator.label}</span>
                     </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 底部統計 */}
          {selectedIndicators.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              <div className="text-xs text-gray-500">
                已選擇 {selectedIndicators.length} 個指標
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
