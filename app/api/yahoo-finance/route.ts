import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceCollector } from '@/lib/data/yahoo-finance-collector';
import { getMarketConfig, getAllMarkets } from '@/lib/data/market-config';

/**
 * GET /api/yahoo-finance
 * 獲取股票數據
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market') as any;
    const type = searchParams.get('type') || 'quote'; // quote, historical, markets

    const config = getMarketConfig();
    const collector = new YahooFinanceCollector(config);

    // 獲取市場列表
    if (type === 'markets') {
      const markets = getAllMarkets();
      const marketList = markets.map(marketCode => ({
        code: marketCode,
        ...config.markets[marketCode]
      }));

      return NextResponse.json({
        success: true,
        data: marketList
      });
    }

    // 驗證參數
    if (!symbol || !market) {
      return NextResponse.json({
        success: false,
        error: '缺少必要參數: symbol 和 market'
      }, { status: 400 });
    }

    // 檢查數據是否過期
    const isStale = await collector.isDataStale(symbol, market);
    
    if (isStale) {
      // 數據過期，重新獲取
      console.log(`${symbol} 數據過期，重新獲取...`);
      
      if (type === 'quote') {
        const quoteData = await collector.getQuote(symbol, market);
        if (quoteData) {
          await collector.saveQuoteData(symbol, market, quoteData);
        }
      } else if (type === 'historical') {
        const period1 = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
        const period2 = Math.floor(Date.now() / 1000);
        const historicalData = await collector.getHistoricalData(symbol, market, period1, period2);
        if (historicalData) {
          await collector.saveHistoricalData(symbol, market, historicalData);
        }
      }
    }

    // 返回數據
    let data;
    if (type === 'quote') {
      data = await collector.loadQuoteData(symbol, market);
    } else if (type === 'historical') {
      data = await collector.loadHistoricalData(symbol, market);
    } else {
      return NextResponse.json({
        success: false,
        error: '無效的數據類型'
      }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: '無法獲取數據'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data,
      isStale,
      lastUpdated: data.lastUpdated
    });

  } catch (error) {
    console.error('Yahoo Finance API 錯誤:', error);
    return NextResponse.json({
      success: false,
      error: '內部服務器錯誤'
    }, { status: 500 });
  }
}

/**
 * POST /api/yahoo-finance
 * 批量獲取股票數據
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, market, type = 'quote' } = body;

    if (!symbols || !Array.isArray(symbols) || !market) {
      return NextResponse.json({
        success: false,
        error: '缺少必要參數: symbols (數組) 和 market'
      }, { status: 400 });
    }

    const config = getMarketConfig();
    const collector = new YahooFinanceCollector(config);
    const results = [];

    for (const symbol of symbols) {
      try {
        // 檢查數據是否過期
        const isStale = await collector.isDataStale(symbol, market);
        
        if (isStale) {
          // 數據過期，重新獲取
          if (type === 'quote') {
            const quoteData = await collector.getQuote(symbol, market);
            if (quoteData) {
              await collector.saveQuoteData(symbol, market, quoteData);
            }
          } else if (type === 'historical') {
            const period1 = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
            const period2 = Math.floor(Date.now() / 1000);
            const historicalData = await collector.getHistoricalData(symbol, market, period1, period2);
            if (historicalData) {
              await collector.saveHistoricalData(symbol, market, historicalData);
            }
          }
        }

        // 讀取數據
        let data;
        if (type === 'quote') {
          data = await collector.loadQuoteData(symbol, market);
        } else if (type === 'historical') {
          data = await collector.loadHistoricalData(symbol, market);
        }

        results.push({
          symbol,
          success: true,
          data,
          isStale
        });

        // 添加延遲避免 API 限制
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`處理 ${symbol} 失敗:`, error);
        results.push({
          symbol,
          success: false,
          error: error instanceof Error ? error.message : '未知錯誤'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total: symbols.length,
      successCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length
    });

  } catch (error) {
    console.error('Yahoo Finance 批量 API 錯誤:', error);
    return NextResponse.json({
      success: false,
      error: '內部服務器錯誤'
    }, { status: 500 });
  }
}
