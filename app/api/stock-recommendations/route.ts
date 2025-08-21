import { NextRequest, NextResponse } from 'next/server';
import { StockRecommendationsManager } from '@/lib/data/stock-recommendations-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'refresh') {
      // 強制刷新數據
      const recommendations = await StockRecommendationsManager.refreshStockRecommendations();
      const cacheStatus = await StockRecommendationsManager.getCacheStatus();
      
      return NextResponse.json({
        success: true,
        data: recommendations,
        cacheStatus,
        message: '數據已刷新'
      });
    } else if (action === 'status') {
      // 獲取緩存狀態
      const cacheStatus = await StockRecommendationsManager.getCacheStatus();
      
      return NextResponse.json({
        success: true,
        cacheStatus,
        message: '緩存狀態已獲取'
      });
    } else {
      // 獲取股票推薦數據（使用緩存）
      const recommendations = await StockRecommendationsManager.getStockRecommendations();
      const cacheStatus = await StockRecommendationsManager.getCacheStatus();
      
      return NextResponse.json({
        success: true,
        data: recommendations,
        cacheStatus,
        message: '數據已獲取'
      });
    }
  } catch (error) {
    console.error('股票推薦 API 錯誤:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤',
      message: '獲取股票推薦數據失敗'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, symbol, market, stocks } = body;

    if (action === 'analyze-single' && symbol && market) {
      // AI 分析單支股票
      const recommendation = await StockRecommendationsManager.analyzeSingleStock(symbol, market);
      
      return NextResponse.json({
        success: true,
        data: recommendation,
        message: `${symbol} AI 分析完成`
      });
    } else if (action === 'analyze-batch' && Array.isArray(stocks)) {
      // AI 批量分析股票
      const recommendations = await StockRecommendationsManager.analyzeBatchStocks(stocks);
      
      return NextResponse.json({
        success: true,
        data: recommendations,
        message: `批量 AI 分析完成，共分析 ${recommendations.length} 支股票`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '無效的請求參數',
        message: '請提供正確的 action、symbol、market 或 stocks 參數'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('AI 分析 API 錯誤:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤',
      message: 'AI 分析失敗'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 清除緩存
    await StockRecommendationsManager.clearCache();
    
    return NextResponse.json({
      success: true,
      message: '緩存已清除'
    });
  } catch (error) {
    console.error('清除緩存錯誤:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤',
      message: '清除緩存失敗'
    }, { status: 500 });
  }
}
