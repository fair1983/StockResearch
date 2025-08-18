'use client';

export type TimeFrame = '1d' | '1w' | '1M';

interface DateRangeSelectorProps {
  onTimeFrameChange: (timeframe: TimeFrame) => void;
  currentTimeFrame: TimeFrame;
  loading?: boolean;
}

export default function DateRangeSelector({
  onTimeFrameChange,
  currentTimeFrame,
  loading = false
}: DateRangeSelectorProps) {
  const timeFrames = [
    { value: '1d' as TimeFrame, label: '日K', description: '每日K線圖' },
    { value: '1w' as TimeFrame, label: '週K', description: '每週K線圖' },
    { value: '1M' as TimeFrame, label: '月K', description: '每月K線圖' },
  ];

  const handleTimeFrameChange = (timeframe: TimeFrame) => {
    onTimeFrameChange(timeframe);
  };

  return (
    <div className="flex items-center">
      <div className="inline-flex rounded-md shadow-sm" role="group">
        {timeFrames.map((tf, idx) => (
          <button
            key={tf.value}
            onClick={() => handleTimeFrameChange(tf.value)}
            disabled={loading}
            className={`px-3 py-1 text-sm border border-gray-200 ${
              idx === 0 ? 'rounded-l-md' : ''
            } ${
              idx === timeFrames.length - 1 ? 'rounded-r-md' : ''
            } ${
              currentTimeFrame === tf.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={tf.description}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
}
