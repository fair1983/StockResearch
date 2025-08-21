import { NextRequest, NextResponse } from 'next/server';
import { DataCollectionScheduler } from '@/lib/data-collection/data-collection-scheduler';
import { StockListManager } from '@/lib/data-collection/stock-list-manager';
import { logger } from '@/lib/logger';

// 全域排程器實例
let scheduler: DataCollectionScheduler | null = null;

function getScheduler(): DataCollectionScheduler {
  if (!scheduler) {
    scheduler = new DataCollectionScheduler();
  }
  return scheduler;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    const scheduler = getScheduler();
    const stockListManager = new StockListManager();

    switch (action) {
      case 'start':
        scheduler.start();
        return NextResponse.json({
          success: true,
          message: '資料收集排程器已啟動'
        });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({
          success: true,
          message: '資料收集排程器已停止'
        });

      case 'trigger':
        const { type = 'update', markets } = params;
        const jobId = await scheduler.triggerCollection(type, markets);
        return NextResponse.json({
          success: true,
          data: { jobId },
          message: '資料收集任務已觸發'
        });

      case 'addStock':
        const { market, symbol } = params;
        const added = stockListManager.addStockToMarket(market, symbol);
        return NextResponse.json({
          success: added,
          message: added ? '股票已新增' : '股票新增失敗'
        });

      case 'removeStock':
        const { market: rmMarket, symbol: rmSymbol } = params;
        const removed = stockListManager.removeStockFromMarket(rmMarket, rmSymbol);
        return NextResponse.json({
          success: removed,
          message: removed ? '股票已移除' : '股票移除失敗'
        });

      case 'importStocks':
        const { market: importMarket, symbols } = params;
        const imported = stockListManager.importStockList(importMarket, symbols);
        return NextResponse.json({
          success: imported,
          message: imported ? '股票清單已匯入' : '股票清單匯入失敗'
        });

      case 'updateConfig':
        const { configType, updates } = params;
        const configManager = scheduler.getConfigManager();
        
        switch (configType) {
          case 'basic':
            configManager.updateConfig(updates);
            break;
          case 'collector':
            configManager.updateCollectorConfig(updates);
            break;
          case 'market':
            const { marketCode, marketUpdates } = updates;
            configManager.updateMarketConfig(marketCode, marketUpdates);
            break;
          case 'monitoring':
            configManager.updateMonitoringConfig(updates);
            break;
          case 'performance':
            configManager.updatePerformanceConfig(updates);
            break;
          default:
            return NextResponse.json({
              success: false,
              error: '無效的配置類型'
            }, { status: 400 });
        }
        
        return NextResponse.json({
          success: true,
          message: '配置已更新'
        });

      case 'setInterval':
        const { interval, hours } = params;
        const intervalConfigManager = scheduler.getConfigManager();
        
        if (interval) {
          intervalConfigManager.setScheduleInterval(interval);
        }
        if (hours) {
          intervalConfigManager.setUpdateInterval(hours);
        }
        
        return NextResponse.json({
          success: true,
          message: '時間間隔已更新'
        });

      case 'setMarketInterval':
        const { marketCode, marketHours } = params;
        const marketConfigManager = scheduler.getConfigManager();
        marketConfigManager.setMarketUpdateInterval(marketCode, marketHours);
        
        return NextResponse.json({
          success: true,
          message: `市場 ${marketCode} 更新間隔已設定為 ${marketHours} 小時`
        });

      default:
        return NextResponse.json({
          success: false,
          error: '無效的操作'
        }, { status: 400 });
    }

  } catch (error) {
    logger.api.error('資料收集 API 錯誤', error);
    return NextResponse.json({
      success: false,
      error: '操作失敗'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const scheduler = getScheduler();
    const stockListManager = new StockListManager();
    const monitor = scheduler.getMonitor();

    switch (action) {
      case 'status':
        const status = scheduler.getStatus();
        const systemStatus = monitor.getSystemStatus();
        return NextResponse.json({
          success: true,
          data: {
            ...status,
            systemStatus
          }
        });

      case 'jobs':
        const jobs = scheduler.getAllJobs();
        return NextResponse.json({
          success: true,
          data: jobs
        });

      case 'job':
        const jobId = searchParams.get('jobId');
        if (!jobId) {
          return NextResponse.json({
            success: false,
            error: '缺少 jobId 參數'
          }, { status: 400 });
        }
        const job = scheduler.getJobStatus(jobId);
        const jobProgress = monitor.getJobProgress(jobId);
        return NextResponse.json({
          success: true,
          data: {
            job,
            progress: jobProgress
          }
        });

      case 'progress':
        const activeJobs = monitor.getActiveJobs();
        const completedJobs = monitor.getCompletedJobs();
        const marketProgress = monitor.getMarketProgress();
        return NextResponse.json({
          success: true,
          data: {
            activeJobs,
            completedJobs,
            marketProgress
          }
        });

      case 'monitor':
        const systemStatusData = monitor.getSystemStatus();
        const detailedStats = monitor.getDetailedStats();
        return NextResponse.json({
          success: true,
          data: {
            systemStatus: systemStatusData,
            detailedStats
          }
        });

      case 'stocks':
        const market = searchParams.get('market');
        const stocks = market ? 
          await stockListManager.getStocksByMarket(market) :
          await stockListManager.getAllStocks();
        return NextResponse.json({
          success: true,
          data: stocks
        });

      case 'stats':
        const stats = await stockListManager.getStockStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'needsUpdate':
        const maxAge = searchParams.get('maxAge');
        const needsUpdate = await stockListManager.getStocksNeedingUpdate(
          maxAge ? parseInt(maxAge) : 24
        );
        return NextResponse.json({
          success: true,
          data: needsUpdate
        });

      case 'markets':
        const markets = stockListManager.loadMarketConfig();
        return NextResponse.json({
          success: true,
          data: markets
        });

      case 'config':
        const configManager = scheduler.getConfigManager();
        const config = configManager.getConfig();
        return NextResponse.json({
          success: true,
          data: config
        });

      case 'configSummary':
        const summaryConfigManager = scheduler.getConfigManager();
        const summary = summaryConfigManager.getConfigSummary();
        return NextResponse.json({
          success: true,
          data: summary
        });

      case 'validateConfig':
        const validateConfigManager = scheduler.getConfigManager();
        const validation = validateConfigManager.validateConfig();
        return NextResponse.json({
          success: true,
          data: validation
        });

      default:
        return NextResponse.json({
          success: false,
          error: '無效的操作'
        }, { status: 400 });
    }

  } catch (error) {
    logger.api.error('資料收集 GET API 錯誤', error);
    return NextResponse.json({
      success: false,
      error: '查詢失敗'
    }, { status: 500 });
  }
}
