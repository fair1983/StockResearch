'use client';

import { useState, useEffect } from 'react';

interface CacheStats {
  totalFiles: number;
  totalSize: number;
  markets: { [key: string]: number };
}

export default function IndicatorsCachePage() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/indicators?action=stats');
      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      } else {
        setError('無法取得快取統計資訊');
      }
    } catch (error) {
      setError('網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async (market?: string, symbol?: string) => {
    try {
      const params = new URLSearchParams();
      params.append('action', 'clear');
      if (market) params.append('market', market);
      if (symbol) params.append('symbol', symbol);

      const response = await fetch(`/api/indicators?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchStats(); // 重新載入統計
      } else {
        alert('清除快取失敗');
      }
    } catch (error) {
      alert('網路錯誤');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="text-gray-500">載入中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="text-red-500">錯誤: {error}</div>
            <button 
              onClick={fetchStats}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重試
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">技術指標快取管理</h1>
            <button 
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重新整理
            </button>
          </div>

          {stats && (
            <>
              {/* 統計概覽 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 text-sm font-medium">總檔案數</div>
                  <div className="text-2xl font-bold text-blue-800">{stats.totalFiles}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-green-600 text-sm font-medium">總大小</div>
                  <div className="text-2xl font-bold text-green-800">{formatFileSize(stats.totalSize)}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-purple-600 text-sm font-medium">支援市場</div>
                  <div className="text-2xl font-bold text-purple-800">{Object.keys(stats.markets).length}</div>
                </div>
              </div>

              {/* 市場詳細資訊 */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">市場詳細資訊</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(stats.markets).map(([market, count]) => (
                    <div key={market} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-800">{market}</div>
                          <div className="text-sm text-gray-600">{count} 個檔案</div>
                        </div>
                        <button 
                          onClick={() => clearCache(market)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          清除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">快取操作</h2>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => clearCache()}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    清除所有快取
                  </button>
                  <button 
                    onClick={() => window.open('/data/indicators', '_blank')}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    開啟快取目錄
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 說明 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">技術指標快取說明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 技術指標快取可以避免重複計算，提高圖表載入速度</li>
              <li>• 快取檔案會自動檢查資料是否變更，確保資料一致性</li>
              <li>• 快取過期時間為 24 小時，過期後會自動重新計算</li>
              <li>• 支援按市場、股票代碼、時間週期分別快取</li>
              <li>• 快取檔案位置：<code className="bg-blue-100 px-1 rounded">data/indicators/</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
