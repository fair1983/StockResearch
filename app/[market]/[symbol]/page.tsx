'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PriceChart from '@/components/PriceChart';
import DateRangeSelector, { TimeFrame } from '@/components/DateRangeSelector';
import TechnicalIndicators, { IndicatorType } from '@/components/TechnicalIndicators';
import { Candle, Market } from '@/types';
import { logger } from '@/lib/logger';

export default function StockPage() {
  const params = useParams();
  const market = params.market as Market;
  const symbol = params.symbol as string;
  
  const [data, setData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1d');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [earliestDate, setEarliestDate] = useState<string>('');
  const [latestDate, setLatestDate] = useState<string>('');
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        logger.frontend.dataFetch(`Fetching data for: ${market} ${symbol}`, { timeFrame, dateFrom, dateTo });
        
        // 構建 API URL
        const url = new URL('/api/ohlc', window.location.origin);
        url.searchParams.set('market', market);
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('tf', timeFrame);
        if (dateFrom) url.searchParams.set('from', dateFrom);
        if (dateTo) url.searchParams.set('to', dateTo);
        
        const response = await fetch(url.toString());
        logger.frontend.dataFetch(`Response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        logger.frontend.dataFetch(`API Response received`, { 
          resultType: typeof result,
          hasDataProperty: 'data' in result,
          dataPropertyType: typeof result.data,
          dataIsArray: Array.isArray(result.data),
          responseHeaders: Object.fromEntries(response.headers.entries())
        });
        
        if (result.error) {
          setError(result.error);
        } else if (result.data && Array.isArray(result.data)) {
          logger.frontend.dataFetch(`Data received`, { 
            dataLength: result.data.length, 
            firstDataItem: result.data[0] 
          });
          setData(result.data);
          setDataSource(response.headers.get('X-Data-Source') || 'Unknown');
          
          // 更新最早和最晚日期
          if (result.data.length > 0) {
            const dates = result.data.map(candle => candle.time).sort();
            setEarliestDate(dates[0]);
            setLatestDate(dates[dates.length - 1]);
          }
        } else {
          logger.frontend.error('Unexpected response format', result);
          setError('資料格式錯誤');
        }
      } catch (err) {
        logger.frontend.error('Fetch error', err);
        setError(`無法載入資料: ${err instanceof Error ? err.message : '未知錯誤'}`);
      } finally {
        setLoading(false);
      }
    };

    if (market && symbol) {
      fetchData();
    }
  }, [market, symbol, timeFrame, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">載入中... (資料筆數: {data.length})</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">載入失敗</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  const handleTimeFrameChange = (newTimeFrame: TimeFrame) => {
    setTimeFrame(newTimeFrame);
  };

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleIndicatorChange = (indicators: IndicatorType[]) => {
    setSelectedIndicators(indicators);
  };

     return (
     <div className="space-y-8 pb-8">
       <div className="bg-white p-6 rounded-lg shadow-sm border">
         <div className="flex items-center justify-between mb-4">
           <div>
             <h1 className="text-2xl font-bold text-gray-900">
               {market === 'US' ? symbol : `${symbol} (台股)`}
             </h1>
             <p className="text-gray-600">
               市場: {market === 'US' ? '美股' : '台股'} | 
               資料來源: {dataSource}
             </p>
           </div>
           <div className="text-right">
             <div className="text-sm text-gray-500">最新收盤價</div>
             <div className="text-xl font-semibold text-gray-900">
               ${data[data.length - 1]?.close?.toFixed(2) || 'N/A'}
             </div>
           </div>
         </div>
         
         <DateRangeSelector
           onTimeFrameChange={handleTimeFrameChange}
           onDateRangeChange={handleDateRangeChange}
           currentTimeFrame={timeFrame}
           currentFrom={dateFrom}
           currentTo={dateTo}
           earliestDate={earliestDate}
           latestDate={latestDate}
           loading={loading}
         />
       </div>

       <div className="flex gap-6">
         {/* 左側技術指標面板 */}
         <div className="w-80 flex-shrink-0">
           <TechnicalIndicators
             onIndicatorChange={handleIndicatorChange}
             selectedIndicators={selectedIndicators}
             loading={loading}
           />
         </div>
         
         {/* 右側K線圖 */}
         <div className="flex-1">
           <PriceChart 
             data={data} 
             symbol={symbol} 
             market={market} 
             timeframe={timeFrame} 
             selectedIndicators={selectedIndicators}
           />
         </div>
       </div>

      {data.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近交易資料</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    開盤
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最高
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最低
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    收盤
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    成交量
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(-10).reverse().map((candle, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candle.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${candle.open.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${candle.high.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${candle.low.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${candle.close.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candle.volume?.toLocaleString() || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
