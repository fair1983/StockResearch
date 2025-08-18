import { NextRequest, NextResponse } from 'next/server';
import { HistoricalDataManager, HistoricalDataConfig } from '@/lib/historical-data-manager';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, intervals, startDate, endDate, forceUpdate } = body;

    logger.api.request('Batch historical data collection request', { 
      symbolCount: symbols?.length, 
      intervals 
    });

    // 驗證必要參數
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'symbols 必須是非空陣列'
      }, { status: 400 });
    }

    if (!intervals || !Array.isArray(intervals) || intervals.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'intervals 必須是非空陣列'
      }, { status: 400 });
    }

    // 驗證時間週期
    const validIntervals = ['1d', '1w', '1mo', '3mo', '6mo', '1y'];
    const invalidIntervals = intervals.filter((interval: string) => !validIntervals.includes(interval));
    if (invalidIntervals.length > 0) {
      return NextResponse.json({
        success: false,
        message: `無效的時間週期: ${invalidIntervals.join(', ')}. 支援的週期: ${validIntervals.join(', ')}`
      }, { status: 400 });
    }

    // 驗證股票列表格式
    const invalidSymbols = symbols.filter((symbol: any) => 
      !symbol.market || !symbol.symbol || !['US', 'TW'].includes(symbol.market)
    );

    if (invalidSymbols.length > 0) {
      return NextResponse.json({
        success: false,
        message: `無效的股票格式: ${invalidSymbols.map(s => `${s.market}/${s.symbol}`).join(', ')}`
      }, { status: 400 });
    }

    // 建立配置
    const configs: HistoricalDataConfig[] = symbols.map((symbol: any) => ({
      market: symbol.market,
      symbol: symbol.symbol,
      intervals,
      startDate,
      endDate,
      forceUpdate: forceUpdate || false
    }));

    const manager = new HistoricalDataManager();
    const result = await manager.batchCollectHistoricalData(configs);

    logger.api.response(`Batch collection completed: ${result.successful} successful, ${result.failed} failed in ${result.duration}ms`);

    return NextResponse.json({
      success: true,
      message: `批次歷史資料收集完成: ${result.successful} 成功, ${result.failed} 失敗`,
      data: {
        summary: {
          total: result.total,
          successful: result.successful,
          failed: result.failed,
          duration: result.duration
        },
        results: result.results
      }
    });

  } catch (error) {
    const errorMessage = `Batch historical data collection failed: ${error}`;
    logger.api.error(errorMessage);
    
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    logger.api.request('Batch collection status request');

    const manager = new HistoricalDataManager();
    const symbols = await manager.getStoredSymbols();

    // 統計資訊
    const marketStats = symbols.reduce((acc: any, symbol) => {
      if (!acc[symbol.market]) {
        acc[symbol.market] = { count: 0, intervals: new Set() };
      }
      acc[symbol.market].count++;
      symbol.intervals.forEach(interval => acc[symbol.market].intervals.add(interval));
      return acc;
    }, {});

    // 轉換 Set 為陣列
    Object.keys(marketStats).forEach(market => {
      marketStats[market].intervals = Array.from(marketStats[market].intervals);
    });

    return NextResponse.json({
      success: true,
      data: {
        totalSymbols: symbols.length,
        marketStats,
        symbols: symbols.slice(0, 50) // 只回傳前50個，避免回應過大
      }
    });

  } catch (error) {
    const errorMessage = `Failed to get batch collection status: ${error}`;
    logger.api.error(errorMessage);
    
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, { status: 500 });
  }
}
