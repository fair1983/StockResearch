'use client';

import { useState, useEffect } from 'react';
import { LogConfig, LogLevel } from '@/types';
import { logger } from '@/lib/logger';

interface StockUpdateStatus {
  lastUpdated: string;
  version: string;
  totalStocks: number;
  breakdown: {
    twStocks: number;
    twETFs: number;
    usStocks: number;
    usETFs: number;
  };
}

export default function AdminPage() {
  const [config, setConfig] = useState<LogConfig>(logger.getConfig());
  const [logs, setLogs] = useState<LogLevel[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [stockStatus, setStockStatus] = useState<StockUpdateStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

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

  // 獲取股票列表狀態
  const fetchStockStatus = async () => {
    try {
      const response = await fetch('/api/stocks/update');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStockStatus(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stock status:', error);
    }
  };

  // 更新股票列表
  const updateStockList = async () => {
    setIsUpdating(true);
    setUpdateMessage('正在更新股票列表...');
    
    try {
      const response = await fetch('/api/stocks/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUpdateMessage(`✅ ${data.message}`);
        setStockStatus(data.data);
      } else {
        setUpdateMessage(`❌ ${data.message}`);
      }
    } catch (error) {
      setUpdateMessage(`❌ 更新失敗: ${error}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 初始載入
  useEffect(() => {
    refreshLogs();
    fetchStockStatus();
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
          <p className="text-gray-600">日誌配置、股票列表管理與系統監控</p>
        </div>

        {/* 股票列表管理 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">股票列表管理</h2>
            <button
              onClick={updateStockList}
              disabled={isUpdating}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                isUpdating
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isUpdating ? '更新中...' : '更新股票列表'}
            </button>
          </div>

          {updateMessage && (
            <div className={`mb-4 p-3 rounded-md ${
              updateMessage.includes('✅') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {updateMessage}
            </div>
          )}

          {stockStatus && stockStatus.breakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stockStatus.totalStocks || 0}</div>
                <div className="text-sm text-blue-800">總股票數量</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stockStatus.breakdown.twStocks || 0}</div>
                <div className="text-sm text-green-800">台股股票</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stockStatus.breakdown.twETFs || 0}</div>
                <div className="text-sm text-yellow-800">台股ETF</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{(stockStatus.breakdown.usStocks || 0) + (stockStatus.breakdown.usETFs || 0)}</div>
                <div className="text-sm text-purple-800">美股總數</div>
              </div>
            </div>
          )}

          {stockStatus && (
            <div className="mt-4 text-sm text-gray-600">
              <p>最後更新時間: {stockStatus.lastUpdated ? new Date(stockStatus.lastUpdated).toLocaleString('zh-TW') : '未知'}</p>
              <p>版本: {stockStatus.version || '1.0.0'}</p>
            </div>
          )}
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
