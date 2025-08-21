'use client';

import { useState, useEffect } from 'react';
import { AnalysisResult, Signal, Recommendation } from '@/lib/ai-analysis-engine';

export default function AIAnalysisPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    market: 'TW',
    symbol: '2330',
    interval: '1d'
  });

  const performAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysis(result.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '分析失敗');
      }
    } catch (error) {
      setError('網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish': return 'text-green-600';
      case 'bearish': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'bullish': return '看漲';
      case 'bearish': return '看跌';
      default: return '中性';
    }
  };

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'buy': return 'bg-green-100 text-green-800 border-green-200';
      case 'sell': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSignalText = (type: string) => {
    switch (type) {
      case 'buy': return '買入';
      case 'sell': return '賣出';
      default: return '觀望';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskText = (risk: string) => {
    switch (risk) {
      case 'low': return '低風險';
      case 'medium': return '中風險';
      case 'high': return '高風險';
      default: return '未知';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">AI 技術分析</h1>
          
          {/* 分析表單 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">市場</label>
              <select
                value={formData.market}
                onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TW">台股</option>
                <option value="US">美股</option>
                <option value="HK">港股</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">股票代碼</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="例如：2330"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">時間週期</label>
              <select
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1d">日K</option>
                <option value="1w">週K</option>
                <option value="1M">月K</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={performAnalysis}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? '分析中...' : '開始分析'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="text-red-800">錯誤: {error}</div>
            </div>
          )}
        </div>

        {/* 分析結果 */}
        {analysis && (
          <div className="space-y-6">
            {/* 概覽卡片 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">分析概覽</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{analysis.symbol}</div>
                  <div className="text-sm text-gray-600">{analysis.market}</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getTrendColor(analysis.analysis.trend)}`}>
                    {getTrendText(analysis.analysis.trend)}
                  </div>
                  <div className="text-sm text-gray-600">趨勢</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analysis.analysis.strength}%</div>
                  <div className="text-sm text-gray-600">強度</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{analysis.analysis.signals.length}</div>
                  <div className="text-sm text-gray-600">信號數</div>
                </div>
              </div>
            </div>

            {/* 分析摘要 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">分析摘要</h2>
              <p className="text-gray-700 leading-relaxed">{analysis.analysis.summary}</p>
            </div>

            {/* 技術信號 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">技術信號</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.analysis.signals.map((signal: Signal, index: number) => (
                  <div key={index} className={`p-4 border rounded-lg ${getSignalColor(signal.type)}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{getSignalText(signal.type)}</span>
                      <span className="text-sm opacity-75">{signal.confidence}% 信心度</span>
                    </div>
                    <div className="text-sm mb-2">
                      <strong>{signal.indicator}</strong>: {signal.description}
                    </div>
                    <div className="text-xs opacity-75">
                      數值: {signal.value.toFixed(2)} | 閾值: {signal.threshold.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 投資建議 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">投資建議</h2>
              <div className="space-y-4">
                {analysis.analysis.recommendations.map((rec: Recommendation, index: number) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getSignalColor(rec.action)}`}>
                          {getSignalText(rec.action)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${getRiskColor(rec.riskLevel)}`}>
                          {getRiskText(rec.riskLevel)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{rec.confidence}% 信心度</span>
                    </div>
                    <p className="text-gray-700 mb-2">{rec.reasoning}</p>
                    <div className="text-sm text-gray-600">建議時間框架: {rec.timeframe}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 免責聲明 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">免責聲明</h3>
              <p className="text-sm text-yellow-700">
                本分析僅供參考，不構成投資建議。投資有風險，請根據自身風險承受能力謹慎決策。
                技術分析具有滯後性，過去的表現不代表未來的結果。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
