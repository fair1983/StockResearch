import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceCollector } from '@/lib/data/yahoo-finance-collector';
import { DataConverter } from '@/lib/data/data-converter';
import { StockRecommendationsManager } from '@/lib/data/stock-recommendations-manager';

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

function ema(values:number[], period:number){ const k=2/(period+1); let e=values[0]; const out=[e];
  for(let i=1;i<values.length;i++){ e=values[i]*k+e*(1-k); out.push(e);} return out; }
function macd(values:number[]){ const e12=ema(values,12), e26=ema(values,26);
  const diff=values.map((_,i)=> (e12[i]??values[i])-(e26[i]??values[i]));
  const signal=ema(diff,9); const hist=diff.map((d,i)=> d-(signal[i]??0)); return {diff,signal,hist}; }
function rsi(values:number[], period=14){ if(values.length<period+1) return Array(values.length).fill(50);
  let g=0,l=0; for(let i=1;i<=period;i++){const c=values[i]-values[i-1]; if(c>=0)g+=c;else l-=c;}
  let rs=(g/period)/((l||1e-9)/period); const out=[...Array(period).fill(50), 100-100/(1+rs)];
  for(let i=period+1;i<values.length;i++){const c=values[i]-values[i-1];
    g=(g*(period-1)+Math.max(c,0))/period; l=(l*(period-1)+Math.max(-c,0))/period;
    rs=g/(l||1e-9); out.push(100-100/(1+rs)); } return out; }
function obv(closes:number[], volumes:number[]){ let v=0; const out:[number]=[0] as any;
  for(let i=1;i<closes.length;i++){ if(closes[i]>closes[i-1]) v+=volumes[i];
    else if(closes[i]<closes[i-1]) v-=volumes[i]; out.push(v);} return out; }

function normalizeCandles(raw:any[]){ return raw.map(c=>({
  time: typeof c.time==='number'? c.time : new Date(c.time).getTime(),
  open:c.open, high:c.high, low:c.low, close:c.close, volume:c.volume??0
})); }

function reboundSignal(closes:number[], volumes:number[]){
  const n = closes.length;
  if (n < 40) return { score:0, reason:'資料不足' };
  const r = rsi(closes,14), m = macd(closes), _obv = obv(closes,volumes);
  const last = n-1;

  let score = 0; const reasons:string[] = [];

  // 1) RSI 由低位回升（<35 且近3根上升）
  const rsiRise = (r[last]??50) < 45 && (r[last]??0) > (r[last-1]??0) && (r[last-1]??0) > (r[last-2]??0);
  if (r[last] < 35 && rsiRise) { score += 3; reasons.push('RSI 低位回升'); }
  else if (rsiRise) { score += 2; reasons.push('RSI 回升'); }

  // 2) MACD 金叉徵兆（hist 連續走高或 diff 上穿 signal）
  const macdUp = (m.hist[last]??0) > (m.hist[last-1]??0) && (m.hist[last-1]??0) > (m.hist[last-2]??0);
  const crossUp = (m.diff[last-1]??0) <= (m.signal[last-1]??0) && (m.diff[last]??0) > (m.signal[last]??0);
  if (crossUp) { score += 3; reasons.push('MACD 金叉'); }
  else if (macdUp) { score += 2; reasons.push('MACD 柱體轉強'); }

  // 3) OBV 走高（量能配合）
  const obvUp = _obv[last] > _obv[last-1] && _obv[last-1] > _obv[last-2];
  if (obvUp) { score += 2; reasons.push('OBV 走高'); }

  // 4) 價格結構：出現 higher low 或收復 20EMA
  const e20 = ema(closes,20);
  const higherLow = Math.min(closes[last-1], closes[last-2]) > Math.min(closes[last-3], closes[last-4]);
  if (closes[last] > (e20[last] ?? closes[last])) { score += 2; reasons.push('收復 20EMA'); }
  else if (higherLow) { score += 1; reasons.push('出現 higher low'); }

  return { score, reason: reasons.join('、') };
}

export async function GET(req: NextRequest) {
  try {
    await collector.init();
    const { searchParams } = new URL(req.url);
    const market = (searchParams.get('market') ?? 'ALL').toUpperCase();
    const topN = parseInt(searchParams.get('limit') ?? '20', 10);

    const mkts: Mkt[] = market === 'ALL' ? ['US','TW'] : (['US','TW'].includes(market) ? [market as Mkt] : ['US','TW']);
    let symbols: { symbol:string; market:Mkt; name?:string }[] = [];
    for (const m of mkts) {
      const list = await StockRecommendationsManager.getSymbols(m);
      symbols.push(...list.map(s => ({ symbol:s.symbol, market:s.market as Mkt, name:s.name })));
    }

    const settled = await Promise.allSettled(symbols.map(async s => {
      const hist = await collector.loadHistoricalData(s.symbol, s.market as any);
      if (!hist?.data?.length) throw new Error('NO_HIST');
      const candles = normalizeCandles(DataConverter.convertHistoricalToCandles(hist));
      const closes = candles.map(c=>c.close);
      const volumes = candles.map(c=>c.volume);
      const sig = reboundSignal(closes, volumes);

      return {
        ok: true,
        symbol: s.symbol, market: s.market, name: s.name ?? s.symbol,
        score: sig.score,
        reason: sig.reason,
        price: closes.at(-1) ?? 0
      };
    }));

    const rows = settled.filter(r=>r.status==='fulfilled').map((r:any)=>r.value).filter((x:any)=>x.ok);
    rows.sort((a:any,b:any)=> b.score - a.score);
    return NextResponse.json({ success:true, total: rows.length, data: rows.slice(0, topN) });
  } catch (e:any) {
    console.error('/api/rebound-radar error', e);
    return NextResponse.json({ success:false, error:e?.message ?? 'UNKNOWN' }, { status:500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markets = ['US', 'TW'], minScore = 30 } = body;

    console.log(`開始反轉雷達掃描: ${markets.join(', ')}`);

    await collector.init();
    const { searchParams } = new URL(request.url);
    const market = (searchParams.get('market') ?? 'ALL').toUpperCase();
    const topN = parseInt(searchParams.get('limit') ?? '20', 10);

    const mkts: Mkt[] = market === 'ALL' ? ['US','TW'] : (['US','TW'].includes(market) ? [market as Mkt] : ['US','TW']);
    let symbols: { symbol:string; market:Mkt; name?:string }[] = [];
    for (const m of mkts) {
      const list = await StockRecommendationsManager.getSymbols(m);
      symbols.push(...list.map(s => ({ symbol:s.symbol, market:s.market as Mkt, name:s.name })));
    }

    const settled = await Promise.allSettled(symbols.map(async s => {
      const hist = await collector.loadHistoricalData(s.symbol, s.market as any);
      if (!hist?.data?.length) throw new Error('NO_HIST');
      const candles = normalizeCandles(DataConverter.convertHistoricalToCandles(hist));
      const closes = candles.map(c=>c.close);
      const volumes = candles.map(c=>c.volume);
      const sig = reboundSignal(closes, volumes);

      return {
        ok: true,
        symbol: s.symbol, market: s.market, name: s.name ?? s.symbol,
        score: sig.score,
        reason: sig.reason,
        price: closes.at(-1) ?? 0
      };
    }));

    const rows = settled.filter(r=>r.status==='fulfilled').map((r:any)=>r.value).filter((x:any)=>x.ok);
    rows.sort((a:any,b:any)=> b.score - a.score);
    return NextResponse.json({ success:true, total: rows.length, data: rows.slice(0, topN) });
  } catch (e:any) {
    console.error('/api/rebound-radar error', e);
    return NextResponse.json({ success:false, error:e?.message ?? 'UNKNOWN' }, { status:500 });
  }
}
