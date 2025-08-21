'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Activity, 
  Zap, 
  Target, 
  Star, 
  DollarSign,
  BarChart3,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';


interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'trend' | 'mean_reversion' | 'momentum' | 'volatility' | 'buy_and_hold' | 'dividend';
  performance: number;
  risk: 'low' | 'medium' | 'high';
  isActive: boolean;
  lastUpdated: string;
}

import { StockRecommendation } from '@/types';

export default function IntelligentStrategyPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [stockRecommendations, setStockRecommendations] = useState<StockRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'strategies' | 'stocks'>('strategies');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [analyzingStocks, setAnalyzingStocks] = useState<Set<string>>(new Set());
  const [cacheStatus, setCacheStatus] = useState<{
    exists: boolean;
    lastUpdated?: string;
    isValid: boolean;
    age?: number;
  } | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchStrategies(),
          fetchStockRecommendations()
        ]);
        
        // 獲取緩存狀態
        const statusResponse = await fetch('/api/stock-recommendations?action=status');
        const statusResult = await statusResponse.json();
        if (statusResult.success) {
          setCacheStatus(statusResult.cacheStatus);
        }
      } catch (error) {
        console.error('初始化數據失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const fetchStrategies = async () => {
    try {
      // 模擬策略數據
      const mockStrategies: Strategy[] = [
        {
          id: '1',
          name: '趨勢跟隨策略',
          description: '基於技術指標識別並跟隨市場趨勢，適合強勢市場',
          type: 'trend',
          performance: 85,
          risk: 'medium',
          isActive: true,
          lastUpdated: new Date().toISOString()
        },
        {
          id: '2',
          name: '均值回歸策略',
          description: '在價格偏離均值時進行反向操作，適合震盪市場',
          type: 'mean_reversion',
          performance: 72,
          risk: 'low',
          isActive: false,
          lastUpdated: new Date().toISOString()
        },
        {
          id: '3',
          name: '動量突破策略',
          description: '捕捉價格突破關鍵阻力位的動量機會',
          type: 'momentum',
          performance: 78,
          risk: 'high',
          isActive: false,
          lastUpdated: new Date().toISOString()
        },
        {
          id: '4',
          name: '波動率策略',
          description: '基於波動率指標進行交易，適合高波動環境',
          type: 'volatility',
          performance: 68,
          risk: 'high',
          isActive: false,
          lastUpdated: new Date().toISOString()
        },
        {
          id: '5',
          name: '買入持有策略',
          description: '長期持有優質股票，享受複利增長',
          type: 'buy_and_hold',
          performance: 92,
          risk: 'low',
          isActive: false,
          lastUpdated: new Date().toISOString()
        },
        {
          id: '6',
          name: '股息策略',
          description: '專注於高股息股票，提供穩定現金流',
          type: 'dividend',
          performance: 75,
          risk: 'low',
          isActive: false,
          lastUpdated: new Date().toISOString()
        }
      ];

      setStrategies(mockStrategies);
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
    }
  };

  const fetchStockRecommendations = async () => {
    try {
      const response = await fetch('/api/stock-recommendations');
      const result = await response.json();
      
      if (result.success) {
        setStockRecommendations(result.data);
        setCacheStatus(result.cacheStatus);
      } else {
        console.error('獲取股票推薦失敗:', result.message);
        // 如果獲取失敗，設置空數組避免無限載入
        setStockRecommendations([]);
      }
    } catch (error) {
      console.error('Failed to fetch stock recommendations:', error);
      // 如果發生錯誤，設置空數組避免無限載入
      setStockRecommendations([]);
    }
  };

  const refreshStockRecommendations = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/stock-recommendations?action=refresh');
      const result = await response.json();
      
      if (result.success) {
        setStockRecommendations(result.data);
        setCacheStatus(result.cacheStatus);
      } else {
        console.error('刷新股票推薦失敗:', result.message);
      }
    } catch (error) {
      console.error('Failed to refresh stock recommendations:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const analyzeSingleStock = async (symbol: string, market: string) => {
    setAnalyzingStocks(prev => new Set(prev).add(symbol));
    try {
      const response = await fetch('/api/hybrid-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'analyze-single',
          symbol,
          market
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 轉換為 StockRecommendation 格式
        const hybridResult = result.data;
        const quote = result.quote; // ✅ 從 API 回傳的 quote 數據
        const stockRecommendation: StockRecommendation = {
          symbol: hybridResult.symbol,
          name: hybridResult.name,
          market: hybridResult.market,
          currentPrice: quote?.price ?? 0, // ✅ 使用即時報價
          priceChange: quote?.change ?? 0,
          priceChangePercent: quote?.changePct ?? 0,
          recommendedStrategy: hybridResult.decision,
          confidence: hybridResult.confidence,
          expectedReturn: hybridResult.expectedReturn,
          riskLevel: (hybridResult.riskLevel === '低風險' ? 'low' : hybridResult.riskLevel === '中風險' ? 'medium' : 'high') as 'low' | 'medium' | 'high' | 'unknown',
          reasoning: hybridResult.reasons?.join('，') || '無分析理由',
          technicalSignals: hybridResult.technicalSignals,
          fundamentalScore: hybridResult.debug?.fundamental || 0,
          technicalScore: hybridResult.debug?.techRule || 0,
          overallScore: hybridResult.overall,
          lastUpdate: hybridResult.lastUpdate,
          isAnalyzed: true
        };
        
        // 更新對應的股票推薦
        setStockRecommendations(prev => 
          prev.map(stock => 
            stock.symbol === symbol ? stockRecommendation : stock
          )
        );
      } else {
        console.error(`混合分析 ${symbol} 失敗:`, result.message);
      }
    } catch (error) {
      console.error(`混合分析 ${symbol} 失敗:`, error);
    } finally {
      setAnalyzingStocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }
  };

  const analyzeBatchStocks = async () => {
    setIsBatchAnalyzing(true);
    try {
      const stocks = stockRecommendations.map(stock => ({
        symbol: stock.symbol,
        market: stock.market
      }));

      const response = await fetch('/api/hybrid-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'analyze-batch',
          stocks
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 轉換為 StockRecommendation 格式
        const hybridResults = result.data;
        const stockRecommendations = hybridResults.map((hybridResult: any): StockRecommendation => {
          // 檢查是否分析成功
          if (!hybridResult.ok || !hybridResult.analysis) {
            // 分析失敗，返回未分析狀態
            return {
              symbol: hybridResult.symbol,
              name: hybridResult.symbol,
              market: hybridResult.market,
              currentPrice: 0,
              priceChange: 0,
              priceChangePercent: 0,
              recommendedStrategy: '未分析',
              confidence: 0,
              expectedReturn: 0,
              riskLevel: 'unknown',
              reasoning: `分析失敗: ${hybridResult.error || '未知錯誤'}`,
              technicalSignals: { trend: 'neutral', momentum: 0, volatility: 0, support: 0, resistance: 0 },
              fundamentalScore: 0,
              technicalScore: 0,
              overallScore: 0,
              lastUpdate: new Date().toISOString(),
              isAnalyzed: false
            };
          }

          // 分析成功，提取分析結果
          const analysis = hybridResult.analysis;
          const quote = hybridResult.quote; // ✅ 從 API 回傳的 quote 數據
          return {
            symbol: analysis.symbol,
            name: analysis.name,
            market: analysis.market,
            currentPrice: quote?.price ?? 0, // ✅ 使用即時報價
            priceChange: quote?.change ?? 0,
            priceChangePercent: quote?.changePct ?? 0,
            recommendedStrategy: analysis.decision,
            confidence: analysis.confidence,
            expectedReturn: analysis.expectedReturn,
            riskLevel: (analysis.riskLevel === '低風險' ? 'low' : analysis.riskLevel === '中風險' ? 'medium' : 'high') as 'low' | 'medium' | 'high' | 'unknown',
            reasoning: analysis.reasons?.join('，') || '無分析理由',
            technicalSignals: analysis.technicalSignals,
            fundamentalScore: analysis.debug?.fundamental || 0,
            technicalScore: analysis.debug?.techRule || 0,
            overallScore: analysis.overall,
            lastUpdate: analysis.lastUpdate,
            isAnalyzed: true
          };
        });
        
        setStockRecommendations(stockRecommendations);
        
        // 顯示分析摘要
        if (result.summary) {
          console.log(`批量分析完成: 總計 ${result.summary.total} 支，成功 ${result.summary.ok} 支，失敗 ${result.summary.failed} 支`);
        }
      } else {
        console.error('批量混合分析失敗:', result.message);
      }
    } catch (error) {
      console.error('批量混合分析失敗:', error);
    } finally {
      setIsBatchAnalyzing(false);
    }
  };



  const switchStrategy = async (strategyName: string) => {
    try {
      // 在實際應用中這裡會調用API來切換策略
      setStrategies(prev => 
        prev.map(strategy => ({
          ...strategy,
          isActive: strategy.name === strategyName
        }))
      );
      
      // 模擬API調用延遲
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Failed to switch strategy:', error);
    }
  };

  const getStrategyIcon = (strategyName: string) => {
    if (strategyName.includes('趨勢')) return <TrendingUp className="h-5 w-5" />;
    if (strategyName.includes('均值')) return <Activity className="h-5 w-5" />;
    if (strategyName.includes('動量')) return <Zap className="h-5 w-5" />;
    if (strategyName.includes('波動')) return <Target className="h-5 w-5" />;
    if (strategyName.includes('買入持有')) return <Star className="h-5 w-5" />;
    if (strategyName.includes('股息')) return <DollarSign className="h-5 w-5" />;
    return <BarChart3 className="h-5 w-5" />;
  };

  const getRiskLevelColor = (riskLevel: 'low' | 'medium' | 'high' | 'unknown') => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'unknown': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: 'bullish' | 'bearish' | 'neutral') => {
    switch (trend) {
      case 'bullish': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'bearish': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'neutral': return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  // ✅ 百分比格式化函數（避免 9500% 問題）
  const fmtPct = (v?: number | null) => {
    if (v == null || Number.isNaN(v)) return '—';
    // 若 v<=1 視為 0~1；否則已是 0~100
    const p = v <= 1 ? v * 100 : v;
    const clamped = Math.max(0, Math.min(100, p));
    return `${Math.round(clamped * 10) / 10}%`;
  };

  /**
   * 將股票代碼轉換為路由格式
   */
  const getStockRoute = (symbol: string, market: string): string => {
    // 移除後綴，轉換為路由格式
    const cleanSymbol = symbol
      .replace('.TW', '')
      .replace('.HK', '')
      .replace('.T', '')
      .replace('.SZ', '')
      .replace('.SS', '');
    
    return `/${market}/${cleanSymbol}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">智能策略管理</h1>
        <p className="text-gray-600">AI 驅動的投資策略推薦與股票分析</p>
      </div>

      {/* 標籤切換 */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={activeTab === 'strategies' ? 'default' : 'outline'}
          onClick={() => setActiveTab('strategies')}
        >
          策略管理
        </Button>
        <Button
          variant={activeTab === 'stocks' ? 'default' : 'outline'}
          onClick={() => setActiveTab('stocks')}
        >
          股票推薦
        </Button>
      </div>

      {/* 策略管理 */}
      {activeTab === 'strategies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy) => (
            <Card key={strategy.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStrategyIcon(strategy.name)}
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  </div>
                  {strategy.isActive && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      啟用中
                    </Badge>
                  )}
                </div>
                <CardDescription>{strategy.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>表現評分</span>
                      <span className="font-medium">{strategy.performance}%</span>
                    </div>
                    <Progress value={strategy.performance} className="h-2" />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Badge className={getRiskLevelColor(strategy.risk)}>
                      {strategy.risk === 'low' ? '低風險' : 
                       strategy.risk === 'medium' ? '中風險' : '高風險'}
                    </Badge>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(strategy.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>

                  <Button
                    onClick={() => switchStrategy(strategy.name)}
                    disabled={strategy.isActive}
                    className="w-full"
                    variant={strategy.isActive ? 'secondary' : 'default'}
                  >
                    {strategy.isActive ? '已啟用' : '啟用策略'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 股票推薦 */}
      {activeTab === 'stocks' && (
        <div className="space-y-6">
          {/* AI 股票推薦摘要 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  AI 股票推薦摘要
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {cacheStatus && (
                    <div className="text-sm text-gray-500">
                      {cacheStatus.exists ? (
                        <span className={`flex items-center ${cacheStatus.isValid ? 'text-green-600' : 'text-orange-600'}`}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {cacheStatus.isValid ? '緩存有效' : '緩存過期'}
                          {cacheStatus.age && (
                            <span className="ml-1">
                              ({Math.round(cacheStatus.age / 60000)}分鐘前)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">無緩存</span>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={analyzeBatchStocks}
                    disabled={isBatchAnalyzing}
                    size="sm"
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <BarChart3 className={`h-4 w-4 mr-1 ${isBatchAnalyzing ? 'animate-spin' : ''}`} />
                    {isBatchAnalyzing ? '混合分析中...' : '批量混合分析'}
                  </Button>
                  <Button
                    onClick={refreshStockRecommendations}
                    disabled={isRefreshing}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? '更新中...' : '刷新數據'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stockRecommendations.length}</div>
                  <div className="text-sm text-gray-600">推薦股票</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(stockRecommendations.reduce((sum, stock) => sum + stock.expectedReturn, 0) / stockRecommendations.length * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">平均預期收益</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(stockRecommendations.reduce((sum, stock) => sum + stock.confidence, 0) / stockRecommendations.length * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">平均信心度</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stockRecommendations.filter(stock => stock.riskLevel === 'low').length}
                  </div>
                  <div className="text-sm text-gray-600">低風險股票</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 股票推薦列表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stockRecommendations.map((stock) => (
              <Card key={stock.symbol} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        <Link 
                          href={getStockRoute(stock.symbol, stock.market)}
                          className="hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {stock.symbol}
                        </Link>
                      </CardTitle>
                      <CardDescription>{stock.name}</CardDescription>
                    </div>
                    <Badge variant="outline">{stock.market}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 價格資訊 */}
                  <div className="flex justify-between items-center">
                    <div>
                      {stock.isAnalyzed === false ? (
                        <div className="text-2xl font-bold text-gray-400">未分析</div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">${stock.currentPrice.toFixed(2)}</div>
                          <div className={`text-sm ${stock.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stock.priceChange >= 0 ? '+' : ''}{stock.priceChange.toFixed(2)} ({stock.priceChangePercent.toFixed(2)}%)
                          </div>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{stock.recommendedStrategy}</div>
                      <Badge className={getRiskLevelColor(stock.riskLevel)}>
                        {stock.riskLevel === 'low' ? '低風險' : 
                         stock.riskLevel === 'medium' ? '中風險' : 
                         stock.riskLevel === 'high' ? '高風險' : '未分析'}
                      </Badge>
                    </div>
                  </div>

                  {/* 評分 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${stock.isAnalyzed === false ? 'text-gray-400' : getScoreColor(stock.fundamentalScore)}`}>
                        {stock.isAnalyzed === false ? '--' : stock.fundamentalScore}
                      </div>
                      <div className="text-xs text-gray-600">基本面</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${stock.isAnalyzed === false ? 'text-gray-400' : getScoreColor(stock.technicalScore)}`}>
                        {stock.isAnalyzed === false ? '--' : stock.technicalScore}
                      </div>
                      <div className="text-xs text-gray-600">技術面</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${stock.isAnalyzed === false ? 'text-gray-400' : getScoreColor(stock.overallScore)}`}>
                        {stock.isAnalyzed === false ? '--' : stock.overallScore}
                      </div>
                      <div className="text-xs text-gray-600">綜合</div>
                    </div>
                  </div>

                  {/* 技術信號 */}
                  {stock.isAnalyzed === false ? (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm font-medium mb-2 text-gray-500">技術信號</div>
                      <div className="text-center text-gray-400 text-sm">
                        <Clock className="h-4 w-4 mx-auto mb-1" />
                        數據收集中，請稍後...
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm font-medium mb-2">技術信號</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span>趨勢:</span>
                          <div className="flex items-center">
                            {getTrendIcon(stock.technicalSignals.trend)}
                            <span className="ml-1">
                              {stock.technicalSignals.trend === 'bullish' ? '看漲' : 
                               stock.technicalSignals.trend === 'bearish' ? '看跌' : '中性'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>動量:</span>
                          <span>{fmtPct(stock.technicalSignals.momentum)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>波動率:</span>
                          <span>{fmtPct(stock.technicalSignals.volatility)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>支撐/阻力:</span>
                          <span>${stock.technicalSignals.support.toFixed(0)} / ${stock.technicalSignals.resistance.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 預期收益和信心度 */}
                  {stock.isAnalyzed === false ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600">預期收益</div>
                        <div className="text-lg font-bold text-gray-400">--</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">信心度</div>
                        <div className="text-lg font-bold text-gray-400">--</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600">預期收益</div>
                        <div className="text-lg font-bold text-green-600">
                          {fmtPct(stock.expectedReturn)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">信心度</div>
                        <div className="text-lg font-bold text-blue-600">
                          {fmtPct(stock.confidence)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 推薦理由 */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 mb-1">推薦理由</div>
                    <div className="text-sm text-blue-800">{stock.reasoning}</div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex justify-center space-x-2 pt-2">
                    <Button
                      onClick={() => analyzeSingleStock(stock.symbol, stock.market)}
                      disabled={analyzingStocks.has(stock.symbol)}
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <BarChart3 className={`h-4 w-4 mr-1 ${analyzingStocks.has(stock.symbol) ? 'animate-spin' : ''}`} />
                      {analyzingStocks.has(stock.symbol) ? '分析中...' : '混合分析'}
                    </Button>
                    <Link 
                      href={getStockRoute(stock.symbol, stock.market)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      查看 K 線圖
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}