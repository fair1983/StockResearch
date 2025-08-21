import { NextRequest, NextResponse } from 'next/server';
import { TechnicalIndicatorsCache } from '@/lib/technical-indicators-cache';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');
    const symbol = searchParams.get('symbol');
    const interval = searchParams.get('interval');
    const action = searchParams.get('action');

    const cache = new TechnicalIndicatorsCache();

    // 取得快取統計資訊
    if (action === 'stats') {
      const stats = await cache.getCacheStats();
      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    // 清除快取
    if (action === 'clear' && market && symbol) {
      await cache.clearIndicatorsCache(market, symbol, interval || undefined);
      return NextResponse.json({
        success: true,
        message: `已清除 ${market}/${symbol} 的技術指標快取`
      });
    }

    return NextResponse.json({
      success: false,
      error: '無效的操作'
    }, { status: 400 });

  } catch (error) {
    logger.api.error('Technical indicators API error', error);
    return NextResponse.json({
      success: false,
      error: '技術指標 API 錯誤'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { market, symbol, interval, data, forceRecalculate = false } = body;

    if (!market || !symbol || !interval || !data) {
      return NextResponse.json({
        success: false,
        error: '缺少必要參數'
      }, { status: 400 });
    }

    const cache = new TechnicalIndicatorsCache();
    
    let indicators;
    
    if (forceRecalculate) {
      // 強制重新計算
      logger.api.request(`Force recalculating indicators for ${market}/${symbol}/${interval}`);
      indicators = await cache.calculateAndCacheIndicators(market, symbol, interval, data);
    } else {
      // 正常計算（會先檢查快取）
      indicators = await cache.calculateAndCacheIndicators(market, symbol, interval, data);
    }

    return NextResponse.json({
      success: true,
      data: {
        market,
        symbol,
        interval,
        indicators,
        cached: !forceRecalculate
      }
    });

  } catch (error) {
    logger.api.error('Technical indicators calculation error', error);
    return NextResponse.json({
      success: false,
      error: '技術指標計算錯誤'
    }, { status: 500 });
  }
}
