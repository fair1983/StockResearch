import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceService } from '@/lib/yahoo-finance';
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

    // 目前只支援日K線
    if (tf !== '1d') {
      return NextResponse.json<ErrorResponse>(
        { error: '目前只支援日K線 (1d)，分K線功能開發中' },
        { status: 400 }
      );
    }

    let candles: any[] = [];
    let dataSource = '';

        if (market === 'US') {
      // 美股：只使用 Yahoo Finance
      const yahooFinance = new YahooFinanceService();
      
      try {
        logger.yahooFinance.request(`Fetching data for US symbol: ${symbol}`, { timeframe: tf });
        candles = await yahooFinance.getKlineData(symbol, from || undefined, to || undefined, tf);
        logger.yahooFinance.response(`Yahoo Finance returned ${candles.length} candles for US`);
        dataSource = 'Yahoo Finance';
      } catch (error) {
        logger.yahooFinance.error('Yahoo Finance failed for US', error);
        return NextResponse.json<ErrorResponse>(
          { error: `無法從 Yahoo Finance 取得資料: ${error instanceof Error ? error.message : '未知錯誤'}` },
          { status: 500 }
        );
      }
        } else if (market === 'TW') {
      // 台股：只使用 Yahoo Finance
      const yahooFinance = new YahooFinanceService();
      
      try {
        logger.yahooFinance.request(`Fetching data for TW symbol: ${symbol}`, { timeframe: tf });
        candles = await yahooFinance.getKlineData(symbol, from || undefined, to || undefined, tf);
        logger.yahooFinance.response(`Yahoo Finance returned ${candles.length} candles for TW`);
        dataSource = 'Yahoo Finance';
      } catch (error) {
        logger.yahooFinance.error('Yahoo Finance failed for TW', error);
        return NextResponse.json<ErrorResponse>(
          { error: `無法從 Yahoo Finance 取得資料: ${error instanceof Error ? error.message : '未知錯誤'}` },
          { status: 500 }
        );
      }
    }

    // 篩選日期範圍
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
    if (candles.length > 1000) {
      candles = candles.slice(0, 1000);
    }

    logger.api.response(`Final response`, { 
      candlesLength: candles.length, 
      firstCandle: candles[0],
      dataSource 
    });

    const response: OHLCResponse = {
      market,
      symbol,
      tf: tf,
      data: candles,
    };

    // 添加資料來源資訊到 headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Data-Source', dataSource);
    responseHeaders.set('X-Data-Count', candles.length.toString());
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    responseHeaders.set('Pragma', 'no-cache');
    responseHeaders.set('Expires', '0');

    const responseTime = Date.now() - startTime;
    logger.api.timing(`Response sent in ${responseTime}ms`, { responseTime, dataLength: response.data.length });
    
    return NextResponse.json(response, {
      headers: responseHeaders,
    });

  } catch (error) {
    logger.api.error('API error', error);
    return NextResponse.json<ErrorResponse>(
      { error: '內部伺服器錯誤' },
      { status: 500 }
    );
  }
}
