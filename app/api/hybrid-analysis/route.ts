import { NextRequest, NextResponse } from 'next/server';
import { HybridAnalyzer } from '@/lib/ai/core/hybrid-analyzer';
import { AnalysisInput } from '@/lib/ai/interfaces/analyzer';
import { YahooFinanceCollector } from '@/lib/data/yahoo-finance-collector';
import { DataConverter } from '@/lib/data/data-converter';

const collector = new YahooFinanceCollector({
  baseDir: 'data/yahoo-finance',
  markets: {
    US: { name: 'US', symbols: [], currency: 'USD', timezone: 'America/New_York' },
    TW: { name: 'TW', symbols: [], currency: 'TWD', timezone: 'Asia/Taipei' },
    HK: { name: 'HK', symbols: [], currency: 'HKD', timezone: 'Asia/Hong_Kong' },
    JP: { name: 'JP', symbols: [], currency: 'JPY', timezone: 'Asia/Tokyo' },
    CN: { name: 'CN', symbols: [], currency: 'CNY', timezone: 'Asia/Shanghai' }
  }
});

// 初始化標記
let isInitialized = false;

const toQuoteLite = (q: any) => ({
  price: q?.regularMarketPrice ?? null,
  change: q?.regularMarketChange ?? null,
  changePct: q?.regularMarketChangePercent ?? null,
  volume: q?.regularMarketVolume ?? null,
  marketCap: q?.marketCap ?? null,
});

function normalizeCandles(raw: any[]) {
  return raw.map((c) => ({
    time: typeof c.time === 'number' ? c.time : new Date(c.time).getTime(),
    open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume ?? 0,
  }));
}

export async function POST(request: NextRequest) {
  try {
    // 確保初始化
    if (!isInitialized) {
      await collector.init();
      isInitialized = true;
    }

    const body = await request.json();
    const { symbol, market, action } = body;

    if (action === 'analyze-single' && symbol && market) {
      console.log(`混合分析股票: ${symbol}`);

      // ⚠️ 用 isTimestampStale（正確的方法名）
      let quoteData = await collector.loadQuoteData(symbol, market as any);
      if (!quoteData || collector.isTimestampStale(quoteData.lastUpdated)) {
        quoteData = await collector.getQuote(symbol, market as any);
        if (quoteData) await collector.saveQuoteData(symbol, market as any, quoteData);
      }
      if (!quoteData) {
        return NextResponse.json({ success: false, error: 'NO_QUOTE', message: `無法獲取 ${symbol} 報價` }, { status: 200 });
      }

      let historicalData = await collector.loadHistoricalData(symbol, market as any);
      if (!historicalData || collector.isTimestampStale(historicalData.lastUpdated)) {
        historicalData = await collector.loadHistoricalData(symbol, market as any);
      }
      if (!historicalData || !historicalData.data?.length) {
        return NextResponse.json({ success: false, error: 'NO_HISTORICAL_DATA', message: `無法獲取 ${symbol} 歷史數據` }, { status: 200 });
      }

      const rawCandles = DataConverter.convertHistoricalToCandles(historicalData);
      const candles = normalizeCandles(rawCandles);
      if (candles.length < 50) {
        return NextResponse.json({ success: false, error: 'INSUFFICIENT_CANDLES', message: `${symbol} K 線不足以分析` }, { status: 200 });
      }

      const analysisInput: AnalysisInput = {
        market: market as any,
        symbol,
        candles,
        fundamentals: {
          pe: quoteData.peRatio, ps: quoteData.priceToSales, peg: undefined,
          margin: quoteData.profitMargin, yoy: undefined,
          fcfMargin: (quoteData.freeCashFlow && quoteData.totalRevenue)
            ? (quoteData.freeCashFlow / quoteData.totalRevenue) * 100 : undefined,
          revenue: quoteData.totalRevenue, netIncome: quoteData.netIncome,
          debtToEquity: quoteData.debtToEquity, returnOnEquity: quoteData.returnOnEquity,
          dividendYield: quoteData.dividendYield
        },
        regime: { indexAbove200: true, breadth50: 0.6, vix: 20, marketTrend: 'neutral' }
      };

      const result = await HybridAnalyzer.analyzeStock(analysisInput);
      // ✅ 把精簡報價一起回傳，前端立即更新價格
      return NextResponse.json({
        success: true,
        data: result,
        quote: toQuoteLite(quoteData),
        message: `${symbol} 混合分析完成`
      });
    }

    if (action === 'analyze-batch' && Array.isArray(body.stocks)) {
      console.log(`批量混合分析 ${body.stocks.length} 支股票`);

      // 併發處理＋失敗也回原因
      const settled = await Promise.allSettled(
        body.stocks.map(async (s: { symbol: string; market: string }) => {
          try {
            let quote = await collector.loadQuoteData(s.symbol, s.market as any);
            if (!quote || collector.isTimestampStale(quote.lastUpdated)) {
              quote = await collector.getQuote(s.symbol, s.market as any);
              if (quote) await collector.saveQuoteData(s.symbol, s.market as any, quote);
            }
            if (!quote) return { symbol: s.symbol, market: s.market, ok: false, error: 'NO_QUOTE' };

            let hist = await collector.loadHistoricalData(s.symbol, s.market as any);
            if (!hist || collector.isTimestampStale(hist.lastUpdated)) {
              hist = await collector.loadHistoricalData(s.symbol, s.market as any);
            }
            if (!hist || !hist.data?.length) {
              return { symbol: s.symbol, market: s.market, ok: false, error: 'NO_HISTORICAL_DATA' };
            }

            const raw = DataConverter.convertHistoricalToCandles(hist);
            const candles = normalizeCandles(raw);
            if (candles.length < 50) {
              return { symbol: s.symbol, market: s.market, ok: false, error: 'INSUFFICIENT_CANDLES' };
            }

            const input: AnalysisInput = {
              market: s.market as any,
              symbol: s.symbol,
              candles,
              fundamentals: {
                pe: quote.peRatio,
                ps: quote.priceToSales,
                peg: undefined,
                margin: quote.profitMargin,
                yoy: undefined,
                fcfMargin: (quote.freeCashFlow && quote.totalRevenue)
                  ? (quote.freeCashFlow / quote.totalRevenue) * 100 : undefined,
                revenue: quote.totalRevenue,
                netIncome: quote.netIncome,
                debtToEquity: quote.debtToEquity,
                returnOnEquity: quote.returnOnEquity,
                dividendYield: quote.dividendYield
              },
              regime: { indexAbove200: true, breadth50: 0.6, vix: 20, marketTrend: 'neutral' }
            };

            const analysis = await HybridAnalyzer.analyzeStock(input);
            // ✅ 一併回傳 quote（讓前端卡片不會 $0）
            return { symbol: s.symbol, market: s.market, ok: true, analysis, quote: toQuoteLite(quote) };
          } catch (err: any) {
            return { symbol: s.symbol, market: s.market, ok: false, error: err?.message ?? 'UNKNOWN' };
          }
        })
      );

      const data = settled.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, error: 'REJECTED' }));
      return NextResponse.json({
        success: true,
        data,
        summary: {
          total: data.length,
          ok: data.filter((x: any) => x.ok).length,
          failed: data.filter((x: any) => !x.ok).length
        },
        message: '批量混合分析完成'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'INVALID_PARAMS',
      message: '請提供正確的 action、symbol、market 或 stocks 參數'
    }, { status: 400 });
  } catch (error) {
    console.error('混合分析 API 錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤',
      message: '混合分析失敗'
    }, { status: 500 });
  }
}
