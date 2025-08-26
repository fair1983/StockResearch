import { NextRequest, NextResponse } from 'next/server';
import { scoreStorageManager } from '@/lib/screener/score-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') || 'TW';
    const symbol = searchParams.get('symbol');
    const date = searchParams.get('date');
    const days = parseInt(searchParams.get('days') || '7');

    // 如果指定了股票代碼，返回該股票的評分趨勢
    if (symbol) {
      const trend = await scoreStorageManager.getStockScoreTrend(symbol, market, days);
      return NextResponse.json({
        success: true,
        data: trend
      });
    }

    // 如果指定了日期，返回該日期的評分結果
    if (date) {
      const dailyScores = await scoreStorageManager.loadDailyScores(market, date);
      if (dailyScores) {
        return NextResponse.json({
          success: true,
          data: dailyScores
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `找不到 ${date} 的評分結果`
        }, { status: 404 });
      }
    }

    // 返回最新的評分結果
    const latestScores = await scoreStorageManager.loadLatestScores(market);
    return NextResponse.json({
      success: true,
      data: {
        market,
        totalStocks: latestScores.length,
        scores: latestScores,
        lastUpdated: latestScores.length > 0 ? latestScores[0].lastUpdated : null
      }
    });

  } catch (error) {
    console.error('評分 API 錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, market, symbol, days = 7 } = body;

    switch (action) {
      case 'get_trend':
        if (!symbol || !market) {
          return NextResponse.json({
            success: false,
            error: '缺少必要參數: symbol, market'
          }, { status: 400 });
        }
        const trend = await scoreStorageManager.getStockScoreTrend(symbol, market, days);
        return NextResponse.json({ success: true, data: trend });

      case 'get_history':
        if (!market) {
          return NextResponse.json({
            success: false,
            error: '缺少必要參數: market'
          }, { status: 400 });
        }
        const history = await scoreStorageManager.getScoreHistory(market, days);
        return NextResponse.json({ success: true, data: history });

      case 'cleanup':
        await scoreStorageManager.cleanupOldScores(30);
        return NextResponse.json({ 
          success: true, 
          message: '已清理30天前的舊評分檔案' 
        });

      default:
        return NextResponse.json({
          success: false,
          error: '不支援的操作'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('評分 API POST 錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}
