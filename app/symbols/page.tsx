'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Market } from '@/types';
import { logger } from '@/lib/logger';
import { WatchlistManager, WatchlistItem } from '@/lib/watchlist';
import { getHotStocks, isHotStock, getHotStockReason } from '@/lib/hot-stocks';

interface Symbol {
  symbol: string;
  name: string;
  category: string;
  market?: Market;
}

interface SymbolsResponse {
  market?: Market;
  symbols: Symbol[];
  total: number;
  categories: string[];
}

export default function SymbolsPage() {
  const [market, setMarket] = useState<Market | 'ALL'>('ALL');
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistStats, setWatchlistStats] = useState<any>(null);
  const [showHotStocks, setShowHotStocks] = useState(true);

  const fetchSymbols = async () => {
    setLoading(true);
    setError('');
    
    try {
      logger.frontend.dataFetch('Fetching symbols', { market, category, search, showHotStocks });
      
      const params = new URLSearchParams();
      if (market !== 'ALL') params.append('market', market);
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/symbols?${params.toString()}`);
      const data: SymbolsResponse = await response.json();
      
      if (response.ok) {
        let filteredSymbols = data.symbols;
        
        // 如果只顯示熱門股票，進行篩選
        if (showHotStocks) {
          filteredSymbols = data.symbols.filter(symbol => 
            isHotStock(symbol.symbol, symbol.market || market)
          );
        }
        
        setSymbols(filteredSymbols);
        setCategories(data.categories);
        logger.frontend.dataFetch('Symbols fetched successfully', { 
          total: data.total,
          filtered: filteredSymbols.length,
          categories: data.categories,
          showHotStocks
        });
      } else {
        throw new Error((data as any).error || '無法取得股票列表');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤';
      setError(errorMessage);
      logger.frontend.error('Failed to fetch symbols', err);
    } finally {
      setLoading(false);
    }
  };

  // 載入關注列表
  const loadWatchlist = () => {
    const watchlist = WatchlistManager.getWatchlist();
    const stats = WatchlistManager.getWatchlistStats();
    setWatchlist(watchlist);
    setWatchlistStats(stats);
  };

  // 切換關注/取消關注
  const toggleWatchlist = async (symbol: Symbol | WatchlistItem) => {
    try {
      const isInWatchlist = WatchlistManager.isInWatchlist(symbol.symbol, symbol.market || market);
      
      if (isInWatchlist) {
        // 從關注列表移除
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'remove',
            symbol: symbol.symbol,
            market: symbol.market || market
          })
        });
        
        if (response.ok) {
          loadWatchlist();
        }
      } else {
        // 添加到關注列表
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            symbol: symbol.symbol,
            name: symbol.name,
            market: symbol.market || market,
            category: symbol.category
          })
        });
        
        if (response.ok) {
          loadWatchlist();
        }
      }
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  useEffect(() => {
    if (showWatchlist) {
      // 如果顯示關注列表，不需要重新載入所有股票
      return;
    }
    fetchSymbols();
  }, [market, category, search, showWatchlist, showHotStocks]);

  const handleMarketChange = (newMarket: Market | 'ALL') => {
    setMarket(newMarket);
    setCategory(''); // 重置類別篩選
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory === 'all' ? '' : newCategory);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
  };

  const getMarketDisplayName = (market: Market) => {
    return market === 'TW' ? '台股' : '美股';
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      '半導體': '半導體',
      '電子': '電子',
      '電子代工': '電子代工',
      '電信': '電信',
      '塑膠': '塑膠',
      '鋼鐵': '鋼鐵',
      '食品': '食品',
      '汽車': '汽車',
      '金融': '金融',
      '光學': '光學',
      '紡織': '紡織',
      '其他': '其他',
      '營建': '營建',
      'ETF': 'ETF',
      '科技': '科技',
      '醫療': '醫療',
      '消費品': '消費品',
      '零售': '零售',
      '餐飲': '餐飲',
      '媒體': '媒體',
      '能源': '能源',
      '工業': '工業',
      '運輸': '運輸',
      '通訊': '通訊',
      '投資': '投資',
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {showWatchlist ? '我的關注股票' : '股票列表'}
              </h1>
              <p className="text-gray-600">
                {showWatchlist 
                  ? `您關注的股票，共 ${watchlist.length} 檔`
                  : `瀏覽台灣和美國的主要股票及 ETF，共 ${symbols.length} 檔`
                }
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowWatchlist(true)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  showWatchlist
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                關注列表 ({watchlist.length})
              </button>
              <button
                onClick={() => setShowWatchlist(false)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  !showWatchlist
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                全部股票
              </button>
            </div>
          </div>
          
          {/* 熱門股票切換 - 只在顯示全部股票時顯示 */}
          {!showWatchlist && (
            <div className="flex items-center justify-center space-x-2 mb-4">
              <span className="text-sm text-gray-600">顯示範圍：</span>
              <button
                onClick={() => setShowHotStocks(true)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  showHotStocks
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                熱門股票
              </button>
              <button
                onClick={() => setShowHotStocks(false)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  !showHotStocks
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                全部股票
              </button>
            </div>
          )}
          
          {/* 關注列表統計 */}
          {showWatchlist && watchlistStats && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-blue-600 font-medium">總計</div>
                  <div className="text-2xl font-bold text-blue-800">{watchlistStats.total}</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">台股</div>
                  <div className="text-2xl font-bold text-blue-800">{watchlistStats.byMarket?.TW || 0}</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">美股</div>
                  <div className="text-2xl font-bold text-blue-800">{watchlistStats.byMarket?.US || 0}</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">ETF</div>
                  <div className="text-2xl font-bold text-blue-800">{watchlistStats.byCategory?.ETF || 0}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 篩選器 - 只在顯示全部股票時顯示 */}
        {!showWatchlist && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 市場選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  市場
                </label>
                <select
                  value={market}
                  onChange={(e) => handleMarketChange(e.target.value as Market | 'ALL')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">全部市場</option>
                  <option value="TW">台股</option>
                  <option value="US">美股</option>
                </select>
              </div>

              {/* 類別篩選 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  類別
                </label>
                <select
                  value={category || 'all'}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部類別</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryDisplayName(cat)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 搜尋 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  搜尋
                </label>
                <input
                  type="text"
                  placeholder="股票代碼或名稱..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 重置按鈕 */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setMarket('ALL');
                    setCategory('');
                    setSearch('');
                  }}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  重置篩選
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">錯誤</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* 載入中 */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500 hover:bg-blue-400 transition ease-in-out duration-150 cursor-not-allowed">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              載入中...
            </div>
          </div>
        )}

        {/* 股票列表 */}
        {!loading && ((showWatchlist && watchlist.length > 0) || (!showWatchlist && symbols.length > 0)) && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      股票代碼
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      股票名稱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      類別
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      市場
                    </th>
                    {showHotStocks && !showWatchlist && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        熱門原因
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(showWatchlist ? watchlist : symbols).map((item, index) => {
                    const symbol = showWatchlist ? {
                      symbol: item.symbol,
                      name: item.name,
                      category: item.category,
                      market: item.market as Market
                    } : item;
                    
                    return (
                      <tr key={`${symbol.symbol}-${symbol.market || market}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{symbol.symbol}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{symbol.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {getCategoryDisplayName(symbol.category)}
                          </span>
                        </td>
                                              <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (symbol.market || market) === 'TW' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {getMarketDisplayName((symbol.market || market) as Market)}
                        </span>
                      </td>
                      {showHotStocks && !showWatchlist && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isHotStock(symbol.symbol, symbol.market || market) && (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                🔥 熱門
                              </span>
                              <span className="text-xs text-gray-600 max-w-xs truncate">
                                {getHotStockReason(symbol.symbol, symbol.market || market)}
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link
                              href={`/${symbol.market || market}/${symbol.symbol}`}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              查看圖表
                            </Link>
                            {!showWatchlist && (
                              <button
                                onClick={() => toggleWatchlist(symbol)}
                                className={`text-sm px-2 py-1 rounded ${
                                  WatchlistManager.isInWatchlist(symbol.symbol, symbol.market || market)
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {WatchlistManager.isInWatchlist(symbol.symbol, symbol.market || market) ? '取消關注' : '關注'}
                              </button>
                            )}
                            {showWatchlist && (
                              <button
                                onClick={() => toggleWatchlist(symbol)}
                                className="text-sm px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                              >
                                移除
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 無資料 */}
        {!loading && ((showWatchlist && watchlist.length === 0) || (!showWatchlist && symbols.length === 0)) && !error && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showWatchlist ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              )}
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {showWatchlist 
                ? '您還沒有關注任何股票' 
                : showHotStocks 
                  ? '沒有找到符合條件的熱門股票'
                  : '沒有找到符合條件的股票'
              }
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {showWatchlist 
                ? '切換到「全部股票」頁面來瀏覽和關注您感興趣的股票'
                : showHotStocks
                  ? '請嘗試調整篩選條件或切換到「全部股票」模式'
                  : '請嘗試調整篩選條件或搜尋關鍵字'
              }
            </p>
            {showWatchlist && (
              <div className="mt-4">
                <button
                  onClick={() => setShowWatchlist(false)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  瀏覽全部股票
                </button>
              </div>
            )}
          </div>
        )}

        {/* 統計資訊 */}
        {!loading && ((showWatchlist && watchlist.length > 0) || (!showWatchlist && symbols.length > 0)) && (
          <div className="mt-6 text-center text-sm text-gray-500">
            顯示 {showWatchlist ? watchlist.length : symbols.length} 檔股票
            {!showWatchlist && showHotStocks && ' (熱門股票)'}
            {!showWatchlist && category && ` (${getCategoryDisplayName(category)}類別)`}
            {!showWatchlist && search && ` (搜尋: "${search}")`}
          </div>
        )}
      </div>
    </div>
  );
}
