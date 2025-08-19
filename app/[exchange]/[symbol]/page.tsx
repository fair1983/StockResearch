'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ResizableChartLayout from '@/components/ResizableChartLayout';
import DateRangeSelector, { TimeFrame } from '@/components/DateRangeSelector';
import TechnicalIndicators, { IndicatorType } from '@/components/TechnicalIndicators';
import CompanyInfo from '@/components/CompanyInfo';
import { Candle, Market } from '@/types';
import { logger } from '@/lib/logger';
import { getStockName } from '@/lib/stock-utils';
import { WatchlistManager } from '@/lib/watchlist';
import { isHotStock, getHotStockReason } from '@/lib/hot-stocks';

export default function StockPage() {
  const params = useParams();
  const exchange = params.exchange as string; // TW, US
  const symbol = params.symbol as string;
  
  const [data, setData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1d');
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorType[]>([]);
  const [stockInfo, setStockInfo] = useState<any>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // 根據交易所和代號確定市場
  const getMarket = (exchange: string, symbol: string): string => {
    if (exchange === 'TW') {
      // 台股：根據代號判斷市場
      if (symbol.startsWith('00')) {
        return '上市'; // ETF 通常在上市
      } else if (symbol.length === 4 && /^\d{4}$/.test(symbol)) {
        return '上市'; // 4位數字代號通常是上市股票
      } else {
        return '上市'; // 預設為上市
      }
    } else if (exchange === 'US') {
      // 美股：根據代號判斷市場
      if (symbol.length <= 4) {
        return 'NASDAQ'; // 短代號通常是 NASDAQ
      } else {
        return 'Other'; // 其他交易所
      }
    }
    return '上市'; // 預設
  };

  const market = getMarket(exchange, symbol);

  // 獲取股票名稱
  const stockName = getStockName(exchange as Market, symbol);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        logger.frontend.dataFetch(`Fetching data for: ${exchange} ${symbol} (market: ${market})`, { timeFrame });
        
        // 構建 API URL
        const url = new URL('/api/ohlc', window.location.origin);
        url.searchParams.set('market', exchange); // 使用交易所地區而非市場
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

    // 獲取股票資訊
    const fetchStockInfo = async () => {
      try {
        const response = await fetch(`/api/search-stocks?q=${symbol}&market=${exchange}`);
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setStockInfo(result.data[0]);
        }
      } catch (err) {
        logger.frontend.error('Fetch stock info error', err);
      }
    };

    if (exchange && symbol) {
      fetchData();
      fetchStockInfo();
    }
  }, [exchange, symbol, timeFrame, market]);

  // 檢查關注狀態
  useEffect(() => {
    if (exchange && symbol) {
      const inWatchlist = WatchlistManager.isInWatchlist(symbol, exchange);
      setIsInWatchlist(inWatchlist);
    }
  }, [exchange, symbol]);

  // 切換關注狀態
  const toggleWatchlist = async () => {
    if (!stockInfo) return;
    
    try {
      if (isInWatchlist) {
        // 從關注列表移除
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'remove',
            symbol: symbol,
            market: exchange
          })
        });
        
        if (response.ok) {
          setIsInWatchlist(false);
        }
      } else {
        // 添加到關注列表
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            symbol: symbol,
            name: stockInfo.name || stockName || symbol,
            market: exchange,
            category: stockInfo.category || 'stock'
          })
        });
        
        if (response.ok) {
          setIsInWatchlist(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    }
  };

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
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* 標題區域 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {stockInfo?.name || stockName || symbol}
              </h1>
              <div className="flex items-center space-x-2">
                <p className="text-lg text-gray-600">
                  {symbol} • {exchange === 'TW' ? '台股' : '美股'} • {stockInfo?.category === 'etf' ? 'ETF' : '股票'}
                </p>
                {isHotStock(symbol, exchange) && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                    🔥 熱門股票
                  </span>
                )}
              </div>
              {isHotStock(symbol, exchange) && (
                <p className="text-sm text-gray-500 mt-1">
                  {getHotStockReason(symbol, exchange)}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleWatchlist}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    isInWatchlist
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {isInWatchlist ? '取消關注' : '關注股票'}
                </button>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    資料來源: {dataSource}
                  </div>
                  <div className="text-sm text-gray-500">
                    資料筆數: {data.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 主要內容區域 - 左右分欄 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左側圖表區域 - 佔 3/4 */}
          <div className="lg:col-span-3">
            {/* 控制面板 */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-shrink-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">時間範圍</h3>
                  <DateRangeSelector 
                    currentTimeFrame={timeFrame} 
                    onTimeFrameChange={setTimeFrame} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <TechnicalIndicators 
                    selectedIndicators={selectedIndicators} 
                    onIndicatorChange={setSelectedIndicators}
                    loading={false}
                    floating={false}
                  />
                </div>
              </div>
            </div>

            {/* 可調整分割的圖表區域 */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="h-[600px]">
                <ResizableChartLayout 
                  data={data} 
                  selectedIndicators={selectedIndicators}
                  onIndicatorChange={setSelectedIndicators}
                  symbol={symbol}
                  market={exchange}
                  timeframe={timeFrame}
                />
              </div>
            </div>
          </div>

          {/* 右側公司資訊區域 - 佔 1/4 */}
          <div className="lg:col-span-1 min-w-[350px]">
            {stockInfo && (
              <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">股票資訊</h3>
                <CompanyInfo 
                  market={exchange} 
                  symbol={symbol} 
                  data={data} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
