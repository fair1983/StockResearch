'use client';

import { useState, useEffect } from 'react';
import { LogConfig, LogLevel } from '@/types';
import { logger } from '@/lib/logger';

interface StockStats {
  lastUpdated: string;
  totalStocks: number;
  twStocks: number;
  twEtfs: number;
  usStocks: number;
  usEtfs: number;
}

export default function AdminPage() {
  const [config, setConfig] = useState<LogConfig>(logger.getConfig());
  const [logs, setLogs] = useState<LogLevel[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [stockStats, setStockStats] = useState<StockStats | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 更新配置
  const updateConfig = (newConfig: Partial<LogConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    logger.updateConfig(updatedConfig);
  };

  // 重置配置
  const resetConfig = () => {
    logger.resetConfig();
    setConfig(logger.getConfig());
  };

  // 清空日誌
  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  // 導出日誌
  const exportLogs = () => {
    const logData = logger.exportLogs();
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 刷新日誌
  const refreshLogs = () => {
    setLogs(logger.getLogs());
  };

  // 自動刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 載入股票統計
  const loadStockStats = async () => {
    try {
      const response = await fetch('/api/admin/update-stocks');
      const data = await response.json();
      if (data.success) {
        setStockStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stock stats:', error);
    }
  };

  // 更新股票列表
  const handleUpdateStocks = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/admin/update-stocks', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setStockStats(data.stats);
        alert('股票列表更新成功！');
      } else {
        alert(`更新失敗: ${data.error}`);
      }
    } catch (error) {
      alert(`更新失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 初始載入
  useEffect(() => {
    refreshLogs();
    loadStockStats();
  }, []);

  // 獲取日誌等級顏色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 標題 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">系統後台管理</h1>
          <p className="text-gray-600">股票列表管理、日誌配置與監控</p>
        </div>

        {/* 股票列表管理 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">股票列表管理</h2>
            <button
              onClick={handleUpdateStocks}
              disabled={isUpdating}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUpdating ? '更新中...' : '更新股票列表'}
            </button>
          </div>
          
          {stockStats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stockStats.totalStocks}</div>
                <div className="text-sm text-gray-600">總股票數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stockStats.twStocks}</div>
                <div className="text-sm text-gray-600">台股</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stockStats.twEtfs}</div>
                <div className="text-sm text-gray-600">台股 ETF</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stockStats.usStocks}</div>
                <div className="text-sm text-gray-600">美股</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stockStats.usEtfs}</div>
                <div className="text-sm text-gray-600">美股 ETF</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">最後更新</div>
                <div className="text-xs text-gray-500">
                  {new Date(stockStats.lastUpdated).toLocaleString('zh-TW')}
                </div>
              </div>
            </div>
          )}
          
          <p className="text-sm text-gray-500 mt-2">
            點擊按鈕更新股票列表，系統會重新載入 JSON 檔案並更新時間戳
          </p>
        </div>

        {/* 日誌配置 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">日誌配置</h2>
            <div className="space-x-2">
              <button
                onClick={resetConfig}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                重置配置
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* API 日誌 */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">API 日誌</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.api.enabled}
                    onChange={(e) => updateConfig({
                      api: { ...config.api, enabled: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  啟用 API 日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.api.request}
                    onChange={(e) => updateConfig({
                      api: { ...config.api, request: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  請求日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.api.response}
                    onChange={(e) => updateConfig({
                      api: { ...config.api, response: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  回應日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.api.timing}
                    onChange={(e) => updateConfig({
                      api: { ...config.api, timing: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  時間日誌
                </label>
              </div>
            </div>

            {/* Yahoo Finance 日誌 */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Yahoo Finance 日誌</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.yahooFinance.enabled}
                    onChange={(e) => updateConfig({
                      yahooFinance: { ...config.yahooFinance, enabled: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  啟用 Yahoo Finance 日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.yahooFinance.request}
                    onChange={(e) => updateConfig({
                      yahooFinance: { ...config.yahooFinance, request: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  請求日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.yahooFinance.response}
                    onChange={(e) => updateConfig({
                      yahooFinance: { ...config.yahooFinance, response: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  回應日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.yahooFinance.dataRange}
                    onChange={(e) => updateConfig({
                      yahooFinance: { ...config.yahooFinance, dataRange: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  資料範圍日誌
                </label>
              </div>
            </div>

            {/* 前端日誌 */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">前端日誌</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.frontend.enabled}
                    onChange={(e) => updateConfig({
                      frontend: { ...config.frontend, enabled: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  啟用前端日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.frontend.dataFetch}
                    onChange={(e) => updateConfig({
                      frontend: { ...config.frontend, dataFetch: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  資料獲取日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.frontend.chartRender}
                    onChange={(e) => updateConfig({
                      frontend: { ...config.frontend, chartRender: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  圖表渲染日誌
                </label>
              </div>
            </div>

            {/* 系統日誌 */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">系統日誌</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.system.enabled}
                    onChange={(e) => updateConfig({
                      system: { ...config.system, enabled: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  啟用系統日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.system.cache}
                    onChange={(e) => updateConfig({
                      system: { ...config.system, cache: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  快取日誌
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.system.performance}
                    onChange={(e) => updateConfig({
                      system: { ...config.system, performance: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  效能日誌
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 日誌監控 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">日誌監控</h2>
            <div className="space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                自動刷新
              </label>
              <button
                onClick={refreshLogs}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                刷新
              </button>
              <button
                onClick={clearLogs}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                清空
              </button>
              <button
                onClick={exportLogs}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                導出
              </button>
            </div>
          </div>

          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">尚無日誌記錄</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-2">
                  <span className="text-gray-500">[{log.timestamp}]</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-blue-400 ml-2">[{log.category}]</span>
                  <span className="ml-2">{log.message}</span>
                  {log.data && (
                    <div className="ml-4 mt-1 text-gray-400">
                      <pre className="text-xs">{JSON.stringify(log.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
