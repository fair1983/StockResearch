'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Square, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity,
  BarChart3,
  Globe
} from 'lucide-react';

interface SystemStatus {
  isCollecting: boolean;
  activeJobs: number;
  totalJobs: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  lastUpdate: string;
  performance: {
    totalStocksProcessed: number;
    averageSuccessRate: number;
    averageProcessingTime: number;
  };
}

interface CollectionProgress {
  jobId: string;
  type: 'full' | 'update' | 'market';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  progress: {
    total: number;
    completed: number;
    success: number;
    failed: number;
    currentBatch: number;
    totalBatches: number;
    currentStock?: string;
    currentMarket?: string;
  };
  errors: string[];
  performance: {
    averageTimePerStock: number;
    estimatedTimeRemaining: number;
    successRate: number;
    throughput: number;
  };
}

interface MarketProgress {
  market: string;
  total: number;
  completed: number;
  success: number;
  failed: number;
  inProgress: number;
  pending: number;
  progress: number;
}

export default function DataCollectionMonitor() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeJobs, setActiveJobs] = useState<CollectionProgress[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CollectionProgress[]>([]);
  const [marketProgress, setMarketProgress] = useState<MarketProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 自動刷新
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 每5秒刷新
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data-collection?action=progress');
      if (response.ok) {
        const data = await response.json();
        setActiveJobs(data.data.activeJobs || []);
        setCompletedJobs(data.data.completedJobs || []);
        setMarketProgress(data.data.marketProgress || []);
      }

      const statusResponse = await fetch('/api/data-collection?action=status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSystemStatus(statusData.data.systemStatus);
      }
    } catch (err) {
      setError('載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const triggerCollection = async (type: 'full' | 'update' | 'market', markets?: string[]) => {
    try {
      const response = await fetch('/api/data-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger',
          type,
          markets
        })
      });
      
      if (response.ok) {
        await fetchData(); // 刷新資料
      }
    } catch (err) {
      setError('觸發收集失敗');
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-TW');
  };

  if (loading && !systemStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">載入中...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">資料收集監控</h1>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button 
            onClick={() => triggerCollection('update')} 
            disabled={systemStatus?.isCollecting}
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            開始更新
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 系統狀態概覽 */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              系統狀態
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {getHealthIcon(systemStatus.systemHealth)}
                  <span>系統健康度</span>
                </div>
                <Badge className={getHealthColor(systemStatus.systemHealth)}>
                  {systemStatus.systemHealth === 'healthy' ? '正常' : 
                   systemStatus.systemHealth === 'warning' ? '警告' : '錯誤'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span>活躍工作</span>
                <Badge variant="secondary">{systemStatus.activeJobs}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-500" />
                <span>總處理股票</span>
                <Badge variant="secondary">{systemStatus.performance.totalStocksProcessed}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>平均成功率</span>
                <Badge variant="secondary">{systemStatus.performance.averageSuccessRate.toFixed(1)}%</Badge>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              最後更新: {formatDateTime(systemStatus.lastUpdate)}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">活躍工作 ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">已完成工作 ({completedJobs.length})</TabsTrigger>
          <TabsTrigger value="markets">市場進度</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>目前沒有活躍的收集工作</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            activeJobs.map((job) => (
              <Card key={job.jobId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {job.type === 'full' ? '完整收集' : 
                       job.type === 'update' ? '增量更新' : '市場收集'}
                    </div>
                    <Badge variant="secondary">{job.jobId}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>進度</span>
                        <span>{job.progress.completed}/{job.progress.total} ({((job.progress.completed / job.progress.total) * 100).toFixed(1)}%)</span>
                      </div>
                      <Progress value={(job.progress.completed / job.progress.total) * 100} />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">成功:</span>
                        <Badge variant="outline" className="ml-1">{job.progress.success}</Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">失敗:</span>
                        <Badge variant="outline" className="ml-1">{job.progress.failed}</Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">批次:</span>
                        <Badge variant="outline" className="ml-1">{job.progress.currentBatch}/{job.progress.totalBatches}</Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">成功率:</span>
                        <Badge variant="outline" className="ml-1">{job.performance.successRate.toFixed(1)}%</Badge>
                      </div>
                    </div>
                    
                    {job.progress.currentStock && (
                      <div className="text-sm text-gray-600">
                        目前處理: {job.progress.currentStock}
                      </div>
                    )}
                    
                    {job.performance.estimatedTimeRemaining > 0 && (
                      <div className="text-sm text-gray-600">
                        預估剩餘時間: {formatTime(job.performance.estimatedTimeRemaining)}
                      </div>
                    )}
                    
                    {job.errors.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          錯誤: {job.errors.slice(-3).join(', ')}
                          {job.errors.length > 3 && ` (還有 ${job.errors.length - 3} 個錯誤)`}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedJobs.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>沒有已完成的工作</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            completedJobs.slice(0, 10).map((job) => (
              <Card key={job.jobId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      {job.type === 'full' ? '完整收集' : 
                       job.type === 'update' ? '增量更新' : '市場收集'}
                    </div>
                    <Badge variant={job.status === 'completed' ? 'default' : 'destructive'}>
                      {job.status === 'completed' ? '完成' : '失敗'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">總數:</span>
                      <Badge variant="outline" className="ml-1">{job.progress.total}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">成功:</span>
                      <Badge variant="outline" className="ml-1">{job.progress.success}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">失敗:</span>
                      <Badge variant="outline" className="ml-1">{job.progress.failed}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">成功率:</span>
                      <Badge variant="outline" className="ml-1">{job.performance.successRate.toFixed(1)}%</Badge>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    開始時間: {formatDateTime(job.startTime)}
                    {job.endTime && ` | 結束時間: ${formatDateTime(job.endTime)}`}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="markets" className="space-y-4">
          {marketProgress.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <Globe className="h-8 w-8 mx-auto mb-2" />
                  <p>沒有市場進度資料</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketProgress.map((market) => (
                <Card key={market.market}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {market.market === 'TW' ? '台灣股市' : 
                         market.market === 'US' ? '美國股市' : 
                         market.market === 'HK' ? '香港股市' : market.market}
                      </div>
                      <Badge variant="secondary">{market.progress.toFixed(1)}%</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>進度</span>
                          <span>{market.completed}/{market.total}</span>
                        </div>
                        <Progress value={market.progress} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">成功:</span>
                          <Badge variant="outline" className="ml-1">{market.success}</Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">失敗:</span>
                          <Badge variant="outline" className="ml-1">{market.failed}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
