'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PriceChart from '@/components/PriceChart';
import DateRangeSelector, { TimeFrame } from '@/components/DateRangeSelector';
import TechnicalIndicators, { IndicatorType } from '@/components/TechnicalIndicators';
import CompanyInfo from '@/components/CompanyInfo';
import { Candle, Market } from '@/types';
import { logger } from '@/lib/logger';
import { getStockName } from '@/lib/stock-utils';

export default function StockPage() {
  const params = useParams();
  const market = params.market as Market;
  const symbol = params.symbol as string;
  
  const [data, setData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1d');
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorType[]>([]);

  // 獲取股票名稱
  const stockName = getStockName(market, symbol);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        logger.frontend.dataFetch(`Fetching data for: ${market} ${symbol}`, { timeFrame });
        
        // 構建 API URL
        const url = new URL('/api/ohlc', window.location.origin);
        url.searchParams.set('market', market);
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('tf', timeFrame);
        
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
        } else if (result.success && result.data && Array.isArray(result.data)) {
          logger.frontend.dataFetch(`Data received`, { 
            dataLength: result.data.length, 
            firstDataItem: result.data[0],
            metadata: result.metadata
          });
          setData(result.data);
          setDataSource(result.metadata?.dataSource || 'Unknown');
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
  }, [market, symbol, timeFrame]);

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
          <div className="text-sm text-gray-500 mb-4">
            可能的原因：
            <ul className="list-disc list-inside mt-2">
              <li>股票代碼不存在或已下市</li>
              <li>網路連線問題</li>
              <li>資料來源暫時無法使用</li>
            </ul>
          </div>
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

  // 檢查是否有資料
  if (!loading && (!data || data.length === 0)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-yellow-500 text-lg mb-2">無資料可顯示</div>
          <div className="text-gray-600 mb-4">
            股票代碼 {symbol} 目前沒有可用的交易資料
          </div>
          <div className="text-sm text-gray-500 mb-4">
            可能的原因：
            <ul className="list-disc list-inside mt-2">
              <li>股票代碼不存在</li>
              <li>股票已下市或暫停交易</li>
              <li>該股票在指定時間範圍內無交易記錄</li>
            </ul>
          </div>
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

  const handleIndicatorChange = (indicators: IndicatorType[]) => {
    setSelectedIndicators(indicators);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 簡化的標題區塊 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h1 className="text-2xl font-bold text-gray-900">
          {stockName}
        </h1>
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
        
        {/* 中間K線圖和時間框架選擇器 */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            {/* 時間框架選擇器整合到圖表區域 */}
            <div className="mb-4">
              <DateRangeSelector
                onTimeFrameChange={handleTimeFrameChange}
                currentTimeFrame={timeFrame}
                loading={loading}
              />
            </div>
            
            {/* K線圖表 */}
            <PriceChart 
              data={data} 
              symbol={symbol} 
              market={market} 
              timeframe={timeFrame} 
              selectedIndicators={selectedIndicators}
            />
          </div>
        </div>
        
        {/* 右側公司資訊面板 */}
        {data.length > 0 && (
          <div className="w-80 flex-shrink-0">
            <CompanyInfo 
              symbol={symbol} 
              market={market} 
              data={data} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
