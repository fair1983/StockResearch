'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap, ArrowUpRight, ArrowDownRight, Target, Globe, BarChart3 } from 'lucide-react';

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

export default function FullMarketScreenerPage() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [mode, setMode] = useState('quick');
  const [limit, setLimit] = useState(200);
  const [selectedMarkets, setSelectedMarkets] = useState<('US' | 'TW')[]>(['US', 'TW']);

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
                <div className="text-2xl font-bold text-blue-600">200</div>
                <div className="text-sm text-gray-500">總股票數</div>
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

        {/* 統計摘要 */}
        {summary && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              掃描統計
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.total || 0}</div>
                <div className="text-sm text-gray-500">總掃描數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.buy || 0}</div>
                <div className="text-sm text-gray-500">買入建議</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.hold || 0}</div>
                <div className="text-sm text-gray-500">持有建議</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.avoid || 0}</div>
                <div className="text-sm text-gray-500">避免建議</div>
              </div>
            </div>
          </div>
        )}

        {/* 掃描結果 */}
        {scanResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">掃描結果</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">股票</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">市場</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">產業</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">綜合評分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">基本面</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">技術面</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">風險等級</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">建議</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">信心度</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scanResults.map((stock, index) => (
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
                        {(stock.sector && stock.sector !== 'Unknown' && stock.sector !== '不能評定') ? stock.sector : '不能評定'}
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
      </div>
    </div>
  );
}
