'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react';

interface ScreenerResult {
  symbol: string;
  market: string;
  name: string;
  // 兼容欄位
  price: number;
  change: number;
  changePct: number;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  fundamentalScore: number;
  technicalScore: number;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
  confidence: number;
  recommendedStrategy: 'Buy' | 'Hold' | 'Avoid';
  reasoning: string;
  technicalSignals: {
    trend: 'bullish' | 'neutral';
    momentum: number;
    volatility: number;
    support: number;
    resistance: number;
  };
}

interface ReboundResult {
  symbol: string;
  market: string;
  reboundScore: number;
  rules: string[];
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
}

// ✅ 修補 2：前端 Screener 頁加防呆 Normalizer
function normalizeRow(r: any) {
  const price = r.price ?? r.currentPrice ?? 0;
  const change = r.change ?? r.priceChange ?? 0;

  // 若後端給的是小數(0~1)，轉成百分數；若已經是百分數就直接用
  const changePct =
    typeof r.changePct === 'number' ? r.changePct :
    typeof r.priceChangePercent === 'number' ? r.priceChangePercent :
    0;

  // 小數(0~1) 轉給 UI 的百分數
  const expectedReturnPct = typeof r.expectedReturn === 'number' ? r.expectedReturn * 100 : (r.expectedReturnPct ?? 0);
  const confidencePct     = typeof r.confidence === 'number' ? r.confidence * 100 : (r.confidencePct ?? 0);

  return {
    symbol: r.symbol,
    market: r.market,
    name: r.name ?? r.symbol,
    price,
    change,
    changePct,
    fundamentalScore: r.fundamentalScore ?? r.scores?.fundamental ?? '--',
    technicalScore:   r.technicalScore   ?? r.scores?.technical   ?? '--',
    overallScore:     r.overallScore     ?? r.scores?.overall     ?? '--',
    riskLevel:        r.riskLevel ?? 'medium',
    expectedReturn:   expectedReturnPct,
    confidence:       confidencePct,
    recommendedStrategy: r.recommendedStrategy ?? r.strategy ?? 'Hold',
    reasoning: r.reasoning ?? r.summary ?? '',
    technicalSignals: r.technicalSignals ?? { trend:'neutral', momentum:0, volatility:0, support:0, resistance:0 },
    isAnalyzed: r.isAnalyzed ?? true,
  };
}

export default function MarketScreenerPage() {
  const [screenerResults, setScreenerResults] = useState<ScreenerResult[]>([]);
  const [reboundResults, setReboundResults] = useState<ReboundResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReboundLoading, setIsReboundLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('screener');

  const runScreener = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/screener?market=ALL&limit=200&minScore=50');
      
      const result = await response.json();
      if (result.success) {
        const normalizedData = result.data.map(normalizeRow);
        setScreenerResults(normalizedData);
        // ✅ 不要在 render 裡 setState：把任何 setState(...) 放進 useEffect
        setSummary({
          total: result.total,
          buy: normalizedData.filter((r: any) => r.recommendedStrategy === 'Buy').length,
          hold: normalizedData.filter((r: any) => r.recommendedStrategy === 'Hold').length,
          avoid: normalizedData.filter((r: any) => r.recommendedStrategy === 'Avoid').length,
          avgScore: +(normalizedData.reduce((sum: number, r: any) => sum + (r.overallScore || 0), 0) / normalizedData.length).toFixed(2)
        });
      }
    } catch (error) {
      console.error('掃描失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runReboundRadar = async () => {
    setIsReboundLoading(true);
    try {
      const response = await fetch('/api/rebound-radar?market=ALL&limit=20');
      const result = await response.json();
      if (result.success) {
        setReboundResults(result.data.map((item: any) => ({
          symbol: item.symbol,
          market: item.market,
          reboundScore: item.score,
          rules: item.reason.split('、'),
          currentPrice: item.price,
          priceChange: 0,
          priceChangePercent: 0
        })));
      }
    } catch (error) {
      console.error('反轉雷達失敗:', error);
    } finally {
      setIsReboundLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Buy': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'Hold': return <Minus className="h-4 w-4 text-yellow-600" />;
      case 'Avoid': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Buy': return 'bg-green-100 text-green-800 border-green-200';
      case 'Hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Avoid': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // ✅ 不要在 render 裡 setState：把任何 setState(...) 放進 useEffect
  useEffect(() => {
    const initializeData = async () => {
      await runScreener();
      await runReboundRadar();
    };
    initializeData();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">市場分析</h1>
          <p className="text-gray-600">深度技術分析 - 支援200支股票分析，提供詳細的買賣建議和風險評估</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={runScreener} 
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '掃描中...' : '重新掃描'}
          </button>
          <button 
            onClick={runReboundRadar} 
            disabled={isReboundLoading}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <Zap className={`h-4 w-4 mr-2 ${isReboundLoading ? 'animate-spin' : ''}`} />
            {isReboundLoading ? '掃描中...' : '反轉雷達'}
          </button>
        </div>
      </div>

      {/* 摘要統計 */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">掃描摘要</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
              <div className="text-sm text-gray-600">總股票數</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.buy}</div>
              <div className="text-sm text-gray-600">買進建議</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.hold}</div>
              <div className="text-sm text-gray-600">持有建議</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.avoid}</div>
              <div className="text-sm text-gray-600">避免建議</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{summary.avgScore}</div>
              <div className="text-sm text-gray-600">平均分數</div>
            </div>
          </div>
        </div>
      )}

      {/* 標籤頁 */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('screener')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'screener'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              多因子選股
            </button>
            <button
              onClick={() => setActiveTab('rebound')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rebound'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              反轉雷達
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'screener' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {screenerResults.map((stock) => (
                <div key={stock.symbol} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{stock.symbol}</h3>
                      <p className="text-sm text-gray-600">{stock.name || stock.symbol}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{stock.market}</span>
                      <span className={`px-2 py-1 text-xs rounded ${getActionColor(stock.recommendedStrategy)}`}>
                        {getActionIcon(stock.recommendedStrategy)}
                        <span className="ml-1">{stock.recommendedStrategy}</span>
                      </span>
                    </div>
                  </div>

                  {/* 價格資訊 - 渲染端皆用「安全取值」 */}
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-2xl font-bold">
                        ${(stock.price ?? 0).toFixed(2)}
                      </div>
                      <div className={`text-sm flex items-center ${(stock.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(stock.change ?? 0) >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {(stock.change ?? 0) >= 0 ? '+' : ''}{(stock.change ?? 0).toFixed(2)}
                        {' '}({(stock.changePct ?? 0).toFixed(2)}%)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(stock.overallScore || 0)}`}>
                        分數: {(stock.overallScore && stock.overallScore > 0) ? stock.overallScore : '不能評定'}
                      </div>
                      <div className="text-sm text-gray-600">
                        信心度: {(stock.confidence && stock.confidence > 0) ? `${Math.round(stock.confidence)}%` : '不能評定'}
                      </div>
                    </div>
                  </div>

                  {/* 技術信號 */}
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <div className="text-sm font-medium mb-2">技術信號</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span>趨勢:</span>
                        <span>{stock.technicalSignals?.trend === 'bullish' ? '看漲' : '中性'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>動量:</span>
                        <span>{Math.round((stock.technicalSignals?.momentum || 0) * 100)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>波動率:</span>
                        <span>{Math.round((stock.technicalSignals?.volatility || 0) * 100)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>支撐/阻力:</span>
                        <span>${(stock.technicalSignals?.support || 0).toFixed(0)} / ${(stock.technicalSignals?.resistance || 0).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 建議 */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 mb-1">建議</div>
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>{stock.reasoning}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rebound' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reboundResults.map((stock) => (
                <div key={stock.symbol} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{stock.symbol}</h3>
                      <p className="text-sm text-gray-600">{stock.market}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{stock.market}</span>
                      <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 border border-orange-200 rounded">
                        <Zap className="h-4 w-4 mr-1" />
                        反轉
                      </span>
                    </div>
                  </div>

                  {/* 價格資訊 */}
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-2xl font-bold">${stock.currentPrice.toFixed(2)}</div>
                      <div className={`text-sm flex items-center ${stock.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.priceChangePercent >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {stock.priceChangePercent >= 0 ? '+' : ''}{(stock.priceChangePercent * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">
                        反轉分數: {stock.reboundScore}
                      </div>
                    </div>
                  </div>

                  {/* 觸發規則 */}
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-orange-900 mb-2">觸發規則</div>
                    <div className="space-y-1">
                      {stock.rules.map((rule, index) => (
                        <div key={index} className="text-sm text-orange-800 flex items-center">
                          <Target className="h-3 w-3 mr-2" />
                          {rule}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
