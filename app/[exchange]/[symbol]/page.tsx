'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ResizableChartLayout from '@/components/ResizableChartLayout';
import MultiChartLayout from '@/components/MultiChartLayout';
import DateRangeSelector, { TimeFrame } from '@/components/DateRangeSelector';
import TechnicalIndicators, { IndicatorType } from '@/components/TechnicalIndicators';
import TradingViewIndicatorSelector from '@/components/TradingViewIndicatorSelector';
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
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorType[]>(['MACD']);
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

  // 從資料庫查詢股票的實際交易所資訊
  const [actualExchange, setActualExchange] = useState<string>(exchange);

  useEffect(() => {
    const fetchData = async () => {
      console.log('🚀 DEBUG: Starting fetchData function');
      console.log('🚀 DEBUG: Params:', { exchange, symbol, market, timeFrame });
      
      setLoading(true);
      setError(null);
      
      try {
        // 先查詢股票的實際交易所資訊
        console.log('🚀 DEBUG: Fetching stock info to determine actual exchange');
        const stockInfoResponse = await fetch(`/api/search-stocks?q=${symbol}&yahoo=false`);
        const stockInfoResult = await stockInfoResponse.json();
        
        let apiMarket = exchange; // 預設使用 URL 中的交易所
        let stockFound = false;
        
        if (stockInfoResult.success && stockInfoResult.data.length > 0) {
          const stockInfo = stockInfoResult.data[0];
          apiMarket = stockInfo.exchange; // 使用資料庫中的實際交易所
          setActualExchange(stockInfo.exchange);
          stockFound = true;
          console.log('🚀 DEBUG: Found stock info:', stockInfo);
          console.log('🚀 DEBUG: Using actual exchange:', apiMarket);
        } else {
          // 如果找不到股票資訊，嘗試根據 URL 中的 exchange 來推斷
          if (exchange === 'NASDAQ' || exchange === 'NYSE' || exchange === 'NYSEARCA') {
            apiMarket = 'US'; // 這些都是美股的次級市場
            setActualExchange('US');
            console.log('🚀 DEBUG: Using inferred US exchange for:', exchange);
          } else {
            apiMarket = exchange; // 使用 URL 中的交易所
            console.log('🚀 DEBUG: No stock info found, using URL exchange:', exchange);
          }
        }
        
        // 檢查股票是否在正確的市場
        if (stockFound && apiMarket !== exchange) {
          // 如果找到的股票不在當前市場，顯示錯誤
          throw new Error(`股票 ${symbol} 不在 ${exchange === 'TW' ? '台股' : '美股'} 市場中`);
        }
        
        console.log('🚀 DEBUG: About to fetch data');
        logger.frontend.dataFetch(`Fetching data for: ${exchange} ${symbol} (actual market: ${apiMarket})`, { timeFrame });
        
        // 構建 API URL
        const url = new URL('/api/ohlc', window.location.origin);
        url.searchParams.set('market', apiMarket); // 使用實際的交易所
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('tf', timeFrame);
        
        console.log('🚀 DEBUG: API URL:', url.toString());
        
        const response = await fetch(url.toString());
        console.log('🚀 DEBUG: Response received:', response.status, response.statusText);
        logger.frontend.dataFetch(`Response status: ${response.status}`);
        
        if (!response.ok) {
          console.error('🚀 DEBUG: Response not OK:', response.status, response.statusText);
          if (response.status === 404) {
            throw new Error(`找不到股票: ${symbol} (${exchange})`);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('🚀 DEBUG: JSON parsed successfully');
        console.log('🚀 DEBUG: Result keys:', Object.keys(result));
        console.log('🚀 DEBUG: Result.success:', result.success);
        console.log('🚀 DEBUG: Result.data type:', typeof result.data);
        console.log('🚀 DEBUG: Result.data is array:', Array.isArray(result.data));
        console.log('🚀 DEBUG: Result.data length:', result.data?.length);
        console.log('🚀 DEBUG: First 3 data items:', result.data?.slice(0, 3));
        console.log('🚀 DEBUG: Result.metadata:', result.metadata);
        
        logger.frontend.dataFetch(`API Response received`, { 
          resultType: typeof result,
          hasDataProperty: 'data' in result,
          dataPropertyType: typeof result.data,
          dataIsArray: Array.isArray(result.data),
          responseHeaders: Object.fromEntries(response.headers.entries())
        });
        
        if (result.error) {
          console.log('🚀 DEBUG: API returned error:', result.error);
          setError(result.error);
        } else if (result.success && result.data && Array.isArray(result.data)) {
          console.log('🚀 DEBUG: Processing data with success field');
          logger.frontend.dataFetch(`Data received`, { 
            dataLength: result.data.length, 
            firstDataItem: result.data[0],
            metadata: result.metadata
          });
          setData(result.data);
          setDataSource(result.metadata?.dataSource || 'Unknown');
          console.log('🚀 DEBUG: Data set successfully with success field');
        } else if (result.data && Array.isArray(result.data)) {
          console.log('🚀 DEBUG: Processing data without success field');
          // 兼容沒有 success 字段的情況
          logger.frontend.dataFetch(`Data received (no success field)`, { 
            dataLength: result.data.length, 
            firstDataItem: result.data[0],
            metadata: result.metadata
          });
          setData(result.data);
          setDataSource(result.metadata?.dataSource || 'Unknown');
          console.log('🚀 DEBUG: Data set successfully without success field');
        } else {
          console.error('🚀 DEBUG: Unexpected response format:', result);
          logger.frontend.error('Unexpected response format', result);
          setError('資料格式錯誤');
        }
      } catch (err) {
        console.error('🚀 DEBUG: Fetch error caught:', err);
        console.error('🚀 DEBUG: Error type:', typeof err);
        console.error('🚀 DEBUG: Error message:', err instanceof Error ? err.message : String(err));
        console.error('🚀 DEBUG: Error stack:', err instanceof Error ? err.stack : 'No stack');
        logger.frontend.error('Fetch error', err);
        setError(`無法載入資料: ${err instanceof Error ? err.message : '未知錯誤'}`);
      } finally {
        console.log('🚀 DEBUG: Setting loading to false');
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

    // console.log('🚀 DEBUG: useEffect condition check:', { exchange, symbol, hasExchange: !!exchange, hasSymbol: !!symbol });
    if (exchange && symbol) {
      // console.log('🚀 DEBUG: Conditions met, calling fetchData and fetchStockInfo');
      fetchData();
      fetchStockInfo();
    } else {
      // console.log('🚀 DEBUG: Conditions not met, skipping fetch');
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

  // console.log('🚀 DEBUG: Render state:', { loading, error, dataLength: data.length, hasData: data.length > 0 });
  
  if (loading) {
    // console.log('🚀 DEBUG: Rendering loading state');
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
    // 檢查是否為找不到股票的錯誤
    const isNotFoundError = error.includes('找不到股票') || error.includes('不在') || error.includes('市場中');
    
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">
            {isNotFoundError ? '找不到股票' : '載入失敗'}
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          {isNotFoundError ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                請檢查股票代號是否正確，或嘗試搜尋其他股票
              </p>
              <button 
                onClick={() => window.history.back()} 
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2"
              >
                返回
              </button>
              <button 
                onClick={() => window.location.href = '/symbols'} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                瀏覽股票列表
              </button>
            </div>
          ) : (
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重新載入
            </button>
          )}
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

        {/* 主要內容區域 - TradingView 風格佈局 */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {/* 左側圖表區域 - 佔 5/7 */}
          <div className="lg:col-span-5">
            {/* 控制面板 - TradingView 風格 */}
            <div className="bg-white border border-gray-200 rounded-t-lg p-3 border-b-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* 時間範圍選擇器 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">時間範圍</span>
                    <DateRangeSelector 
                      currentTimeFrame={timeFrame} 
                      onTimeFrameChange={setTimeFrame} 
                    />
                  </div>
                  
                  {/* 技術指標選擇器 - TradingView 風格 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">技術指標</span>
                    <TradingViewIndicatorSelector 
                      selectedIndicators={selectedIndicators} 
                      onIndicatorChange={(newIndicators) => {
                        console.log('📊 股票頁面指標更新:', {
                          oldIndicators: selectedIndicators,
                          newIndicators
                        });
                        setSelectedIndicators(newIndicators);
                      }}
                      loading={loading}
                    />
                  </div>
                </div>
                
                {/* 資料資訊 */}
                <div className="text-right text-xs text-gray-500">
                  <div>資料來源: {dataSource}</div>
                  <div>資料筆數: {data.length}</div>
                </div>
              </div>
            </div>

            {/* 圖表區域 - 多圖表佈局 */}
            <div className="bg-white border border-gray-200 rounded-b-lg p-4">
              <MultiChartLayout 
                data={data} 
                selectedIndicators={selectedIndicators}
                symbol={symbol}
                market={exchange}
                timeframe={timeFrame}
                loading={loading}
              />
            </div>
          </div>

          {/* 右側公司資訊區域 - 佔 2/7，類似 TradingView */}
          <div className="lg:col-span-2 min-w-[380px]">
            {stockInfo && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 sticky top-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">股票資訊</h3>
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
