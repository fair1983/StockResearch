import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceCollector } from '@/lib/data/yahoo-finance-collector';
import { DataConverter } from '@/lib/data/data-converter';

type Mkt = 'US'|'TW';
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

function normalizeCandles(raw: any[]) {
  return raw.map((c) => ({
    ts: typeof c.time === 'number' ? c.time : new Date(c.time).getTime(),
    open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume ?? 0
  }));
}
function findIdx(candles:any[], dateISO:string) {
  const t = new Date(dateISO).getTime();
  for (let i=0;i<candles.length;i++) if (candles[i].ts >= t) return i;
  return -1;
}
function annualized(ret:number, days:number) {
  if (days <= 0) return 0;
  return Math.pow(1+ret, 365/days) - 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, market, buyDate, sellDate, buyPrice, holdingDays,
      rules }: {
      symbol:string; market:Mkt; buyDate:string; sellDate?:string; buyPrice?:number; holdingDays?:number;
      rules?: { takeProfitPct?:number; stopLossPct?:number; trailingPct?:number }
    } = body;

    if (!symbol || !market || !buyDate) {
      return NextResponse.json({ success:false, error:'INVALID_PARAMS' }, { status:400 });
    }

    await collector.init();
    const hist = await collector.loadHistoricalData(symbol, market as any);
    if (!hist?.data?.length) throw new Error('NO_HIST');
    const candles = normalizeCandles(DataConverter.convertHistoricalToCandles(hist));
    const iBuy = findIdx(candles, buyDate);
    if (iBuy < 0) throw new Error('BUYDATE_OUT_OF_RANGE');

    const entry = buyPrice ?? candles[iBuy].close;
    let i = iBuy + 1;
    let peak = entry;
    let exitIdx = -1;
    let exitReason = 'time';

    const endIdx = sellDate ? findIdx(candles, sellDate) : (holdingDays ? Math.min(candles.length-1, iBuy + holdingDays) : candles.length-1);

    for (; i <= endIdx; i++) {
      const c = candles[i];
      peak = Math.max(peak, c.close);
      if (rules?.takeProfitPct && c.high >= entry * (1 + rules.takeProfitPct)) {
        exitIdx = i; exitReason = 'takeProfit'; break;
      }
      if (rules?.stopLossPct && c.low <= entry * (1 - rules.stopLossPct)) {
        exitIdx = i; exitReason = 'stopLoss'; break;
      }
      if (rules?.trailingPct) {
        const trail = peak * (1 - rules.trailingPct);
        if (c.low <= trail) { exitIdx = i; exitReason = 'trailing'; break; }
      }
    }
    if (exitIdx < 0) exitIdx = endIdx;

    const exit = candles[exitIdx].close;
    const ret = (exit - entry) / entry;
    const days = Math.max(1, Math.round((candles[exitIdx].ts - candles[iBuy].ts) / 86400000));
    const ann = annualized(ret, days);

    // 簡單最大回撤估算（期間內）
    let peakP = entry, mdd = 0;
    for (let k=iBuy; k<=exitIdx; k++) {
      peakP = Math.max(peakP, candles[k].close);
      const dd = (candles[k].close - peakP) / peakP;
      mdd = Math.min(mdd, dd);
    }

    return NextResponse.json({
      success:true,
      data: {
        symbol, market, buyDate, sellDate: candles[exitIdx] ? new Date(candles[exitIdx].ts).toISOString().slice(0,10) : sellDate,
        entry, exit, days, returnPct: ret, annualized: ann, maxDrawdown: mdd, exitReason
      }
    });
  } catch (e:any) {
    console.error('/api/what-if error', e);
    return NextResponse.json({ success:false, error:e?.message ?? 'UNKNOWN' }, { status:500 });
  }
}
