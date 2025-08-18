import { NextRequest, NextResponse } from 'next/server';
import { HistoricalDataManager, HistoricalDataConfig } from '@/lib/historical-data-manager';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { market, symbol, intervals, startDate, endDate, forceUpdate } = body;

    logger.api.request('Historical data collection request', { market, symbol, intervals });

    // 驗證必要參數
    if (!market || !symbol || !intervals) {
      return NextResponse.json({
        success: false,
        message: 'market, symbol, 和 intervals 為必填參數'
      }, { status: 400 });
    }

    // 驗證市場
    if (!['US', 'TW'].includes(market)) {
      return NextResponse.json({
        success: false,
        message: 'market 必須是 US 或 TW'
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

    const config: HistoricalDataConfig = {
      market,
      symbol,
      intervals,
      startDate,
      endDate,
      forceUpdate: forceUpdate || false
    };

    const manager = new HistoricalDataManager();
    const results = await manager.collectHistoricalData(config);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.api.response(`Historical data collection completed: ${successCount} successful, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      message: `歷史資料收集完成: ${successCount} 成功, ${failCount} 失敗`,
      data: {
        symbol: `${market}/${symbol}`,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failCount
        }
      }
    });

  } catch (error) {
    const errorMessage = `Historical data collection failed: ${error}`;
    logger.api.error(errorMessage);
    
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');
    const symbol = searchParams.get('symbol');

    logger.api.request('Historical data status request', { market, symbol });

    const manager = new HistoricalDataManager();

    if (market && symbol) {
      // 取得特定股票的統計
      const stats = await manager.getSymbolStats(market, symbol);
      
      return NextResponse.json({
        success: true,
        data: {
          market,
          symbol,
          stats
        }
      });
    } else {
      // 取得所有已儲存的股票列表
      const symbols = await manager.getStoredSymbols();
      
      return NextResponse.json({
        success: true,
        data: {
          totalSymbols: symbols.length,
          symbols
        }
      });
    }

  } catch (error) {
    const errorMessage = `Failed to get historical data status: ${error}`;
    logger.api.error(errorMessage);
    
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, { status: 500 });
  }
}
