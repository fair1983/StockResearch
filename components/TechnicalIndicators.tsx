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
      description: '顯示股價趨勢方向，判斷支撐阻力位，當股價在均線上方為多頭趨勢',
      color: '#FF6B6B',
      category: '趨勢'
    },
    { 
      type: 'EMA' as IndicatorType, 
      label: '指數移動平均線', 
      description: '對近期價格賦予更高權重，反應更靈敏，適合短線交易判斷',
      color: '#4ECDC4',
      category: '趨勢'
    },
    { 
      type: 'BOLL' as IndicatorType, 
      label: '布林通道', 
      description: '判斷股價是否偏離正常波動範圍，上軌為壓力線，下軌為支撐線',
      color: '#96CEB4',
      category: '趨勢'
    },
    { 
      type: 'MACD' as IndicatorType, 
      label: 'MACD', 
      description: '判斷趨勢轉折點，金叉為買進信號，死叉為賣出信號',
      color: '#45B7D1',
      category: '動量'
    },
    { 
      type: 'RSI' as IndicatorType, 
      label: 'RSI', 
      description: '測量股價漲跌動能，70以上為超買，30以下為超賣',
      color: '#FFEAA7',
      category: '動量'
    },
    { 
      type: 'STOCH' as IndicatorType, 
      label: '隨機指標', 
      description: '比較收盤價在最高最低價區間的位置，判斷買賣時機',
      color: '#DDA0DD',
      category: '動量'
    },
    { 
      type: 'KDJ' as IndicatorType, 
      label: 'KDJ', 
      description: '結合動量概念的隨機指標，K線與D線交叉判斷進出場時機',
      color: '#98D8C8',
      category: '動量'
    },
    { 
      type: 'CCI' as IndicatorType, 
      label: 'CCI', 
      description: '測量股價偏離統計平均值的程度，+100以上為超買，-100以下為超賣',
      color: '#F7DC6F',
      category: '動量'
    },
    { 
      type: 'ATR' as IndicatorType, 
      label: 'ATR', 
      description: '測量股價波動幅度，數值越高表示波動越大，可用於設定停損點',
      color: '#BB8FCE',
      category: '波動'
    },
    { 
      type: 'ADX' as IndicatorType, 
      label: 'ADX', 
      description: '測量趨勢強度，25以上表示趨勢明確，適合趨勢跟隨策略',
      color: '#85C1E9',
      category: '趨勢'
    },
    { 
      type: 'OBV' as IndicatorType, 
      label: 'OBV', 
      description: '結合成交量與價格變化，判斷資金流向，確認價格趨勢的有效性',
      color: '#F8C471',
      category: '成交量'
    },
    { 
      type: 'VOL' as IndicatorType, 
      label: '成交量', 
      description: '顯示交易活躍度，放量上漲為強勢，縮量下跌為弱勢',
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
