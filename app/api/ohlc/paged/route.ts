import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceService } from '@/lib/yahoo-finance';
import { Market, TimeFrame, ErrorResponse } from '@/types';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查詢參數
    const market = searchParams.get('market') as Market;
    const symbol = searchParams.get('symbol');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '1000');
    const tf = searchParams.get('tf') as TimeFrame || '1d';
    const existingDataStr = searchParams.get('existingData'); // 現有資料的 JSON 字串

    logger.api.request(`Paged API Request`, { market, symbol, page, pageSize, tf });

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

    // 驗證分頁參數
    if (page < 1) {
      return NextResponse.json<ErrorResponse>(
        { error: 'page 必須大於 0' },
        { status: 400 }
      );
    }

    if (pageSize < 1 || pageSize > 5000) {
      return NextResponse.json<ErrorResponse>(
        { error: 'pageSize 必須在 1 到 5000 之間' },
        { status: 400 }
      );
    }

    // 解析現有資料
    let existingData: any[] = [];
    if (existingDataStr) {
      try {
        existingData = JSON.parse(decodeURIComponent(existingDataStr));
        logger.api.request(`Parsed existing data`, { existingDataLength: existingData.length });
      } catch (error) {
        logger.api.error('Failed to parse existing data', error);
        // 如果解析失敗，繼續使用空陣列
      }
    }

    let result;
    let dataSource = '';

    if (market === 'US') {
      // 美股：使用 Yahoo Finance
      const yahooFinance = new YahooFinanceService();
      
      try {
        logger.yahooFinance.request(`Fetching paged data for US symbol: ${symbol}`, { page, pageSize, timeframe: tf, existingDataLength: existingData.length });
        result = await yahooFinance.getKlineDataByPage(symbol, market, tf, page, pageSize, existingData);
        logger.yahooFinance.response(`Yahoo Finance returned page ${page} for US`);
        dataSource = 'Yahoo Finance';
      } catch (error) {
        logger.yahooFinance.error('Yahoo Finance failed for US', error);
        return NextResponse.json<ErrorResponse>(
          { error: `無法從 Yahoo Finance 取得資料: ${error instanceof Error ? error.message : '未知錯誤'}` },
          { status: 500 }
        );
      }
    } else if (market === 'TW') {
      // 台股：使用 Yahoo Finance
      const yahooFinance = new YahooFinanceService();
      
      try {
        logger.yahooFinance.request(`Fetching paged data for TW symbol: ${symbol}`, { page, pageSize, timeframe: tf, existingDataLength: existingData.length });
        result = await yahooFinance.getKlineDataByPage(symbol, market, tf, page, pageSize, existingData);
        logger.yahooFinance.response(`Yahoo Finance returned page ${page} for TW`);
        dataSource = 'Yahoo Finance';
      } catch (error) {
        logger.yahooFinance.error('Yahoo Finance failed for TW', error);
        return NextResponse.json<ErrorResponse>(
          { error: `無法從 Yahoo Finance 取得資料: ${error instanceof Error ? error.message : '未知錯誤'}` },
          { status: 500 }
        );
      }
    }

    if (!result) {
      return NextResponse.json<ErrorResponse>(
        { error: '無法取得資料' },
        { status: 500 }
      );
    }

    logger.api.response(`Paged response`, { 
      page: page,
      dataLength: result.data.length,
      hasMore: result.hasMore,
      dataSource 
    });

    const response = {
      market,
      symbol,
      tf: tf,
      page: page,
      totalPages: 1, // 簡化版本，只返回一頁
      hasMore: result.hasMore,
      data: result.data,
      pageInfo: {
        currentPage: page,
        totalPages: 1,
        hasMore: result.hasMore,
        earliestDate: result.data.length > 0 ? result.data[0].time : null,
        latestDate: result.data.length > 0 ? result.data[result.data.length - 1].time : null,
        mergedCount: result.data.length,
        newCount: result.data.length,
      }
    };

    // 添加資料來源資訊到 headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Data-Source', dataSource);
    responseHeaders.set('X-Data-Count', result.data.length.toString());
    responseHeaders.set('X-Current-Page', page.toString());
    responseHeaders.set('X-Total-Pages', '1');
    responseHeaders.set('X-Has-More', result.hasMore.toString());
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    responseHeaders.set('Pragma', 'no-cache');
    responseHeaders.set('Expires', '0');

    const responseTime = Date.now() - startTime;
    logger.api.timing(`Paged response sent in ${responseTime}ms`, { responseTime, dataLength: result.data.length });
    
    return NextResponse.json(response, {
      headers: responseHeaders,
    });

  } catch (error) {
    logger.api.error('Paged API error', error);
    return NextResponse.json<ErrorResponse>(
      { error: '內部伺服器錯誤' },
      { status: 500 }
    );
  }
}
