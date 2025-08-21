import fs from 'fs/promises';
import path from 'path';

/**
 * Yahoo Finance 股票數據介面
 */
export interface YahooFinanceData {
  symbol: string;
  name: string;
  market: string;
  currency: string;
  exchange: string;
  quoteType: string;
  timestamp: number;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  dividendYield?: number;
  peRatio?: number;
  eps?: number;
  beta?: number;
  priceToBook?: number;
  priceToSales?: number;
  debtToEquity?: number;
  returnOnEquity?: number;
  profitMargin?: number;
  operatingMargin?: number;
  currentRatio?: number;
  quickRatio?: number;
  cashRatio?: number;
  totalCash?: number;
  totalDebt?: number;
  totalRevenue?: number;
  grossProfit?: number;
  freeCashFlow?: number;
  operatingCashFlow?: number;
  netIncome?: number;
  sharesOutstanding?: number;
  sharesFloat?: number;
  sharesShort?: number;
  shortRatio?: number;
  shortPercentOfFloat?: number;
  institutionalOwnership?: number;
  insiderOwnership?: number;
  sector?: string;
  industry?: string;
  country?: string;
  website?: string;
  businessSummary?: string;
  employees?: number;
  founded?: number;
  lastUpdated: string;
}

/**
 * 歷史價格數據介面
 */
export interface HistoricalData {
  symbol: string;
  market: string;
  data: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjClose: number;
  }[];
  lastUpdated: string;
}

/**
 * 市場分類
 */
export type MarketType = 'US' | 'TW' | 'HK' | 'JP' | 'CN';

/**
 * 數據存儲配置
 */
export interface DataStorageConfig {
  baseDir: string;
  markets: {
    [key in MarketType]: {
      name: string;
      symbols: string[];
      currency: string;
      timezone: string;
    };
  };
}

/**
 * Yahoo Finance 數據收集器
 */
export class YahooFinanceCollector {
  private config: DataStorageConfig;
  private baseUrl = 'https://query1.finance.yahoo.com';
  /** 解析成絕對路徑，避免 Next 的 cwd 差異 */
  private absBaseDir: string;

  constructor(config: DataStorageConfig) {
    this.config = config;
    this.absBaseDir = path.isAbsolute(config.baseDir)
      ? config.baseDir
      : path.resolve(process.cwd(), config.baseDir);
  }

  /**
   * 初始化收集器（創建目錄結構）
   */
  async init(): Promise<void> {
    await this.ensureDirectories();
  }

  /**
   * 確保目錄結構存在
   */
  private async ensureDirectories(): Promise<void> {
    try {
      // 用絕對路徑
      await fs.mkdir(this.absBaseDir, { recursive: true });

      const markets = this.config.markets || {} as DataStorageConfig['markets'];
      for (const market of Object.keys(markets)) {
        const marketDir = path.join(this.absBaseDir, market);
        await fs.mkdir(path.join(marketDir, 'quotes'), { recursive: true });
        await fs.mkdir(path.join(marketDir, 'historical'), { recursive: true });
        await fs.mkdir(path.join(marketDir, 'metadata'), { recursive: true });
      }
    } catch (error) {
      console.error('創建目錄結構失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取股票報價數據
   */
  async getQuote(symbol: string, market: MarketType): Promise<YahooFinanceData | null> {
    try {
      const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(symbol)}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        console.warn(`無法獲取 ${symbol} 的數據`);
        return null;
      }

      const result = data.chart.result[0];
      const meta = result.meta;

      const quoteData: YahooFinanceData = {
        symbol: meta.symbol,
        name: meta.shortName || meta.longName || symbol,
        market,
        currency: meta.currency,
        exchange: meta.exchangeName,
        quoteType: meta.quoteType,
        timestamp: meta.regularMarketTime,
        regularMarketPrice: meta.regularMarketPrice,
        regularMarketChange: meta.regularMarketPrice - meta.previousClose,
        regularMarketChangePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        regularMarketVolume: meta.regularMarketVolume,
        marketCap: meta.marketCap,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        lastUpdated: new Date().toISOString()
      };

      return quoteData;
    } catch (error) {
      console.error(`獲取 ${symbol} 報價失敗:`, error);
      return null;
    }
  }

  /** 將 Yahoo chart JSON 轉為 HistoricalData.data 陣列 */
  private parseChartToRows(json: any) {
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const ts = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const o = q.open ?? [], h = q.high ?? [], l = q.low ?? [], c = q.close ?? [], v = q.volume ?? [];

    const rows = [];
    for (let i = 0; i < ts.length; i++) {
      if (c[i] == null) continue;
      rows.push({
        date: new Date(ts[i] * 1000).toISOString().split('T')[0],
        open: o[i] ?? c[i],
        high: h[i] ?? c[i],
        low:  l[i] ?? c[i],
        close: c[i],
        volume: v[i] ?? 0,
        adjClose: c[i]
      });
    }
    return rows;
  }

  /** 用 range 形式抓（400/429 時常比 period 好用） */
  private async fetchByRange(symbol: string, range: string, interval: '1d'|'1wk'|'1mo'='1d') {
    const url = new URL(`${this.baseUrl}/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set('range', range);
    url.searchParams.set('interval', interval);
    url.searchParams.set('includePrePost', 'false');

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    return await res.json();
  }

  /**
   * 使用 range 參數獲取歷史數據（比 period1/period2 更穩定）
   */
  async getHistoricalByRange(
    symbol: string,
    market: MarketType,
    range: '6mo'|'1y'|'2y'|'5y' = '2y',
    interval: '1d'|'1wk'|'1mo' = '1d'
  ): Promise<HistoricalData|null> {
    try {
      const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includeAdjustedClose=true`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const r = json?.chart?.result?.[0];
      if (!r?.timestamp?.length) return null;
      const q = r.indicators?.quote?.[0] ?? {};
      const data = r.timestamp.map((t:number,i:number)=>({
        date: new Date(t*1000).toISOString().slice(0,10),
        open: q.open?.[i] ?? 0,
        high: q.high?.[i] ?? 0,
        low:  q.low?.[i]  ?? 0,
        close:q.close?.[i]?? 0,
        volume:q.volume?.[i]?? 0,
        adjClose: r.indicators?.adjclose?.[0]?.adjclose?.[i] ?? (q.close?.[i] ?? 0),
      }));
      return { symbol, market, data, lastUpdated: new Date().toISOString() };
    } catch(e){
      console.error(`range 抓 ${symbol} 失敗:`, e); 
      return null;
    }
  }

  /**
   * 獲取歷史價格數據
   */
  async getHistoricalData(
    symbol: string,
    market: MarketType,
    period1: number,
    period2: number,
    interval: '1d' | '1wk' | '1mo' = '1d'
  ): Promise<HistoricalData | null> {
    try {
      // 先試 period 參數
      const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}`;
      let res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

      let json: any = null;
      if (res.ok) {
        json = await res.json();
      } else {
        // 400/429/404 等 → 改用 range 重試（1y→3mo）
        json = await this.fetchByRange(symbol, '1y', interval) ||
               await this.fetchByRange(symbol, '3mo', interval);
        if (!json) return null;
      }

      const rows = this.parseChartToRows(json);
      if (!rows.length) return null;

      const historicalData: HistoricalData = {
        symbol,
        market,
        data: rows,
        lastUpdated: new Date().toISOString()
      };
      return historicalData;
    } catch (error) {
      console.error(`獲取 ${symbol} 歷史數據失敗:`, error);
      return null;
    }
  }

  /**
   * 保存報價數據到 JSON 文件
   */
  async saveQuoteData(symbol: string, market: MarketType, data: YahooFinanceData): Promise<void> {
    await this.init();
    const filePath = path.join(this.absBaseDir, market, 'quotes', `${symbol}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`已保存 ${symbol} 報價數據到 ${filePath}`);
  }

  /**
   * 保存歷史數據到 JSON 文件
   */
  async saveHistoricalData(symbol: string, market: MarketType, data: HistoricalData): Promise<void> {
    await this.init();
    const filePath = path.join(this.absBaseDir, market, 'historical', `${symbol}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`已保存 ${symbol} 歷史數據到 ${filePath}`);
  }

  /**
   * 保存市場元數據
   */
  async saveMarketMetadata(market: MarketType, metadata: any): Promise<void> {
    await this.init();
    const filePath = path.join(this.absBaseDir, market, 'metadata', 'market-info.json');
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log(`已保存 ${market} 市場元數據`);
  }

  /**
   * 批量收集市場數據
   */
  async collectMarketData(market: MarketType): Promise<void> {
    console.log(`開始收集 ${market} 市場數據...`);
    
    const marketConfig = this.config.markets[market];
    const results = {
      success: 0,
      failed: 0,
      symbols: [] as string[]
    };

    for (const symbol of marketConfig.symbols) {
      try {
        // 獲取報價數據
        const quoteData = await this.getQuote(symbol, market);
        if (quoteData) {
          await this.saveQuoteData(symbol, market, quoteData);
          results.success++;
          results.symbols.push(symbol);
        } else {
          results.failed++;
        }

        // 獲取歷史數據（過去一年）
        const period1 = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
        const period2 = Math.floor(Date.now() / 1000);
        const historicalData = await this.getHistoricalData(symbol, market, period1, period2);
        if (historicalData) {
          await this.saveHistoricalData(symbol, market, historicalData);
        }

        // 添加延遲避免 API 限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`處理 ${symbol} 失敗:`, error);
        results.failed++;
      }
    }

    // 保存市場元數據
    const metadata = {
      market,
      name: marketConfig.name,
      currency: marketConfig.currency,
      timezone: marketConfig.timezone,
      totalSymbols: marketConfig.symbols.length,
      successCount: results.success,
      failedCount: results.failed,
      collectedSymbols: results.symbols,
      lastUpdated: new Date().toISOString()
    };

    await this.saveMarketMetadata(market, metadata);
    console.log(`${market} 市場數據收集完成: 成功 ${results.success}, 失敗 ${results.failed}`);
  }

  /**
   * 讀取已保存的報價數據
   */
  async loadQuoteData(symbol: string, market: MarketType): Promise<YahooFinanceData | null> {
    await this.init();
    try {
      const filePath = path.join(this.absBaseDir, market, 'quotes', `${symbol}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`讀取 ${symbol} 報價數據失敗:`, error);
      return null;
    }
  }

  /**
   * 讀取已保存的歷史數據
   */
  async loadHistoricalData(symbol: string, market: MarketType): Promise<HistoricalData | null> {
    await this.init();

    const filePath = path.join(this.absBaseDir, market, 'historical', `${symbol}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (e: any) {
      if (e?.code !== 'ENOENT') {
        console.error(`讀取 ${symbol} 歷史數據失敗:`, e);
        return null;
      }
      // 本地沒有 → 嘗試抓取 1 年日線
      const period2 = Math.floor(Date.now() / 1000);
      const period1 = period2 - 365 * 24 * 60 * 60;

      const fetched = await this.getHistoricalData(symbol, market, period1, period2, '1d');
      if (!fetched) {
        console.warn(`遠端也取不到 ${symbol} 歷史數據（將回 null，不拋錯）`);
        return null;
      }
      await this.saveHistoricalData(symbol, market, fetched);
      return fetched;
    }
  }

  /**
   * 獲取市場所有股票列表
   */
  async getMarketSymbols(market: MarketType): Promise<string[]> {
    await this.init();
    try {
      const metadataPath = path.join(this.absBaseDir, market, 'metadata', 'market-info.json');
      const data = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(data);
      return metadata.collectedSymbols || [];
    } catch (error) {
      console.error(`讀取 ${market} 股票列表失敗:`, error);
      return [];
    }
  }

  /**
   * 檢查數據是否過期（超過24小時）
   */
  async isDataStale(symbol: string, market: MarketType): Promise<boolean> {
    try {
      // 嘗試讀取報價數據來獲取 lastUpdated
      const quoteData = await this.loadQuoteData(symbol, market);
      if (!quoteData || !quoteData.lastUpdated) {
        return true; // 沒有數據或沒有時間戳，認為是過期的
      }

      const lastUpdatedDate = new Date(quoteData.lastUpdated);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60);

      return hoursDiff > 24;
    } catch (error) {
      return true;
    }
  }

  /**
   * 檢查時間戳是否過期（超過24小時）
   */
  isTimestampStale(lastUpdated: string): boolean {
    try {
      const lastUpdatedDate = new Date(lastUpdated);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60);

      return hoursDiff > 24;
    } catch (error) {
      return true;
    }
  }
}


