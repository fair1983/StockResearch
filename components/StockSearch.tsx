'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface StockSearchResult {
  symbol: string;
  name: string;
  category: string;
  market: string;
  source?: string;
  exchange?: string;
  type?: string;
  score?: number;
}

interface StockSearchProps {
  market?: string;
  placeholder?: string;
  className?: string;
  showYahooToggle?: boolean;
  showAddToLocal?: boolean;
}

export default function StockSearch({ 
  market = 'TW', 
  placeholder = '搜尋股票代碼或名稱...',
  className = '',
  showYahooToggle = true,
  showAddToLocal = true
}: StockSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [useYahoo, setUseYahoo] = useState(true);
  const [addingStocks, setAddingStocks] = useState(false);
  const [addMessage, setAddMessage] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 防抖搜尋
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 1) {
        searchStocks(query.trim());
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, market, useYahoo]);

  // 點擊外部關閉搜尋結果
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchStocks = async (searchQuery: string) => {
    if (searchQuery.length < 1) return;

    setLoading(true);
    try {
      // 修正 market 參數映射
      let apiMarket = market;
      if (market === 'TW') {
        apiMarket = 'TW'; // 台股使用 'TW'
      } else if (market === 'US') {
        apiMarket = 'US'; // 美股使用 'US'
      }
      
      const url = `/api/search-stocks?q=${encodeURIComponent(searchQuery)}&market=${apiMarket}&limit=10&yahoo=${useYahoo}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
        setShowResults(true);
        setSelectedIndex(-1);
      } else {
        setResults([]);
        setShowResults(false);
      }
    } catch (error) {
      logger.frontend.error('Stock search error', error);
      setResults([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          selectStock(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectStock = (stock: StockSearchResult) => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    
    // 使用交易所代號進行導航
    const exchangeCode = stock.exchange || (stock.market === '上市' || stock.market === '上櫃' ? 'TW' : 'US');
    
    // 導航到股票頁面
    router.push(`/${exchangeCode}/${stock.symbol}`);
  };

  const addStocksToLocal = async () => {
    const yahooStocks = results.filter(stock => stock.source === 'yahoo');
    
    if (yahooStocks.length === 0) {
      setAddMessage('沒有可新增的 Yahoo Finance 股票');
      return;
    }

    setAddingStocks(true);
    setAddMessage('');

    try {
      const response = await fetch('/api/search-stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: yahooStocks.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            category: stock.category,
            market: stock.market
          })),
          market: market
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAddMessage(`成功新增 ${data.totalAdded} 支股票，跳過 ${data.totalSkipped} 支已存在的股票`);
        
        // 重新搜尋以更新結果（現在會包含本地資料）
        if (query.trim().length >= 1) {
          setTimeout(() => searchStocks(query.trim()), 1000);
        }
      } else {
        setAddMessage(`新增失敗: ${data.error}`);
      }
    } catch (error) {
      logger.frontend.error('Add stocks error', error);
      setAddMessage('新增股票時發生錯誤');
    } finally {
      setAddingStocks(false);
    }
  };

  const getCategoryDisplay = (category: string) => {
    switch (category) {
      case 'stock': return '股票';
      case 'etf': return 'ETF';
      case 'index': return '指數';
      case 'crypto': return '加密貨幣';
      case 'currency': return '貨幣';
      case 'future': return '期貨';
      case 'option': return '期權';
      case 'mutualfund': return '基金';
      default: return category;
    }
  };

  const getMarketDisplay = (market: string) => {
    switch (market) {
      case 'TW': return '台股';
      case 'US': return '美股';
      case 'HK': return '港股';
      case 'JP': return '日股';
      case 'EU': return '歐股';
      case 'ASIA': return '亞股';
      default: return market;
    }
  };

  const getSourceDisplay = (source?: string) => {
    if (!source || source === 'local') return '';
    if (source === 'yahoo') return 'Yahoo';
    return source;
  };

  const yahooStocksCount = results.filter(stock => stock.source === 'yahoo').length;

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Yahoo Finance 切換按鈕 */}
      {showYahooToggle && (
        <div className="mt-2 flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={useYahoo}
              onChange={(e) => setUseYahoo(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>包含 Yahoo Finance 搜尋</span>
          </label>
          {useYahoo && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              擴展搜尋
            </span>
          )}
        </div>
      )}

      {/* 搜尋結果統計 */}
      {showResults && results.length > 0 && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            找到 {results.length} 支股票
            {useYahoo && (
              <span className="text-xs ml-2">
                (已包含 Yahoo Finance 比對)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 搜尋結果 */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.map((stock, index) => (
            <div
              key={`${stock.market}-${stock.symbol}`}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => selectStock(stock)}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{stock.symbol}</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {getCategoryDisplay(stock.category)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{stock.name}</div>
                  {stock.exchange && (
                    <div className="text-xs text-gray-400 mt-1">
                      {stock.exchange} • {getMarketDisplay(stock.market)}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {getMarketDisplay(stock.market)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 無結果提示 */}
      {showResults && !loading && results.length === 0 && query.length >= 1 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="px-4 py-3 text-gray-500 text-center">
            找不到符合的股票
            {useYahoo && (
              <div className="text-xs mt-1">
                已包含 Yahoo Finance 搜尋
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
