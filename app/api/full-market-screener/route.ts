import { NextRequest, NextResponse } from 'next/server';
import { FullMarketScanner } from '@/lib/screener/full-market-scanner';
import { logger } from '@/lib/logger';
import { getIndustryDisplayName } from '@/lib/industry-mapping';

const scanner = new FullMarketScanner();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode = 'quick', limit, markets = ['US', 'TW'], filters = {} } = body;

    logger.api.request('全市場掃描器 POST 請求', { mode, limit, markets, filters });

    // 執行全市場掃描
    const scanResult = await scanner.scanFullMarkets(mode, filters, limit, markets);
    const results = scanResult.stocks;

    // 轉換格式以兼容前端期望的格式
    const formattedResults = results.map(stock => ({
      symbol: stock.symbol,
      market: stock.market,
      name: stock.name || stock.symbol,
      currentPrice: stock.quote?.price || 0,
      priceChange: stock.quote?.change || 0,
      priceChangePercent: stock.quote?.changePct || 0,
      price: stock.quote?.price || 0,
      change: stock.quote?.change || 0,
      changePct: stock.quote?.changePct || 0,
      fundamentalScore: stock.score || 50,
      technicalScore: stock.score || 50,
      overallScore: stock.score || 50,
      riskLevel: stock.action === 'Buy' ? 'low' : stock.action === 'Hold' ? 'medium' : 'high',
      expectedReturn: (stock.score || 50) / 100,
      confidence: stock.confidence || 50,
      recommendedStrategy: stock.action,
      isAnalyzed: true,
      reasoning: stock.summary?.reasons?.join(', ') || '全市場掃描分析',
      technicalSignals: {
        trend: 'neutral',
        momentum: 0.5,
        volatility: 0.05,
        support: 0,
        resistance: 0,
      },
      // 添加產業信息 - 從 metadata 中獲取並轉換為中英文顯示
      sector: getIndustryDisplayName(stock.metadata?.sector || '', stock.metadata?.industry || '', stock.market),
      industry: getIndustryDisplayName(stock.metadata?.sector || '', stock.metadata?.industry || '', stock.market),
    }));

    // 生成統計報告
    const statistics = generateScanStatistics(formattedResults, markets);

    const response = {
      success: true,
      data: {
        results: formattedResults,
        statistics,
        config: {
          markets,
          limit,
          mode,
          includeBacktest: false,
          filters
        }
      },
      timestamp: new Date().toISOString()
    };

    logger.api.response('全市場掃描完成', { 
      totalResults: results.length,
      markets: markets.join(', '),
      mode 
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.api.error('全市場掃描器錯誤:', error);
    
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
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const mode = searchParams.get('mode') || 'quick';
    const includeBacktest = searchParams.get('includeBacktest') === 'true';

    logger.api.request('全市場掃描器 GET 請求', { markets, limit, mode, includeBacktest });

    // 執行全市場掃描
    const scanResult = await scanner.scanFullMarkets(mode, {}, limit, markets);
    const results = scanResult.stocks;

    // 轉換格式以兼容前端期望的格式
    const formattedResults = results.map(stock => ({
      symbol: stock.symbol,
      market: stock.market,
      name: stock.name || stock.symbol,
      currentPrice: stock.quote?.price || 0,
      priceChange: stock.quote?.change || 0,
      priceChangePercent: stock.quote?.changePct || 0,
      price: stock.quote?.price || 0,
      change: stock.quote?.change || 0,
      changePct: stock.quote?.changePct || 0,
      fundamentalScore: stock.score || 50,
      technicalScore: stock.score || 50,
      overallScore: stock.score || 50,
      riskLevel: stock.action === 'Buy' ? 'low' : stock.action === 'Hold' ? 'medium' : 'high',
      expectedReturn: (stock.score || 50) / 100,
      confidence: stock.confidence || 50,
      recommendedStrategy: stock.action,
      isAnalyzed: true,
      reasoning: stock.summary?.reasons?.join(', ') || '全市場掃描分析',
      technicalSignals: {
        trend: 'neutral',
        momentum: 0.5,
        volatility: 0.05,
        support: 0,
        resistance: 0,
      },
      // 添加產業信息 - 從 metadata 中獲取並轉換為中英文顯示
      sector: getIndustryDisplayName(stock.metadata?.sector || '', stock.metadata?.industry || '', stock.market),
      industry: getIndustryDisplayName(stock.metadata?.sector || '', stock.metadata?.industry || '', stock.market),
    }));

    // 生成統計報告
    const statistics = generateScanStatistics(formattedResults, markets);

    const response = {
      success: true,
      data: {
        results: formattedResults,
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
    logger.api.error('全市場掃描器 GET 錯誤:', error);
    
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
  const buyCount = results.filter(r => r.recommendedStrategy === 'Buy').length;
  const holdCount = results.filter(r => r.recommendedStrategy === 'Hold').length;
  const avoidCount = results.filter(r => r.recommendedStrategy === 'Avoid').length;

  // 按市場分類統計
  const marketStats = markets.map(market => {
    const marketResults = results.filter(r => r.market === market);
    return {
      market,
      total: marketResults.length,
      buy: marketResults.filter(r => r.recommendedStrategy === 'Buy').length,
      hold: marketResults.filter(r => r.recommendedStrategy === 'Hold').length,
      avoid: marketResults.filter(r => r.recommendedStrategy === 'Avoid').length,
      avgScore: marketResults.length > 0 ? 
        Math.round(marketResults.reduce((sum, r) => sum + (r.overallScore || 0), 0) / marketResults.length) : 0
    };
  });

  return {
    total: totalResults,
    buy: buyCount,
    hold: holdCount,
    avoid: avoidCount,
    avgScore: totalResults > 0 ? Math.round(results.reduce((sum, r) => sum + (r.overallScore || 0), 0) / totalResults) : 0,
    markets: marketStats
  };
}
