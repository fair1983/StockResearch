import { NextRequest, NextResponse } from 'next/server';
import { StockAnalysisEngine } from '@/lib/ai/stock-analysis-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, market, action } = body;

    if (action === 'analyze-single' && symbol && market) {
      // 分析單支股票
      const result = await StockAnalysisEngine.analyzeStock(symbol, market);
      
      return NextResponse.json({
        success: true,
        data: result,
        message: `${symbol} AI 分析完成`
      });
    } else if (action === 'analyze-batch' && Array.isArray(body.stocks)) {
      // 批量分析股票
      const results = await StockAnalysisEngine.analyzeStocks(body.stocks);
      
      return NextResponse.json({
        success: true,
        data: results,
        message: `批量分析完成，共分析 ${results.length} 支股票`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '無效的請求參數',
        message: '請提供正確的 symbol、market 或 stocks 參數'
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');
    const symbol = searchParams.get('symbol');
    const interval = searchParams.get('interval') || '1d';
    const action = searchParams.get('action');

    if (action === 'demo') {
      // 提供示範分析
      const demoResult = {
        symbol: symbol || '2330',
        market: market || 'TW',
        interval,
        timestamp: new Date().toISOString(),
        analysis: {
          trend: 'bullish' as const,
          strength: 75,
          signals: [
            {
              type: 'buy' as const,
              indicator: 'MA',
              value: 125.5,
              threshold: 120.0,
              confidence: 75,
              description: '移動平均線呈多頭排列，趨勢向上'
            },
            {
              type: 'buy' as const,
              indicator: 'RSI',
              value: 45,
              threshold: 30,
              confidence: 80,
              description: 'RSI 處於正常範圍，動量良好'
            }
          ],
          summary: `${market || 'TW'}/${symbol || '2330'} 目前呈現強烈的看漲趨勢。共檢測到 2 個技術信號，其中買入信號 2 個，賣出信號 0 個。建議根據風險承受能力謹慎操作。`,
          recommendations: [
            {
              action: 'buy' as const,
              confidence: 75,
              reasoning: '技術指標顯示強烈買入信號，2 個指標支持上漲趨勢',
              riskLevel: 'medium' as const,
              timeframe: '短期 (1-2週)'
            }
          ]
        }
      };

      return NextResponse.json({
        success: true,
        data: demoResult,
        note: '這是示範資料，實際分析需要真實的技術指標資料'
      });
    }

    return NextResponse.json({
      success: false,
      error: '無效的操作'
    }, { status: 400 });

  } catch (error) {
    console.error('AI analysis GET API error:', error);
    return NextResponse.json({
      success: false,
      error: 'AI 分析 API 錯誤'
    }, { status: 500 });
  }
}
