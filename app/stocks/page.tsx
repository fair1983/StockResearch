'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StockSearch from '@/components/StockSearch';
import { logger } from '@/lib/logger';

interface Stock {
  symbol: string;
  name: string;
  category: string;
  market: string;
  source?: string;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [useYahoo, setUseYahoo] = useState(false);

  // 載入本地股票資料
  useEffect(() => {
    loadLocalStocks();
  }, []);

  const loadLocalStocks = async () => {
    try {
      const response = await fetch('/api/search-stocks?q=&limit=1000&yahoo=false');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStocks(data.data);
        }
      }
    } catch (error) {
      logger.frontend.error('Load stocks error', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜尋股票
  const searchStocks = async (query: string) => {
    if (!query.trim()) {
      loadLocalStocks();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search-stocks?q=${encodeURIComponent(query)}&limit=100&yahoo=${useYahoo}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStocks(data.data);
        }
      }
    } catch (error) {
      logger.frontend.error('Search stocks error', error);
    } finally {
      setLoading(false);
    }
  };

  // 處理搜尋
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchStocks(query);
  };

  // 過濾股票
  const filteredStocks = stocks.filter(stock => {
    const marketMatch = selectedMarket === 'all' || stock.market === selectedMarket;
    const categoryMatch = selectedCategory === 'all' || stock.category === selectedCategory;
    return marketMatch && categoryMatch;
  });

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

  const getSourceDisplay = (source?: string) => {
    if (!source || source === 'local') return '本地';
    if (source === 'yahoo') return 'Yahoo';
    return source;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">股票列表</h1>
          <p className="mt-2 text-gray-600">
            瀏覽和搜尋所有可用的股票、ETF 和其他金融商品
          </p>
        </div>

        {/* 搜尋區域 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">搜尋股票</h2>
            <StockSearch 
              placeholder="輸入股票代碼或名稱搜尋..."
              showYahooToggle={true}
              showAddToLocal={true}
              className="max-w-2xl"
            />
          </div>

          {/* 進階搜尋選項 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                市場
              </label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部市場</option>
                <option value="TW">台股</option>
                <option value="US">美股</option>
                <option value="HK">港股</option>
                <option value="JP">日股</option>
                <option value="EU">歐股</option>
                <option value="ASIA">亞股</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                類型
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部類型</option>
                <option value="stock">股票</option>
                <option value="etf">ETF</option>
                <option value="index">指數</option>
                <option value="crypto">加密貨幣</option>
                <option value="currency">貨幣</option>
                <option value="future">期貨</option>
                <option value="option">期權</option>
                <option value="mutualfund">基金</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedMarket('all');
                  setSelectedCategory('all');
                  setSearchQuery('');
                  loadLocalStocks();
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                重置篩選
              </button>
            </div>
          </div>
        </div>

        {/* 統計資訊 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredStocks.length}</div>
              <div className="text-sm text-gray-600">總數量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredStocks.filter(s => s.source === 'local').length}
              </div>
              <div className="text-sm text-gray-600">本地資料</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredStocks.filter(s => s.source === 'yahoo').length}
              </div>
              <div className="text-sm text-gray-600">Yahoo 資料</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(filteredStocks.map(s => s.market)).size}
              </div>
              <div className="text-sm text-gray-600">市場數量</div>
            </div>
          </div>
        </div>

        {/* 股票列表 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              股票列表 ({filteredStocks.length} 項)
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">載入中...</p>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">沒有找到符合條件的股票</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      股票代碼
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      名稱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      市場
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      類型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      來源
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStocks.map((stock, index) => (
                    <tr key={`${stock.market}-${stock.symbol}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{stock.symbol}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{stock.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getMarketDisplay(stock.market)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {getCategoryDisplay(stock.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stock.source === 'yahoo' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getSourceDisplay(stock.source)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/${stock.market}/${stock.symbol}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          查看詳情
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
