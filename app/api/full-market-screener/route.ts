import { NextRequest, NextResponse } from 'next/server';
import { FullMarketScanner } from '@/lib/screener/full-market-scanner';
import { FullMarketCollector } from '@/lib/data-collection/full-market-collector';
// 簡化的 logger 實作
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
};

const scanner = new FullMarketScanner();
const collector = new FullMarketCollector();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      markets = ['US', 'TW'],
      limit = 50,
      mode = 'quick',
      includeBacktest = false,
      filters = {},
      collectData = false
    } = body;

    logger.info('全市場掃描器請求', { markets, limit, mode, includeBacktest });

    // 如果需要收集資料，先執行資料收集
    if (collectData) {
      logger.info('開始收集全市場資料');
      await collector.collectAllMarketStocks();
      logger.info('全市場資料收集完成');
    }

    // 執行全市場掃描
    const scanResult = await scanner.scanFullMarkets(mode, filters, limit);
    const results = scanResult.stocks;

    // 生成統計報告
    const statistics = generateScanStatistics(results, markets);

    const response = {
      success: true,
      data: {
        results,
        statistics,
        config: {
          markets,
          limit,
          mode,
          includeBacktest,
          filters
        }
      },
      timestamp: new Date().toISOString()
    };

    logger.info('全市場掃描完成', { 
      totalResults: results.length,
      markets: markets.join(', '),
      mode 
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('全市場掃描器錯誤:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const markets = searchParams.get('markets')?.split(',') || ['US', 'TW'];
    const limit = parseInt(searchParams.get('limit') || '50');
    const mode = searchParams.get('mode') || 'quick';
    const includeBacktest = searchParams.get('includeBacktest') === 'true';

    logger.info('全市場掃描器 GET 請求', { markets, limit, mode, includeBacktest });

    // 執行全市場掃描
    const scanResult = await scanner.scanFullMarkets(mode, {});
    const results = scanResult.stocks;

    // 生成統計報告
    const statistics = generateScanStatistics(results, markets);

    const response = {
      success: true,
      data: {
        results,
        statistics,
        config: {
          markets,
          limit,
          mode,
          includeBacktest
        }
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('全市場掃描器 GET 錯誤:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * 生成掃描統計報告
 */
function generateScanStatistics(results: any[], markets: string[]) {
  const totalResults = results.length;
  const buyCount = results.filter(r => r.action === 'Buy').length;
  const holdCount = results.filter(r => r.action === 'Hold').length;
  const avoidCount = results.filter(r => r.action === 'Avoid').length;

  // 按市場分類統計
  const marketStats = markets.map(market => {
    const marketResults = results.filter(r => r.market === market);
    return {
      market,
      total: marketResults.length,
      buy: marketResults.filter(r => r.action === 'Buy').length,
      hold: marketResults.filter(r => r.action === 'Hold').length,
      avoid: marketResults.filter(r => r.action === 'Avoid').length,
      avgScore: marketResults.length > 0 
        ? Math.round(marketResults.reduce((sum, r) => sum + r.score, 0) / marketResults.length)
        : 0
    };
  });

  // 按產業分類統計
  const sectorStats = new Map<string, { count: number; buy: number; hold: number; avoid: number; avgScore: number }>();
  
  results.forEach(result => {
    const sector = result.metadata?.sector || 'Unknown';
    const current = sectorStats.get(sector) || { count: 0, buy: 0, hold: 0, avoid: 0, avgScore: 0 };
    
    current.count++;
    if (result.action === 'Buy') current.buy++;
    else if (result.action === 'Hold') current.hold++;
    else if (result.action === 'Avoid') current.avoid++;
    current.avgScore += result.score;
    
    sectorStats.set(sector, current);
  });

  // 計算平均分數
  sectorStats.forEach((stats, sector) => {
    stats.avgScore = Math.round(stats.avgScore / stats.count);
  });

  return {
    summary: {
      totalResults,
      buyCount,
      holdCount,
      avoidCount,
      buyRate: totalResults > 0 ? ((buyCount / totalResults) * 100).toFixed(1) + '%' : '0%',
      avgScore: totalResults > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalResults) : 0
    },
    marketStats,
    sectorStats: Array.from(sectorStats.entries()).map(([sector, stats]) => ({
      sector,
      ...stats
    })).sort((a, b) => b.count - a.count).slice(0, 10) // 取前10個產業
  };
}
