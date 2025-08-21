import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceCollector } from '@/lib/data/yahoo-finance-collector';
import { DataConverter } from '@/lib/data/data-converter';
import { StockRecommendationsManager } from '@/lib/data/stock-recommendations-manager';

type Mkt = 'US'|'TW';
type Item = { symbol:string; market:Mkt; name?:string };

const collector = new YahooFinanceCollector({
  baseDir: 'data/yahoo-finance',
  markets: {
    US: { name: 'US', symbols: [], currency: 'USD', timezone: 'America/New_York' },
    TW: { name: 'TW', symbols: [], currency: 'TWD', timezone: 'Asia/Taipei' },
    HK: { name: 'HK', symbols: [], currency: 'HKD', timezone: 'Asia/Hong_Kong' },
    JP: { name: 'JP', symbols: [], currency: 'JPY', timezone: 'Asia/Tokyo' },
    CN: { name: 'CN', symbols: [], currency: 'CNY', timezone: 'Asia/Shanghai' },
  }
});

// ---- 指標與工具 ----
function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  let emaVal = values[0];
  const out = [emaVal];
  for (let i = 1; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
    out.push(emaVal);
  }
  return out;
}
function macd(values: number[]) {
  const ema12 = ema(values, 12);
  const ema26 = ema(values, 26);
  const diff = values.map((_, i) => (ema12[i] ?? values[i]) - (ema26[i] ?? values[i]));
  const signal = ema(diff, 9);
  const hist = diff.map((d, i) => d - (signal[i] ?? 0));
  return { diff, signal, hist };
}
function rsi(values: number[], period = 14) {
  if (values.length < period + 1) return Array(values.length).fill(50);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const chg = values[i] - values[i - 1];
    if (chg >= 0) gains += chg; else losses -= chg;
  }
  let rs = (gains / period) / ((losses || 1e-9) / period);
  const out = [ ...Array(period).fill(50), 100 - 100 / (1 + rs) ];
  for (let i = period + 1; i < values.length; i++) {
    const chg = values[i] - values[i - 1];
    const gain = Math.max(chg, 0);
    const loss = Math.max(-chg, 0);
    gains = (gains * (period - 1) + gain) / period;
    losses = (losses * (period - 1) + loss) / period;
    rs = gains / (losses || 1e-9);
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}
function stdevPct(values: number[], lookback = 20) {
  if (values.length < lookback) return 0.02;
  const arr = values.slice(-lookback);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
  return Math.sqrt(v) / mean; // 以價格為底的波動率
}

function normalizeCandles(raw: any[]) {
  return raw.map((c) => ({
    time: typeof c.time === 'number' ? c.time : new Date(c.time).getTime(),
    open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume ?? 0
  }));
}

// 綜合打分（0~100）
function scoreTechnical(closes: number[]) {
  if (closes.length < 60) return 50;
  const ema20 = ema(closes, 20), ema50 = ema(closes, 50), ema200 = ema(closes, 200);
  const { hist } = macd(closes); const r = rsi(closes, 14);
  const last = closes.length - 1;
  let s = 50;
  if (closes[last] > (ema20[last] ?? closes[last])) s += 5;
  if (closes[last] > (ema50[last] ?? closes[last])) s += 10;
  if (closes[last] > (ema200[last] ?? closes[last])) s += 15;
  if ((hist[last] ?? 0) > 0) s += 8;
  if ((r[last] ?? 50) > 50) s += 7;
  if ((r[last] ?? 50) > 70) s -= 5; // 過熱
  s -= Math.min(15, stdevPct(closes) * 100); // 高波動扣分
  return Math.round(Math.max(0, Math.min(100, s)));
}
function scoreFundamental(q: any) {
  // 若取不到基本面，給中性 50
  if (!q) return 50;
  let s = 50;
  if (q.returnOnEquity != null) s += Math.max(-10, Math.min(20, (q.returnOnEquity - 10) / 2));
  if (q.profitMargin != null) s += Math.max(-10, Math.min(20, (q.profitMargin - 5) / 2));
  if (q.debtToEquity != null) s += q.debtToEquity < 100 ? 8 : q.debtToEquity < 200 ? 2 : -8;
  if (q.peRatio != null) s += q.peRatio < 15 ? 8 : q.peRatio < 30 ? 2 : -6;
  return Math.round(Math.max(0, Math.min(100, s)));
}
function decideStrategy(tech: number, fund: number, risk: 'low'|'medium'|'high') {
  const overall = Math.round(tech * 0.6 + fund * 0.4);
  if (overall >= 65 && risk !== 'high') return { strategy: 'Buy', overall };
  if (overall >= 50) return { strategy: 'Hold', overall };
  return { strategy: 'Avoid', overall };
}
function riskLevelFromVol(closes: number[]): 'low'|'medium'|'high' {
  const v = stdevPct(closes);
  if (v < 0.02) return 'low';
  if (v < 0.04) return 'medium';
  return 'high';
}

// ---- 主要處理 ----
export async function GET(request: NextRequest) {
  try {
    await collector.init();
    const { searchParams } = new URL(request.url);
    const marketParam = (searchParams.get('market') ?? 'ALL').toUpperCase();
    const limit = parseInt(searchParams.get('limit') ?? '0', 10);
    const minScore = parseInt(searchParams.get('minScore') ?? '0', 10);

    const wantMarkets: Mkt[] = marketParam === 'ALL' ? ['US','TW'] :
      (['US','TW'].includes(marketParam) ? [marketParam as Mkt] : ['US','TW']);

    const symbols: Item[] = [];
    for (const m of wantMarkets) {
      const list = await StockRecommendationsManager.getSymbols(m);
      symbols.push(...list.map(s => ({ symbol: s.symbol, market: s.market as Mkt, name: s.name })));
    }

    const settled = await Promise.allSettled(symbols.map(async (s) => {
      // quote
      let quote = await collector.loadQuoteData(s.symbol, s.market as any);
      const isStale = quote ? (collector as any).isTimestampStale?.(quote.lastUpdated) ?? collector.isDataStale(quote.lastUpdated) : true;
      if (!quote || isStale) {
        const fresh = await collector.getQuote(s.symbol, s.market as any);
        if (fresh) { quote = fresh; await collector.saveQuoteData(s.symbol, s.market as any, fresh); }
      }
      // historical（自動回補）
      const hist = await collector.loadHistoricalData(s.symbol, s.market as any);
      if (!hist?.data?.length) throw new Error('NO_HIST');
      const candles = normalizeCandles(DataConverter.convertHistoricalToCandles(hist));
      const closes = candles.map(c => c.close);

      const tech = scoreTechnical(closes);
      const fund = scoreFundamental(quote);
      const risk = riskLevelFromVol(closes);
      const { strategy, overall } = decideStrategy(tech, fund, risk);
      const expectedReturn = Math.max(0.02, Math.min(0.20, (tech - 50) / 100)); // 0~0.2
      const confidence = Math.max(0.3, Math.min(0.9, 0.7 - stdevPct(closes))); // 0.3~0.9

      const pct = (quote?.regularMarketChangePercent ?? 0); // Yahoo 已是百分數值(例 5 表示 5%)
      const currentPrice = quote?.regularMarketPrice ?? 0;
      const priceChange = quote?.regularMarketChange ?? 0;

      return {
        ok: true,
        symbol: s.symbol,
        market: s.market,
        name: s.name ?? s.symbol,

        // 你原本的欄位
        currentPrice,
        priceChange,
        priceChangePercent: pct, // 百分數

        // ✅ 兼容 Screener/其它頁面常見欄位（避免 undefined）
        price: currentPrice,
        change: priceChange,
        changePct: pct,

        fundamentalScore: fund,
        technicalScore: tech,
        overallScore: overall,
        riskLevel: risk,
        expectedReturn,        // 小數 0~1
        confidence,            // 小數 0~1
        recommendedStrategy: strategy,
        isAnalyzed: true,      // 給卡片顯示用

        reasoning: `EMA趨勢、MACD/RSI 綜合評分；波動率${(stdevPct(closes)*100).toFixed(1)}% → ${risk}。`,
        technicalSignals: {
          trend: (closes.at(-1)! > (ema(closes, 50).at(-1) ?? closes.at(-1)!)) ? 'bullish' : 'neutral',
          momentum: Math.max(0, Math.min(1, (macd(closes).hist.at(-1) ?? 0) / (closes.at(-1)! * 0.01))),
          volatility: stdevPct(closes),
          support: Math.min(...closes.slice(-20)),
          resistance: Math.max(...closes.slice(-20)),
        },
      };
    }));

    const rows = settled
      .filter(r => r.status === 'fulfilled' && (r as any).value.ok)
      .map((r:any) => r.value)
      .filter((x:any) => x.overallScore >= minScore)
      .sort((a:any,b:any) => b.overallScore - a.overallScore);

    const data = limit > 0 ? rows.slice(0, limit) : rows;

    return NextResponse.json({ success: true, total: data.length, data });
  } catch (e:any) {
    console.error('/api/screener error', e);
    return NextResponse.json({ success:false, error: e?.message ?? 'UNKNOWN' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markets = ['US', 'TW'], limit = 50, mode = 'full', includeBacktest = false, exitPolicy } = body;

    console.log(`開始全市場掃描: ${markets.join(', ')}`);

    await collector.init();
    const { searchParams } = new URL(request.url);
    const marketParam = (searchParams.get('market') ?? 'ALL').toUpperCase();
    const limitParam = parseInt(searchParams.get('limit') ?? '0', 10);
    const minScore = parseInt(searchParams.get('minScore') ?? '0', 10);

    const wantMarkets: Mkt[] = marketParam === 'ALL' ? ['US','TW'] :
      (['US','TW'].includes(marketParam) ? [marketParam as Mkt] : ['US','TW']);

    const symbols: Item[] = [];
    for (const m of wantMarkets) {
      const list = await StockRecommendationsManager.getSymbols(m);
      symbols.push(...list.map(s => ({ symbol: s.symbol, market: s.market as Mkt, name: s.name })));
    }

    const settled = await Promise.allSettled(symbols.map(async (s) => {
      // quote
      let quote = await collector.loadQuoteData(s.symbol, s.market as any);
      const isStale = quote ? (collector as any).isTimestampStale?.(quote.lastUpdated) ?? collector.isDataStale(quote.lastUpdated) : true;
      if (!quote || isStale) {
        const fresh = await collector.getQuote(s.symbol, s.market as any);
        if (fresh) { quote = fresh; await collector.saveQuoteData(s.symbol, s.market as any, fresh); }
      }
      // historical（自動回補）
      const hist = await collector.loadHistoricalData(s.symbol, s.market as any);
      if (!hist?.data?.length) throw new Error('NO_HIST');
      const candles = normalizeCandles(DataConverter.convertHistoricalToCandles(hist));
      const closes = candles.map(c => c.close);

      const tech = scoreTechnical(closes);
      const fund = scoreFundamental(quote);
      const risk = riskLevelFromVol(closes);
      const { strategy, overall } = decideStrategy(tech, fund, risk);
      const expectedReturn = Math.max(0.02, Math.min(0.20, (tech - 50) / 100)); // 0~0.2
      const confidence = Math.max(0.3, Math.min(0.9, 0.7 - stdevPct(closes))); // 0.3~0.9

      const pct = (quote?.regularMarketChangePercent ?? 0); // Yahoo 已是百分數值(例 5 表示 5%)
      const currentPrice = quote?.regularMarketPrice ?? 0;
      const priceChange = quote?.regularMarketChange ?? 0;

      return {
        ok: true,
        symbol: s.symbol,
        market: s.market,
        name: s.name ?? s.symbol,

        // 你原本的欄位
        currentPrice,
        priceChange,
        priceChangePercent: pct, // 百分數

        // ✅ 兼容 Screener/其它頁面常見欄位（避免 undefined）
        price: currentPrice,
        change: priceChange,
        changePct: pct,

        fundamentalScore: fund,
        technicalScore: tech,
        overallScore: overall,
        riskLevel: risk,
        expectedReturn,        // 小數 0~1
        confidence,            // 小數 0~1
        recommendedStrategy: strategy,
        isAnalyzed: true,      // 給卡片顯示用

        reasoning: `EMA趨勢、MACD/RSI 綜合評分；波動率${(stdevPct(closes)*100).toFixed(1)}% → ${risk}。`,
        technicalSignals: {
          trend: (closes.at(-1)! > (ema(closes, 50).at(-1) ?? closes.at(-1)!)) ? 'bullish' : 'neutral',
          momentum: Math.max(0, Math.min(1, (macd(closes).hist.at(-1) ?? 0) / (closes.at(-1)! * 0.01))),
          volatility: stdevPct(closes),
          support: Math.min(...closes.slice(-20)),
          resistance: Math.max(...closes.slice(-20)),
        },
      };
    }));

    const rows = settled
      .filter(r => r.status === 'fulfilled' && (r as any).value.ok)
      .map((r:any) => r.value)
      .filter((x:any) => x.overallScore >= minScore)
      .sort((a:any,b:any) => b.overallScore - a.overallScore);

    const data = limit > 0 ? rows.slice(0, limit) : rows;

    return NextResponse.json({ success: true, total: data.length, data });
  } catch (e:any) {
    console.error('/api/screener error', e);
    return NextResponse.json({ success:false, error: e?.message ?? 'UNKNOWN' }, { status: 500 });
  }
}
