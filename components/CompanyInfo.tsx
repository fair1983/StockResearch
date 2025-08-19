'use client';

import { useState, useEffect } from 'react';
import { getStockInfo } from '@/lib/stock-utils';

interface CompanyInfoProps {
  market: string;
  symbol: string;
  data: any[];
}

interface NewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  url?: string;
}

export default function CompanyInfo({ market, symbol, data }: CompanyInfoProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'statistics' | 'news'>('overview');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fundamentals, setFundamentals] = useState<any | null>(null);
  const [fundLoading, setFundLoading] = useState<boolean>(false);
  const [fundError, setFundError] = useState<string | null>(null);

  const stockInfo = getStockInfo(market, symbol);

  // 模擬新聞資料
  const mockNews: NewsItem[] = [
    {
      title: `${stockInfo?.name || symbol} 最新財報表現亮眼`,
      summary: '公司公布最新季度財報，營收和獲利均優於市場預期，股價有望持續上漲。',
      date: '2025-08-18',
      source: '財經日報',
      url: 'https://www.cmoney.tw/finance/f00025.aspx'
    },
    {
      title: `${stockInfo?.name || symbol} 宣布新產品線擴展計畫`,
      summary: '公司宣布將投入新產品研發，預計將為未來營收帶來新的成長動能。',
      date: '2025-08-17',
      source: '科技新聞',
      url: 'https://technews.tw/'
    },
    {
      title: `${stockInfo?.name || symbol} 與國際大廠簽署合作協議`,
      summary: '公司與國際知名企業簽署戰略合作協議，將共同開發新技術和市場。',
      date: '2025-08-16',
      source: '商業週刊',
      url: 'https://www.businessweekly.com.tw/'
    },
    {
      title: `${stockInfo?.name || symbol} 股價創新高，分析師看好後市`,
      summary: '在強勁的基本面支撐下，分析師紛紛調高目標價，看好公司未來發展。',
      date: '2025-08-15',
      source: '投資分析',
      url: 'https://www.moneydj.com/'
    }
  ];

  useEffect(() => {
    setNews(mockNews);
  }, [symbol]);

  // 取得基本面資料
  useEffect(() => {
    let cancelled = false;
    const fetchFundamentals = async () => {
      try {
        setFundLoading(true);
        setFundError(null);
        const url = new URL('/api/fundamentals', window.location.origin);
        url.searchParams.set('market', market);
        url.searchParams.set('symbol', symbol);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || '未知錯誤');
        if (!cancelled) setFundamentals(json.data || null);
      } catch (e: any) {
        if (!cancelled) setFundError(e?.message || '取得基本面失敗');
      } finally {
        if (!cancelled) setFundLoading(false);
      }
    };
    fetchFundamentals();
    return () => { cancelled = true; };
  }, [market, symbol]);

  // 計算詳細統計資料
  const calculateStats = () => {
    if (!data || data.length === 0) return null;

    const latest = data[data.length - 1];
    const prev = data[data.length - 2];
    const weekAgo = data[Math.max(0, data.length - 5)];
    const monthAgo = data[Math.max(0, data.length - 20)];
    
    const priceChange = latest.close - prev.close;
    const priceChangePercent = (priceChange / prev.close) * 100;
    const weekChange = latest.close - weekAgo.close;
    const weekChangePercent = (weekChange / weekAgo.close) * 100;
    const monthChange = latest.close - monthAgo.close;
    const monthChangePercent = (monthChange / monthAgo.close) * 100;
    
    const avgVolume = data.slice(-20).reduce((sum, item) => sum + (item.volume || 0), 0) / 20;
    const volumeChange = latest.volume - avgVolume;
    const volumeChangePercent = (volumeChange / avgVolume) * 100;
    
    // 計算波動率
    const returns = data.slice(-20).map((d, i, arr) => {
      if (i === 0) return 0;
      return (d.close - arr[i-1].close) / arr[i-1].close;
    });
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100;
    
    return {
      currentPrice: latest.close,
      priceChange,
      priceChangePercent,
      weekChange,
      weekChangePercent,
      monthChange,
      monthChangePercent,
      volume: latest.volume,
      avgVolume: Math.round(avgVolume),
      volumeChange,
      volumeChangePercent,
      high: Math.max(...data.slice(-20).map(d => d.high)),
      low: Math.min(...data.slice(-20).map(d => d.low)),
      open: latest.open,
      volatility: volatility.toFixed(2)
    };
  };

  const stats = calculateStats();

  const extractNumber = (v: any): number | undefined => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'number') return v;
    if (typeof v === 'object') {
      if (typeof v.raw === 'number') return v.raw;
      if (typeof v.fmt === 'string') {
        const n = Number(String(v.fmt).replace(/[^\d.\-]/g, ''));
        return isNaN(n) ? undefined : n;
      }
    }
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    if (num <= -1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num <= -1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num <= -1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatPercent = (v?: number) => {
    if (v === null || v === undefined || isNaN(v)) return '-';
    return `${(v * 100).toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? '↗' : '↘';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full min-w-[320px]">
      {/* 標題欄 */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">市場數據</h2>
        <p className="text-sm text-gray-500">{stockInfo?.name || symbol}</p>
      </div>

      {/* 標籤頁 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          概覽
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'statistics'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          統計
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'news'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          新聞
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'overview' && stats && (
          <div className="space-y-4">
            {/* 主要價格資訊 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  ${stats.currentPrice.toFixed(2)}
                </span>
                <div className={`flex items-center text-lg font-semibold ${getChangeColor(stats.priceChangePercent)}`}>
                  <span className="mr-1">{stats.priceChangePercent >= 0 ? '↗' : '↘'}</span>
                  {stats.priceChangePercent >= 0 ? '+' : ''}{stats.priceChangePercent.toFixed(2)}%
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange.toFixed(2)} ({stats.priceChangePercent >= 0 ? '+' : ''}{stats.priceChangePercent.toFixed(2)}%)
              </div>
            </div>

            {/* 價格範圍 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1 break-words">開盤</div>
                <div className="text-sm font-semibold break-words">${stats.open.toFixed(2)}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1 break-words">成交量</div>
                <div className="text-sm font-semibold break-words">{formatNumber(stats.volume)}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1 break-words">20日最高</div>
                <div className="text-sm font-semibold break-words">${stats.high.toFixed(2)}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1 break-words">20日最低</div>
                <div className="text-sm font-semibold break-words">${stats.low.toFixed(2)}</div>
              </div>
            </div>

            {/* 基本面精選（概覽） */}
            {fundLoading && (
              <div className="text-sm text-gray-500">基本面載入中...</div>
            )}
            {fundError && (
              <div className="text-sm text-red-500">{fundError}</div>
            )}
            {fundamentals && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1 break-words">市值</div>
                  <div className="text-sm font-semibold break-words">{formatNumber(extractNumber(fundamentals.marketCap) || 0)}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1 break-words">本益比 (TTM)</div>
                  <div className="text-sm font-semibold break-words">{extractNumber(fundamentals.trailingPE)?.toFixed(2) || '-'}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1 break-words">股價淨值比 (P/B)</div>
                  <div className="text-sm font-semibold break-words">{extractNumber(fundamentals.priceToBook)?.toFixed(2) || '-'}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1 break-words">股利率</div>
                  <div className="text-sm font-semibold break-words">{formatPercent(extractNumber(fundamentals.dividendYield))}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && stats && (
          <div className="space-y-4">
            {/* 成交量分析 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">成交量分析</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">今日成交量</span>
                  <span className="text-sm font-medium">{formatNumber(stats.volume)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">20日平均</span>
                  <span className="text-sm font-medium">{formatNumber(stats.avgVolume)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">成交量變化</span>
                  <div className={`text-sm font-medium ${getChangeColor(stats.volumeChangePercent)}`}>
                    {stats.volumeChangePercent >= 0 ? '+' : ''}{stats.volumeChangePercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 價格統計 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">價格統計</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">52週最高</span>
                  <span className="text-sm font-medium">${(stats.high * 1.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">52週最低</span>
                  <span className="text-sm font-medium">${(stats.low * 0.9).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">年化波動率</span>
                  <span className="text-sm font-medium">{stats.volatility}%</span>
                </div>
              </div>
            </div>

            {/* 估值指標 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">估值指標</h4>
              {fundLoading && <div className="text-xs text-gray-500">載入中...</div>}
              {fundError && <div className="text-xs text-red-500">{fundError}</div>}
              {fundamentals && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">市值</div>
                    <div className="text-sm font-semibold break-words">{formatNumber(extractNumber(fundamentals.marketCap) || 0)}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">企業價值 (EV)</div>
                    <div className="text-sm font-semibold break-words">{formatNumber(extractNumber(fundamentals.enterpriseValue) || 0)}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">本益比 (TTM)</div>
                    <div className="text-sm font-semibold break-words">{extractNumber(fundamentals.trailingPE)?.toFixed(2) || '-'}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">預估本益比 (Forward)</div>
                    <div className="text-sm font-semibold break-words">{extractNumber(fundamentals.forwardPE)?.toFixed(2) || '-'}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">股價淨值比 (P/B)</div>
                    <div className="text-sm font-semibold break-words">{extractNumber(fundamentals.priceToBook)?.toFixed(2) || '-'}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">PEG</div>
                    <div className="text-sm font-semibold break-words">{extractNumber(fundamentals.pegRatio)?.toFixed(2) || '-'}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">股利率</div>
                    <div className="text-sm font-semibold break-words">{formatPercent(extractNumber(fundamentals.dividendYield))}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">配發率</div>
                    <div className="text-sm font-semibold break-words">{formatPercent(extractNumber(fundamentals.payoutRatio))}</div>
                  </div>
                </div>
              )}
            </div>

            {/* 營運表現 */}
            {fundamentals && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">營運表現</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">營收 (Total Revenue)</div>
                    <div className="text-sm font-semibold break-words">{formatNumber(extractNumber(fundamentals.totalRevenue) || 0)}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">營收成長</div>
                    <div className="text-sm font-semibold break-words">{formatPercent(extractNumber(fundamentals.revenueGrowth))}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">毛利率</div>
                    <div className="text-sm font-semibold break-words">{formatPercent(extractNumber(fundamentals.grossMargins))}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">營業利益率</div>
                    <div className="text-sm font-semibold break-words">{formatPercent(extractNumber(fundamentals.operatingMargins))}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">淨利率</div>
                    <div className="text-sm font-semibold break-words">{formatPercent(extractNumber(fundamentals.profitMargins))}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">EPS (TTM)</div>
                    <div className="text-sm font-semibold break-words">{extractNumber(fundamentals.epsTrailingTwelveMonths)?.toFixed(2) || '-'}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 break-words">EBITDA</div>
                    <div className="text-sm font-semibold break-words">{formatNumber(extractNumber(fundamentals.ebitda) || 0)}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500 mb-1 truncate">自由現金流</div>
                    <div className="text-sm font-semibold truncate">{formatNumber(extractNumber(fundamentals.freeCashflow) || 0)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 市場資訊 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">市場資訊</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">交易所</span>
                  <span className="text-sm font-medium">{market === 'TW' ? '台灣證券交易所' : 'NASDAQ'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">股票代碼</span>
                  <span className="text-sm font-medium">{symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">類別</span>
                  <span className="text-sm font-medium">
                    {stockInfo?.category === 'stock' ? '普通股' : 
                     stockInfo?.category === 'etf' ? 'ETF' : '其他'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-3">
            {news.map((item, index) => (
              <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                <div className="flex justify-between items-start mb-1">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer line-clamp-2 flex-1 mr-2 transition-colors"
                  >
                    {item.title}
                  </a>
                  <span className="text-xs text-gray-400 flex-shrink-0">{item.date}</span>
                </div>
                <p className="text-xs text-gray-600 mb-1 line-clamp-2">{item.summary}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">來源: {item.source}</span>
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    閱讀全文 →
                  </a>
                </div>
              </div>
            ))}
            <div className="text-center pt-2">
              <button className="text-blue-500 hover:text-blue-700 text-xs transition-colors">
                查看更多新聞 →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
