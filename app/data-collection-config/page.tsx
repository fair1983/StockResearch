'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  RefreshCw, 
  Settings, 
  Clock, 
  Globe, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload
} from 'lucide-react';

interface CollectionConfig {
  enabled: boolean;
  autoStart: boolean;
  scheduleInterval: string;
  updateInterval: number;
  maxAgeHours: number;
  collector: {
    maxConcurrent: number;
    delayBetweenRequests: number;
    retryAttempts: number;
    batchSize: number;
    timeout: number;
    batchDelay: number;
  };
  markets: {
    [market: string]: {
      enabled: boolean;
      priority: number;
      updateInterval?: number;
      maxConcurrent?: number;
    };
  };
  monitoring: {
    enabled: boolean;
    refreshInterval: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    maxLogRetention: number;
  };
  performance: {
    enableThrottling: boolean;
    adaptiveThrottling: boolean;
    maxMemoryUsage: number;
    cleanupInterval: number;
  };
}

export default function DataCollectionConfig() {
  const [config, setConfig] = useState<CollectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data-collection?action=config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.data);
      }
    } catch (err) {
      setError('載入配置失敗');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updates: Partial<CollectionConfig>, configType: string) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/data-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateConfig',
          configType,
          updates
        })
      });

      if (response.ok) {
        setSuccess('配置已儲存');
        await fetchConfig(); // 重新載入配置
      } else {
        const errorData = await response.json();
        setError(errorData.error || '儲存失敗');
      }
    } catch (err) {
      setError('儲存配置失敗');
    } finally {
      setSaving(false);
    }
  };

  const setInterval = async (interval?: string, hours?: number) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/data-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setInterval',
          interval,
          hours
        })
      });

      if (response.ok) {
        setSuccess('時間間隔已更新');
        await fetchConfig();
      } else {
        const errorData = await response.json();
        setError(errorData.error || '更新失敗');
      }
    } catch (err) {
      setError('更新時間間隔失敗');
    } finally {
      setSaving(false);
    }
  };

  const setMarketInterval = async (market: string, hours: number) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/data-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setMarketInterval',
          marketCode: market,
          marketHours: hours
        })
      });

      if (response.ok) {
        setSuccess(`市場 ${market} 更新間隔已更新`);
        await fetchConfig();
      } else {
        const errorData = await response.json();
        setError(errorData.error || '更新失敗');
      }
    } catch (err) {
      setError('更新市場間隔失敗');
    } finally {
      setSaving(false);
    }
  };

  const exportConfig = () => {
    if (!config) return;
    
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collection-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const configJson = e.target?.result as string;
        const response = await fetch('/api/data-collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateConfig',
            configType: 'basic',
            updates: JSON.parse(configJson)
          })
        });

        if (response.ok) {
          setSuccess('配置已匯入');
          await fetchConfig();
        } else {
          setError('匯入配置失敗');
        }
      } catch (err) {
        setError('匯入配置失敗');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">載入配置中...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>無法載入配置</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">資料收集配置</h1>
        <div className="flex gap-2">
          <Button onClick={exportConfig} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            匯出配置
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={importConfig}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                匯入配置
              </span>
            </Button>
          </label>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">基本設定</TabsTrigger>
          <TabsTrigger value="intervals">時間間隔</TabsTrigger>
          <TabsTrigger value="markets">市場配置</TabsTrigger>
          <TabsTrigger value="collector">收集器設定</TabsTrigger>
          <TabsTrigger value="monitoring">監控設定</TabsTrigger>
          <TabsTrigger value="performance">效能設定</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                基本設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">啟用資料收集</Label>
                <Switch
                  id="enabled"
                  checked={config.enabled}
                  onCheckedChange={(checked) => {
                    setConfig({ ...config, enabled: checked });
                    saveConfig({ enabled: checked }, 'basic');
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoStart">自動啟動</Label>
                <Switch
                  id="autoStart"
                  checked={config.autoStart}
                  onCheckedChange={(checked) => {
                    setConfig({ ...config, autoStart: checked });
                    saveConfig({ autoStart: checked }, 'basic');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAge">最大年齡（小時）</Label>
                <Input
                  id="maxAge"
                  type="number"
                  value={config.maxAgeHours}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setConfig({ ...config, maxAgeHours: value });
                  }}
                  onBlur={() => saveConfig({ maxAgeHours: config.maxAgeHours }, 'basic')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intervals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                時間間隔設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleInterval">排程間隔 (Cron 表達式)</Label>
                <Input
                  id="scheduleInterval"
                  value={config.scheduleInterval}
                  onChange={(e) => {
                    setConfig({ ...config, scheduleInterval: e.target.value });
                  }}
                  onBlur={() => setInterval(config.scheduleInterval)}
                  placeholder="0 */4 * * *"
                />
                <p className="text-sm text-gray-600">
                  範例: 0 */4 * * * (每4小時), 0 */2 * * * (每2小時), 0 */6 * * * (每6小時)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="updateInterval">更新間隔（小時）</Label>
                <Input
                  id="updateInterval"
                  type="number"
                  value={config.updateInterval}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setConfig({ ...config, updateInterval: value });
                  }}
                  onBlur={() => setInterval(undefined, config.updateInterval)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                市場配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(config.markets).map(([market, marketConfig]) => (
                <div key={market} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {market === 'TW' ? '台灣股市' : 
                       market === 'US' ? '美國股市' : 
                       market === 'HK' ? '香港股市' : market}
                    </h3>
                    <Badge variant={marketConfig.enabled ? 'default' : 'secondary'}>
                      {marketConfig.enabled ? '啟用' : '停用'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between">
                      <Label>啟用</Label>
                      <Switch
                        checked={marketConfig.enabled}
                        onCheckedChange={(checked) => {
                          const newMarkets = { ...config.markets };
                          newMarkets[market] = { ...newMarkets[market], enabled: checked };
                          setConfig({ ...config, markets: newMarkets });
                          saveConfig({ markets: newMarkets }, 'market');
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>優先級</Label>
                      <Select
                        value={marketConfig.priority.toString()}
                        onValueChange={(value) => {
                          const newMarkets = { ...config.markets };
                          newMarkets[market] = { ...newMarkets[market], priority: parseInt(value) };
                          setConfig({ ...config, markets: newMarkets });
                          saveConfig({ markets: newMarkets }, 'market');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 (最高)</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="1">1 (最低)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>更新間隔（小時）</Label>
                      <Input
                        type="number"
                        value={marketConfig.updateInterval || config.updateInterval}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setMarketInterval(market, value);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collector" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                收集器設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxConcurrent">最大並發數</Label>
                  <Input
                    id="maxConcurrent"
                    type="number"
                    value={config.collector.maxConcurrent}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        collector: { ...config.collector, maxConcurrent: value }
                      });
                    }}
                    onBlur={() => saveConfig({ collector: config.collector }, 'collector')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchSize">批次大小</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    value={config.collector.batchSize}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        collector: { ...config.collector, batchSize: value }
                      });
                    }}
                    onBlur={() => saveConfig({ collector: config.collector }, 'collector')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delayBetweenRequests">請求間隔 (ms)</Label>
                  <Input
                    id="delayBetweenRequests"
                    type="number"
                    value={config.collector.delayBetweenRequests}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        collector: { ...config.collector, delayBetweenRequests: value }
                      });
                    }}
                    onBlur={() => saveConfig({ collector: config.collector }, 'collector')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">超時時間 (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={config.collector.timeout}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        collector: { ...config.collector, timeout: value }
                      });
                    }}
                    onBlur={() => saveConfig({ collector: config.collector }, 'collector')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retryAttempts">重試次數</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    value={config.collector.retryAttempts}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        collector: { ...config.collector, retryAttempts: value }
                      });
                    }}
                    onBlur={() => saveConfig({ collector: config.collector }, 'collector')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchDelay">批次間隔 (ms)</Label>
                  <Input
                    id="batchDelay"
                    type="number"
                    value={config.collector.batchDelay}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        collector: { ...config.collector, batchDelay: value }
                      });
                    }}
                    onBlur={() => saveConfig({ collector: config.collector }, 'collector')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                監控設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="monitoringEnabled">啟用監控</Label>
                <Switch
                  id="monitoringEnabled"
                  checked={config.monitoring.enabled}
                  onCheckedChange={(checked) => {
                    setConfig({
                      ...config,
                      monitoring: { ...config.monitoring, enabled: checked }
                    });
                    saveConfig({ monitoring: { ...config.monitoring, enabled: checked } }, 'monitoring');
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refreshInterval">刷新間隔 (ms)</Label>
                  <Input
                    id="refreshInterval"
                    type="number"
                    value={config.monitoring.refreshInterval}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        monitoring: { ...config.monitoring, refreshInterval: value }
                      });
                    }}
                    onBlur={() => saveConfig({ monitoring: config.monitoring }, 'monitoring')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logLevel">日誌等級</Label>
                  <Select
                    value={config.monitoring.logLevel}
                    onValueChange={(value: 'debug' | 'info' | 'warn' | 'error') => {
                      setConfig({
                        ...config,
                        monitoring: { ...config.monitoring, logLevel: value }
                      });
                      saveConfig({ monitoring: { ...config.monitoring, logLevel: value } }, 'monitoring');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxLogRetention">日誌保留天數</Label>
                  <Input
                    id="maxLogRetention"
                    type="number"
                    value={config.monitoring.maxLogRetention}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        monitoring: { ...config.monitoring, maxLogRetention: value }
                      });
                    }}
                    onBlur={() => saveConfig({ monitoring: config.monitoring }, 'monitoring')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                效能設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableThrottling">啟用限流</Label>
                <Switch
                  id="enableThrottling"
                  checked={config.performance.enableThrottling}
                  onCheckedChange={(checked) => {
                    setConfig({
                      ...config,
                      performance: { ...config.performance, enableThrottling: checked }
                    });
                    saveConfig({ performance: { ...config.performance, enableThrottling: checked } }, 'performance');
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="adaptiveThrottling">自適應限流</Label>
                <Switch
                  id="adaptiveThrottling"
                  checked={config.performance.adaptiveThrottling}
                  onCheckedChange={(checked) => {
                    setConfig({
                      ...config,
                      performance: { ...config.performance, adaptiveThrottling: checked }
                    });
                    saveConfig({ performance: { ...config.performance, adaptiveThrottling: checked } }, 'performance');
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxMemoryUsage">最大記憶體使用量 (MB)</Label>
                  <Input
                    id="maxMemoryUsage"
                    type="number"
                    value={config.performance.maxMemoryUsage}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        performance: { ...config.performance, maxMemoryUsage: value }
                      });
                    }}
                    onBlur={() => saveConfig({ performance: config.performance }, 'performance')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cleanupInterval">清理間隔（小時）</Label>
                  <Input
                    id="cleanupInterval"
                    type="number"
                    value={config.performance.cleanupInterval}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setConfig({
                        ...config,
                        performance: { ...config.performance, cleanupInterval: value }
                      });
                    }}
                    onBlur={() => saveConfig({ performance: config.performance }, 'performance')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
