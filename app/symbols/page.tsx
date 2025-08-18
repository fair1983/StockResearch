'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Market } from '@/types';
import { logger } from '@/lib/logger';

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

  const fetchSymbols = async () => {
    setLoading(true);
    setError('');
    
    try {
      logger.frontend.dataFetch('Fetching symbols', { market, category, search });
      
      const params = new URLSearchParams();
      if (market !== 'ALL') params.append('market', market);
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/symbols?${params.toString()}`);
      const data: SymbolsResponse = await response.json();
      
      if (response.ok) {
        setSymbols(data.symbols);
        setCategories(data.categories);
        logger.frontend.dataFetch('Symbols fetched successfully', { 
          total: data.total,
          categories: data.categories 
        });
      } else {
        throw new Error(data.error || '無法取得股票列表');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤';
      setError(errorMessage);
      logger.frontend.error('Failed to fetch symbols', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSymbols();
  }, [market, category, search]);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">股票列表</h1>
          <p className="text-gray-600">
            瀏覽台灣和美國的主要股票及 ETF，共 {symbols.length} 檔
          </p>
        </div>

        {/* 篩選器 */}
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
        {!loading && symbols.length > 0 && (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {symbols.map((symbol, index) => (
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
                          {getMarketDisplayName(symbol.market || market as Market)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/${symbol.market || market}/${symbol.symbol}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          查看圖表
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 無資料 */}
        {!loading && symbols.length === 0 && !error && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到符合條件的股票</h3>
            <p className="mt-1 text-sm text-gray-500">請嘗試調整篩選條件或搜尋關鍵字</p>
          </div>
        )}

        {/* 統計資訊 */}
        {!loading && symbols.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            顯示 {symbols.length} 檔股票
            {category && ` (${getCategoryDisplayName(category)}類別)`}
            {search && ` (搜尋: "${search}")`}
          </div>
        )}
      </div>
    </div>
  );
}
