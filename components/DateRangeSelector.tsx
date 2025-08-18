'use client';

import { useState, useEffect } from 'react';

export type TimeFrame = '1d' | '1w' | '1M';

interface DateRangeSelectorProps {
  onTimeFrameChange: (timeframe: TimeFrame) => void;
  onDateRangeChange: (from: string, to: string) => void;
  currentTimeFrame: TimeFrame;
  currentFrom?: string;
  currentTo?: string;
  earliestDate?: string;
  latestDate?: string;
  loading?: boolean;
}

export default function DateRangeSelector({
  onTimeFrameChange,
  onDateRangeChange,
  currentTimeFrame,
  currentFrom,
  currentTo,
  earliestDate,
  latestDate,
  loading = false
}: DateRangeSelectorProps) {
  const [fromDate, setFromDate] = useState(currentFrom || '');
  const [toDate, setToDate] = useState(currentTo || '');

  const timeFrames = [
    { value: '1d' as TimeFrame, label: '日K', description: '每日K線圖' },
    { value: '1w' as TimeFrame, label: '週K', description: '每週K線圖' },
    { value: '1M' as TimeFrame, label: '月K', description: '每月K線圖' },
  ];

  // 當時間框架改變時，重置日期範圍
  useEffect(() => {
    setFromDate('');
    setToDate('');
  }, [currentTimeFrame]);

  // 當外部日期改變時更新內部狀態
  useEffect(() => {
    if (currentFrom) setFromDate(currentFrom);
    if (currentTo) setToDate(currentTo);
  }, [currentFrom, currentTo]);

  const handleTimeFrameChange = (timeframe: TimeFrame) => {
    onTimeFrameChange(timeframe);
    setFromDate('');
    setToDate('');
  };

  const handleDateChange = () => {
    if (fromDate && toDate) {
      onDateRangeChange(fromDate, toDate);
    }
  };

  const handleQuickRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];
    
    setFromDate(fromStr);
    setToDate(toStr);
    onDateRangeChange(fromStr, toStr);
  };

  const handleEarliestDate = () => {
    if (earliestDate) {
      setFromDate(earliestDate);
      setToDate(latestDate || '');
      onDateRangeChange(earliestDate, latestDate || '');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">時間框架:</span>
          <div className="flex space-x-1">
            {timeFrames.map((tf) => (
              <button
                key={tf.value}
                onClick={() => handleTimeFrameChange(tf.value)}
                disabled={loading}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  currentTimeFrame === tf.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={tf.description}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>


      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">快速選擇:</span>
          <button
            onClick={() => handleQuickRange(30)}
            disabled={loading}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            最近30天
          </button>
          <button
            onClick={() => handleQuickRange(90)}
            disabled={loading}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            最近90天
          </button>
          <button
            onClick={() => handleQuickRange(365)}
            disabled={loading}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            最近一年
          </button>
          {earliestDate && (
            <button
              onClick={handleEarliestDate}
              disabled={loading}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
            >
              從最早日期開始
            </button>
          )}
        </div>

        {earliestDate && latestDate && (
          <div className="text-xs text-gray-500">
            可用日期範圍: {earliestDate} 至 {latestDate}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-2">
          <div className="loading-spinner w-4 h-4 mr-2"></div>
          <span className="text-sm text-gray-600">載入中...</span>
        </div>
      )}
    </div>
  );
}
