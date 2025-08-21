import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceService } from '@/lib/yahoo-finance';
import { HistoricalDataManager } from '@/lib/historical-data-manager';
import { Market, TimeFrame, OHLCResponse, ErrorResponse } from '@/types';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查詢參數
    const market = searchParams.get('market') as Market;
    const symbol = searchParams.get('symbol');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const tf = searchParams.get('tf') as TimeFrame || '1d'; // 預設只支援日K

    logger.api.request(`API Request`, { market, symbol, from, to, tf });

    // 驗證必要參數
    if (!market || !symbol) {
      return NextResponse.json<ErrorResponse>(
        { error: 'market 和 symbol 參數為必填' },
        { status: 400 }
      );
    }

    if (!['US', 'TW'].includes(market)) {
      return NextResponse.json<ErrorResponse>(
        { error: 'market 必須是 US 或 TW' },
        { status: 400 }
      );
    }

    // 驗證時間框架
    if (!['1d', '1w', '1M'].includes(tf)) {
      return NextResponse.json<ErrorResponse>(
        { error: '時間框架必須是 1d (日K)、1w (週K) 或 1M (月K)' },
        { status: 400 }
      );
    }

    let candles: any[] = [];
    let dataSource = '';

    // 使用智能資料管理器
    const dataManager = new HistoricalDataManager();
    
    try {
      logger.yahooFinance.request(`智能獲取資料 for ${market} symbol: ${symbol}`, { timeframe: tf });
      
      // 如果有指定日期範圍，使用傳統方式
      if (from || to) {
        const yahooFinance = new YahooFinanceService();
        let period1: Date | undefined;
        let period2: Date | undefined;
        
        if (from) {
          period1 = new Date(from);
        }
        if (to) {
          period2 = new Date(to);
        }
        
        candles = await yahooFinance.getKlineData(symbol, market, tf, period1, period2);
        dataSource = 'Yahoo Finance (指定日期)';
      } else {
        // 使用智能資料獲取：自動判斷資料是否足夠，不足則即時計算並保存
        candles = await dataManager.getHistoricalDataWithRealTimeCalculation(
          market,
          symbol,
          tf,
          200 // 最少需要 200 個資料點以確保技術指標計算準確
        );
        dataSource = '智能資料管理器';
      }
      
      logger.yahooFinance.response(`資料獲取成功: ${candles.length} candles from ${dataSource}`);
    } catch (error) {
      logger.yahooFinance.error(`智能資料獲取失敗 for ${market}`, error);
      
      // 檢查是否為找不到股票的錯誤
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      if (errorMessage.includes('找不到股票資料') || errorMessage.includes('No data found')) {
        return NextResponse.json<ErrorResponse>(
          { error: `找不到股票: ${symbol} (${market})` },
          { status: 404 }
        );
      }
      
      return NextResponse.json<ErrorResponse>(
        { error: `無法取得資料: ${errorMessage}` },
        { status: 500 }
      );
    }

    // 篩選日期範圍（如果需要）
    if (from || to) {
      candles = candles.filter(candle => {
        const candleDate = new Date(candle.time);
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;

        if (fromDate && candleDate < fromDate) return false;
        if (toDate && candleDate > toDate) return false;
        return true;
      });
    }

    // 限制回傳資料量（避免過大的回應）
    // 增加限制到 5000 筆，以支援更長期的歷史資料
    if (candles.length > 5000) {
      candles = candles.slice(0, 5000);
      logger.api.warn(`Data truncated to 5000 records for ${symbol}`);
    }

    // 計算統計資訊
    const totalRecords = candles.length;
    const earliestDate = totalRecords > 0 ? candles[0].time : null;
    const latestDate = totalRecords > 0 ? candles[totalRecords - 1].time : null;

    // 計算執行時間
    const executionTime = Date.now() - startTime;

    // 記錄成功回應
    logger.api.response(`API Response`, {
      symbol,
      market,
      timeframe: tf,
      totalRecords,
      earliestDate,
      latestDate,
      dataSource,
      executionTime: `${executionTime}ms`
    });

    // 回傳成功回應
    const response: OHLCResponse = {
      success: true,
      data: candles,
      metadata: {
        symbol,
        market,
        timeframe: tf,
        totalRecords,
        earliestDate,
        latestDate,
        dataSource,
        executionTime: `${executionTime}ms`
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    // 記錄錯誤
    logger.api.error('API Error', error);
    
    // 回傳錯誤回應
    const errorResponse: ErrorResponse = {
      error: `伺服器錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
