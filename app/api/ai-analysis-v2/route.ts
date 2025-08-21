import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisOrchestrator } from '@/lib/ai-analysis/ai-analysis-orchestrator';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { market, symbol, interval = '1d', data, batchMode = false, stocks } = body;

    const orchestrator = new AIAnalysisOrchestrator();

    if (batchMode && stocks) {
      // 批量分析模式
      logger.api.request('Batch AI analysis v2 request', { count: stocks.length });
      
      const results = await orchestrator.batchAnalyze(stocks);
      
      const summary = {
        total: results.length,
        bullish: results.filter(r => r.overallSignal === 'buy').length,
        bearish: results.filter(r => r.overallSignal === 'sell').length,
        neutral: results.filter(r => r.overallSignal === 'hold').length,
        averageScore: results.reduce((sum, r) => sum + r.overallScore, 0) / results.length,
        averageConfidence: results.reduce((sum, r) => sum + r.overallConfidence, 0) / results.length
      };

      return NextResponse.json({
        success: true,
        data: {
          results,
          summary,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // 單一股票分析模式
      if (!market || !symbol) {
        return NextResponse.json({
          success: false,
          error: '缺少必要參數：market 和 symbol'
        }, { status: 400 });
      }

      logger.api.request('Single stock AI analysis v2 request', { market, symbol, interval });
      
      const result = await orchestrator.analyzeStock(market, symbol, interval, data);
      
      return NextResponse.json({
        success: true,
        data: result
      });
    }

  } catch (error) {
    logger.api.error('AI analysis v2 API error', error);
    return NextResponse.json({
      success: false,
      error: 'AI 分析失敗'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'analyzers') {
      // 取得分析器資訊
      const orchestrator = new AIAnalysisOrchestrator();
      const analyzers = orchestrator.getAnalyzersInfo();
      
      return NextResponse.json({
        success: true,
        data: {
          analyzers,
          totalCount: analyzers.length
        }
      });
    }

    if (action === 'demo') {
      // 提供示範分析
      const demoResult = {
        symbol: '2330',
        market: 'TW',
        interval: '1d',
        timestamp: new Date().toISOString(),
        overallScore: 75.5,
        overallSignal: 'buy' as const,
        overallConfidence: 82,
        summary: '3 個分析模組參與分析，綜合評分 75.5 分，整體趨勢看漲。買入信號 2 個，賣出信號 0 個。',
        recommendations: [
          {
            action: 'buy' as const,
            confidence: 82,
            reasoning: '綜合評分 75.5 分，建議強烈買入。主要信號：趨勢分析器(buy)、動量分析器(buy)',
            riskLevel: 'medium' as const,
            timeframe: '中期 (1-2週)',
            stopLoss: -3,
            takeProfit: 6
          }
        ],
        moduleResults: {
          '趨勢分析器': {
            score: 78,
            confidence: 85,
            signal: 'buy' as const,
            reasoning: '趨勢分析：移動平均線呈多頭排列，價格趨勢向上，趨勢強度moderate。'
          },
          '動量分析器': {
            score: 72,
            confidence: 80,
            signal: 'buy' as const,
            reasoning: '動量分析：RSI(45.2) 顯示買入信號，MACD 金叉，KDJ(65.3) 金叉。'
          },
          '成交量分析器': {
            score: 68,
            confidence: 75,
            signal: 'buy' as const,
            reasoning: '成交量分析：成交量趨勢向上，價量配合良好，OBV 上升，資金流入。'
          }
        },
        metadata: {
          totalModules: 3,
          activeModules: 3,
          analysisTime: 245
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
    logger.api.error('AI analysis v2 GET API error', error);
    return NextResponse.json({
      success: false,
      error: 'AI 分析 API 錯誤'
    }, { status: 500 });
  }
}
