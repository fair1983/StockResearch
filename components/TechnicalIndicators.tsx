'use client';

import { useState } from 'react';

export type IndicatorType = 'MA' | 'EMA' | 'MACD' | 'RSI' | 'BOLL' | 'KDJ' | 'VOL';

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
      description: '簡單移動平均線 (MA5, MA10, MA20)',
      color: '#FF6B6B'
    },
    { 
      type: 'EMA' as IndicatorType, 
      label: '指數移動平均線', 
      description: '指數移動平均線 (EMA12, EMA26)',
      color: '#4ECDC4'
    },
    { 
      type: 'MACD' as IndicatorType, 
      label: 'MACD', 
      description: '移動平均收斂發散指標',
      color: '#45B7D1'
    },
    { 
      type: 'RSI' as IndicatorType, 
      label: 'RSI', 
      description: '相對強弱指標 (14日)',
      color: '#96CEB4'
    },
    { 
      type: 'BOLL' as IndicatorType, 
      label: '布林通道', 
      description: '布林帶指標 (20日)',
      color: '#FFEAA7'
    },
    { 
      type: 'KDJ' as IndicatorType, 
      label: 'KDJ', 
      description: '隨機指標',
      color: '#DDA0DD'
    },
    { 
      type: 'VOL' as IndicatorType, 
      label: '成交量', 
      description: '成交量柱狀圖',
      color: '#98D8C8'
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

       <div className="space-y-2">
                 {indicators.map((indicator) => (
           <div key={indicator.type} className="flex items-center">
             <label className="flex items-center space-x-2 cursor-pointer w-full">
               <input
                 type="checkbox"
                 checked={selectedIndicators.includes(indicator.type)}
                 onChange={() => handleIndicatorToggle(indicator.type)}
                 disabled={loading}
                 className="rounded border-gray-300"
                 style={{ accentColor: indicator.color }}
               />
               <div className="flex items-center space-x-2 flex-1">
                 <div 
                   className="w-3 h-3 rounded-full"
                   style={{ backgroundColor: indicator.color }}
                 ></div>
                 <span className="text-sm font-medium text-gray-700">
                   {indicator.label}
                 </span>
               </div>
             </label>
           </div>
         ))}
       </div>

      {selectedIndicators.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">已選擇的指標:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedIndicators.map((indicator) => {
              const indicatorInfo = indicators.find(i => i.type === indicator);
              return (
                <div
                  key={indicator}
                  className="flex items-center space-x-1 px-2 py-1 bg-white rounded border text-xs"
                  style={{ borderColor: indicatorInfo?.color }}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: indicatorInfo?.color }}
                  ></div>
                  <span className="text-gray-700">{indicatorInfo?.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>💡 提示：技術指標會顯示在K線圖下方，幫助分析股票走勢</p>
      </div>
    </div>
  );
}
