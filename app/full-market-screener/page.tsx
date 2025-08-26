'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap, ArrowUpRight, ArrowDownRight, Target, Globe, BarChart3, Filter, SortAsc, SortDesc } from 'lucide-react';

interface FullMarketStock {
  symbol: string;
  name: string;
  market: 'US' | 'TW';
  exchange: string;
  sector: string;
  industry: string;
  marketCap: number;
  lastUpdated: string;
}

interface ScanResult {
  symbol: string;
  name: string;
  market: 'US' | 'TW';
  exchange: string;
  sector: string;
  overallScore: number;
  fundamentalScore: number;
  technicalScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedStrategy: 'Buy' | 'Hold' | 'Avoid';
  confidence: number;
  reasoning: string;
}

type SortField = 'symbol' | 'market' | 'sector' | 'overallScore' | 'fundamentalScore' | 'technicalScore' | 'riskLevel' | 'recommendedStrategy' | 'confidence';
type SortDirection = 'asc' | 'desc';

export default function FullMarketScreenerPage() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [mode, setMode] = useState('quick');
  const [limit, setLimit] = useState(200);
  const [selectedMarkets, setSelectedMarkets] = useState<('US' | 'TW')[]>(['US', 'TW']);

  // 篩選狀態
  const [filters, setFilters] = useState({
    sector: '',
    minOverallScore: 0,
    maxOverallScore: 100,
    minFundamentalScore: 0,
    maxFundamentalScore: 100,
    minTechnicalScore: 0,
    maxTechnicalScore: 100,
    riskLevel: '',
    recommendedStrategy: '',
    minConfidence: 0,
    maxConfidence: 100,
  });

  // 排序狀態
  const [sortField, setSortField] = useState<SortField>('overallScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 顯示篩選面板
  const [showFilters, setShowFilters] = useState(false);

  /**
   * 將產業代碼轉換為可讀的產業名稱
   */
  const getSectorDisplayName = (sector: string): string => {
    if (!sector || sector === 'Unknown' || sector === '不能評定') {
      return '不能評定';
    }

    // 台股產業代碼映射
    const twSectorMap: { [key: string]: string } = {
      '01': '水泥工業',
      '02': '食品工業',
      '03': '塑膠工業',
      '04': '紡織纖維',
      '05': '電機機械',
      '06': '電器電纜',
      '07': '化學生技醫療',
      '08': '玻璃陶瓷',
      '09': '造紙工業',
      '10': '鋼鐵工業',
      '11': '橡膠工業',
      '12': '汽車工業',
      '13': '電子工業',
      '14': '建材營造',
      '15': '航運業',
      '16': '觀光事業',
      '17': '金融保險',
      '18': '貿易百貨',
      '19': '綜合',
      '20': '其他',
      '21': '油電燃氣業',
      '22': '半導體業',
      '23': '電腦及週邊設備業',
      '24': '光電業',
      '25': '通信網路業',
      '26': '電子零組件業',
      '27': '電子通路業',
      '28': '資訊服務業',
      '29': '其他電子業',
      '30': '文化創意業',
      '31': '農業科技業',
      '32': '電子商務業',
      '33': '居家生活業',
      '34': '數位雲端業',
      '35': '運動休閒業',
      '36': '綠能環保業',
      '37': '生技醫療業',
      '38': '汽車業',
      '39': '半導體業',
      '40': '電腦及週邊設備業',
      '41': '光電業',
      '42': '通信網路業',
      '43': '電子零組件業',
      '44': '電子通路業',
      '45': '資訊服務業',
      '46': '其他電子業',
      '47': '文化創意業',
      '48': '農業科技業',
      '49': '電子商務業',
      '50': '居家生活業'
    };

    // 如果是數字代碼，查找對應的產業名稱
    if (twSectorMap[sector]) {
      return twSectorMap[sector];
    }

    // 如果是英文產業名稱，直接返回
    return sector;
  };

  const runFullMarketScan = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/full-market-screener', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          limit,
          markets: selectedMarkets,
          filters: {}
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setScanResults(result.data.results || []);
        setSummary(result.data.statistics || {});
      } else {
        console.error('掃描失敗:', result.error);
        alert('掃描失敗: ' + result.error);
      }
    } catch (error) {
      console.error('掃描錯誤:', error);
      alert('掃描錯誤: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  // 篩選和排序後的結果
  const filteredAndSortedResults = useMemo(() => {
    let filtered = scanResults.filter(stock => {
      // 產業篩選
      if (filters.sector && getSectorDisplayName(stock.sector) !== filters.sector) {
        return false;
      }

      // 綜合評分篩選
      if (stock.overallScore < filters.minOverallScore || stock.overallScore > filters.maxOverallScore) {
        return false;
      }

      // 基本面評分篩選
      if (stock.fundamentalScore < filters.minFundamentalScore || stock.fundamentalScore > filters.maxFundamentalScore) {
        return false;
      }

      // 技術面評分篩選
      if (stock.technicalScore < filters.minTechnicalScore || stock.technicalScore > filters.maxTechnicalScore) {
        return false;
      }

      // 風險等級篩選
      if (filters.riskLevel && stock.riskLevel !== filters.riskLevel) {
        return false;
      }

      // 建議篩選
      if (filters.recommendedStrategy && stock.recommendedStrategy !== filters.recommendedStrategy) {
        return false;
      }

      // 信心度篩選
      if (stock.confidence < filters.minConfidence || stock.confidence > filters.maxConfidence) {
        return false;
      }

      return true;
    });

    // 排序
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // 特殊處理某些欄位
      if (sortField === 'sector') {
        aValue = getSectorDisplayName(a.sector);
        bValue = getSectorDisplayName(b.sector);
      }

      // 數值排序
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // 字串排序
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0;
    });

    return filtered;
  }, [scanResults, filters, sortField, sortDirection]);

  // 獲取所有可用的產業選項
  const availableSectors = useMemo(() => {
    const sectors = new Set(scanResults.map(stock => getSectorDisplayName(stock.sector)));
    return Array.from(sectors).sort();
  }, [scanResults]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'Buy': return 'text-green-600 bg-green-100';
      case 'Hold': return 'text-yellow-600 bg-yellow-100';
      case 'Avoid': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <SortAsc className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <SortAsc className="w-4 h-4 text-blue-600" /> : 
      <SortDesc className="w-4 h-4 text-blue-600" />;
  };

  const clearFilters = () => {
    setFilters({
      sector: '',
      minOverallScore: 0,
      maxOverallScore: 100,
      minFundamentalScore: 0,
      maxFundamentalScore: 100,
      minTechnicalScore: 0,
      maxTechnicalScore: 100,
      riskLevel: '',
      recommendedStrategy: '',
      minConfidence: 0,
      maxConfidence: 100,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 標題區域 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Globe className="w-8 h-8 text-green-600" />
                全市場掃描器
              </h1>
              <p className="text-gray-600 mt-2">
                大規模市場篩選 - 一次掃描200支股票，快速發現投資機會和市場熱點
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{filteredAndSortedResults.length}</div>
                <div className="text-sm text-gray-500">篩選結果</div>
              </div>
            </div>
          </div>
        </div>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 掃描模式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">掃描模式</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="quick">快速掃描</option>
                <option value="comprehensive">全面分析</option>
                <option value="backtest">回測模式</option>
              </select>
            </div>

            {/* 結果數量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">結果數量</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={50}>前50名</option>
                <option value={100}>前100名</option>
                <option value={200}>全部200支</option>
              </select>
            </div>

            {/* 市場選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">市場選擇</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedMarkets.includes('US')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMarkets([...selectedMarkets, 'US']);
                      } else {
                        setSelectedMarkets(selectedMarkets.filter(m => m !== 'US'));
                      }
                    }}
                    className="mr-2"
                  />
                  美股 (100支)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedMarkets.includes('TW')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMarkets([...selectedMarkets, 'TW']);
                      } else {
                        setSelectedMarkets(selectedMarkets.filter(m => m !== 'TW'));
                      }
                    }}
                    className="mr-2"
                  />
                  台股 (100支)
                </label>
              </div>
            </div>

            {/* 執行按鈕 */}
            <div className="flex items-end">
              <button
                onClick={runFullMarketScan}
                disabled={isLoading || selectedMarkets.length === 0}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    掃描中...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    開始掃描
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 篩選面板 */}
        {scanResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                篩選與排序
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {showFilters ? '隱藏篩選' : '顯示篩選'}
                </button>
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                >
                  清除篩選
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 產業篩選 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">產業</label>
                  <select
                    value={filters.sector}
                    onChange={(e) => setFilters({...filters, sector: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全部產業</option>
                    {availableSectors.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>

                {/* 綜合評分範圍 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">綜合評分範圍</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.minOverallScore}
                      onChange={(e) => setFilters({...filters, minOverallScore: Number(e.target.value)})}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="最小值"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.maxOverallScore}
                      onChange={(e) => setFilters({...filters, maxOverallScore: Number(e.target.value)})}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="最大值"
                    />
                  </div>
                </div>

                {/* 基本面評分範圍 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">基本面評分範圍</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.minFundamentalScore}
                      onChange={(e) => setFilters({...filters, minFundamentalScore: Number(e.target.value)})}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="最小值"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.maxFundamentalScore}
                      onChange={(e) => setFilters({...filters, maxFundamentalScore: Number(e.target.value)})}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="最大值"
                    />
                  </div>
                </div>

                {/* 技術面評分範圍 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">技術面評分範圍</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.minTechnicalScore}
                      onChange={(e) => setFilters({...filters, minTechnicalScore: Number(e.target.value)})}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="最小值"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.maxTechnicalScore}
                      onChange={(e) => setFilters({...filters, maxTechnicalScore: Number(e.target.value)})}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="最大值"
                    />
                  </div>
                </div>

                {/* 風險等級 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">風險等級</label>
                  <select
                    value={filters.riskLevel}
                    onChange={(e) => setFilters({...filters, riskLevel: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全部風險等級</option>
                    <option value="low">低風險</option>
                    <option value="medium">中風險</option>
                    <option value="high">高風險</option>
                  </select>
                </div>

                {/* 建議 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">建議</label>
                  <select
                    value={filters.recommendedStrategy}
                    onChange={(e) => setFilters({...filters, recommendedStrategy: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全部建議</option>
                    <option value="Buy">買入</option>
                    <option value="Hold">持有</option>
                    <option value="Avoid">避免</option>
                  </select>
                </div>

                {/* 信心度範圍 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">信心度範圍</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.minConfidence}
                      onChange={(e) => setFilters({...filters, minConfidence: Number(e.target.value)})}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="最小值"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.maxConfidence}
                      onChange={(e) => setFilters({...filters, maxConfidence: Number(e.target.value)})}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="最大值"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 統計摘要 */}
        {summary && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              掃描統計
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredAndSortedResults.length}</div>
                <div className="text-sm text-gray-500">篩選結果</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{filteredAndSortedResults.filter(r => r.recommendedStrategy === 'Buy').length}</div>
                <div className="text-sm text-gray-500">買入建議</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{filteredAndSortedResults.filter(r => r.recommendedStrategy === 'Hold').length}</div>
                <div className="text-sm text-gray-500">持有建議</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{filteredAndSortedResults.filter(r => r.recommendedStrategy === 'Avoid').length}</div>
                <div className="text-sm text-gray-500">避免建議</div>
              </div>
            </div>
          </div>
        )}

        {/* 掃描結果 */}
        {filteredAndSortedResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">掃描結果 ({filteredAndSortedResults.length} 支股票)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('symbol')}
                    >
                      <div className="flex items-center gap-1">
                        股票
                        {getSortIcon('symbol')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('market')}
                    >
                      <div className="flex items-center gap-1">
                        市場
                        {getSortIcon('market')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('sector')}
                    >
                      <div className="flex items-center gap-1">
                        產業
                        {getSortIcon('sector')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('overallScore')}
                    >
                      <div className="flex items-center gap-1">
                        綜合評分
                        {getSortIcon('overallScore')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('fundamentalScore')}
                    >
                      <div className="flex items-center gap-1">
                        基本面
                        {getSortIcon('fundamentalScore')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('technicalScore')}
                    >
                      <div className="flex items-center gap-1">
                        技術面
                        {getSortIcon('technicalScore')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('riskLevel')}
                    >
                      <div className="flex items-center gap-1">
                        風險等級
                        {getSortIcon('riskLevel')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('recommendedStrategy')}
                    >
                      <div className="flex items-center gap-1">
                        建議
                        {getSortIcon('recommendedStrategy')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('confidence')}
                    >
                      <div className="flex items-center gap-1">
                        信心度
                        {getSortIcon('confidence')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedResults.map((stock, index) => (
                    <tr key={`${stock.symbol}-${stock.market}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{stock.symbol}</div>
                          <div className="text-sm text-gray-500">{stock.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stock.market === 'US' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {stock.market}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getSectorDisplayName(stock.sector)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getScoreColor(stock.overallScore || 0)}`}>
                          {(stock.overallScore && stock.overallScore > 0) ? `${stock.overallScore}/100` : '不能評定'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getScoreColor(stock.fundamentalScore || 0)}`}>
                          {(stock.fundamentalScore && stock.fundamentalScore > 0) ? `${stock.fundamentalScore}/100` : '不能評定'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getScoreColor(stock.technicalScore || 0)}`}>
                          {(stock.technicalScore && stock.technicalScore > 0) ? `${stock.technicalScore}/100` : '不能評定'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getRiskColor(stock.riskLevel || 'medium')}`}>
                          {(stock.riskLevel || 'medium').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStrategyColor(stock.recommendedStrategy || 'Hold')}`}>
                          {stock.recommendedStrategy || 'Hold'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(stock.confidence && stock.confidence > 0) ? `${stock.confidence}%` : '不能評定'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 空狀態 */}
        {!isLoading && scanResults.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">準備開始掃描</h3>
            <p className="text-gray-500 mb-4">
              選擇掃描模式和參數，然後點擊「開始掃描」來分析全市場股票
            </p>
            <button
              onClick={runFullMarketScan}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              開始掃描
            </button>
          </div>
        )}

        {/* 篩選後無結果 */}
        {scanResults.length > 0 && filteredAndSortedResults.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有符合條件的結果</h3>
            <p className="text-gray-500 mb-4">
              請調整篩選條件或清除篩選來查看所有結果
            </p>
            <button
              onClick={clearFilters}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              清除篩選
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
