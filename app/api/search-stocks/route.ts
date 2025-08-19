import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceService } from '@/lib/yahoo-finance';
import { stockDB } from '@/lib/stock-database';
import { logger } from '@/lib/logger';
import path from 'path';
import fs from 'fs/promises';

const yahooFinanceService = new YahooFinanceService();

// 期權代碼正則（如 AAPL250815C00225000, CRWV270115C00125000）
const OPTION_SYMBOL_REGEX = /^[A-Z][A-Z0-9.]{0,6}\d{6}[CP]\d{8}$/i;

// 市場判斷函數（備用，優先使用元資料）
function determineMarket(symbol: string): string {
	if (OPTION_SYMBOL_REGEX.test(symbol)) return 'US';
	if (/^\d{5}$/.test(symbol)) return 'TW';
	if (/^\d{4}$/.test(symbol)) return 'TW';
	if (/^[A-Z][A-Z0-9.]{0,6}$/.test(symbol)) return 'US';
	return 'TW';
}

// 過濾非 US/TW 市場
function filterValidMarket(symbol: string, exchange?: string): boolean {
	// 明確排除其他市場
	if (exchange && /\.MX$|\.TO$|\.V$|\.AX$|\.L$|\.PA$|\.F$|\.DE$|\.AS$|\.SW$|\.HK$|\.T$|\.KS$|\.SS$|\.SZ$/.test(exchange)) {
		return false;
	}
	
	// 符號格式判斷
	if (OPTION_SYMBOL_REGEX.test(symbol)) return true; // 期權都是 US
	if (/^\d{5}$/.test(symbol)) return true; // 5位數是 TW ETF
	if (/^\d{4}$/.test(symbol)) return true; // 4位數是 TW 股票
	if (/^[A-Z][A-Z0-9.]{0,6}$/.test(symbol)) return true; // 英文字母開頭是 US
	
	return false;
}

// 類型判斷函數（備用，優先使用元資料）
function determineCategory(symbol: string, name: string = ''): string {
	const nm = (name || '').toLowerCase();
	if (OPTION_SYMBOL_REGEX.test(symbol)) return 'option';
	if (/^\d{5}$/.test(symbol)) return 'etf';
	if (/^\d{4}$/.test(symbol)) return 'stock';
	if (/^[A-Z][A-Z0-9.]{0,6}$/.test(symbol)) {
		if (nm.includes('etf') || nm.includes('fund') || nm.includes('trust')) return 'etf';
		if (nm.includes('call') || nm.includes('put') || nm.includes('option')) return 'option';
		return 'stock';
	}
	return 'stock';
}

async function loadStocksJson() {
	const filePath = path.join(process.cwd(), 'data', 'stocks.json');
	const raw = await fs.readFile(filePath, 'utf8');
	return { filePath, data: JSON.parse(raw) } as { filePath: string; data: any };
}

function upsertIntoMarketNode(marketNode: any, entry: { symbol: string; name: string; market: string; category: string }) {
	const { symbol, name, category } = entry;
	// 確保結構存在
	marketNode.stocks = marketNode.stocks || [];
	marketNode.etfs = marketNode.etfs || [];
	if (marketNode.options === undefined) marketNode.options = []; // 兼容期權

	const upsert = (arr: any[]) => {
		const idx = arr.findIndex((x: any) => x.symbol === symbol);
		if (idx >= 0) {
			arr[idx] = { ...arr[idx], name, market: entry.market, category };
		} else {
			arr.push({ symbol, name, market: entry.market, category });
		}
	};

	if (category === 'etf') {
		// 從 stocks 移除、寫入 etfs
		marketNode.stocks = marketNode.stocks.filter((x: any) => x.symbol !== symbol);
		upsert(marketNode.etfs);
	} else if (category === 'option') {
		// 從 stocks/etfs 移除、寫入 options（僅 US 會用到）
		marketNode.stocks = marketNode.stocks.filter((x: any) => x.symbol !== symbol);
		marketNode.etfs = marketNode.etfs.filter((x: any) => x.symbol !== symbol);
		upsert(marketNode.options);
	} else {
		// 預設視為股票
		marketNode.etfs = marketNode.etfs.filter((x: any) => x.symbol !== symbol);
		upsert(marketNode.stocks);
	}
}

async function persistResultsToStocksJson(results: Array<{ symbol: string; name: string; market: string; category: string }>) {
	try {
		const { filePath, data } = await loadStocksJson();
		data.stocks = data.stocks || {};

		for (const r of results) {
			if (!r?.symbol || !r?.name) continue;
			const marketKey = r.market || determineMarket(r.symbol);
			data.stocks[marketKey] = data.stocks[marketKey] || { stocks: [], etfs: [] };
			upsertIntoMarketNode(data.stocks[marketKey], {
				symbol: r.symbol,
				name: r.name,
				market: marketKey,
				category: r.category || determineCategory(r.symbol, r.name),
			});
		}

		// 去重並排序
		for (const mk of Object.keys(data.stocks)) {
			const node = data.stocks[mk];
			const dedupe = (arr: any[]) => Array.from(new Map(arr.map((x: any) => [x.symbol, x])).values())
				.sort((a, b) => a.symbol.localeCompare(b.symbol));
			node.stocks = dedupe(node.stocks || []);
			node.etfs = dedupe(node.etfs || []);
			if (node.options) node.options = dedupe(node.options || []);
		}

		data.lastUpdated = new Date().toISOString();
		await fs.writeFile(filePath, JSON.stringify(data, null, 2));
		logger.api.response('stocks.json updated from search', { count: results.length });
	} catch (e) {
		logger.api.error('Failed to persist results to stocks.json', e);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const query = searchParams.get('q')?.toLowerCase().trim() || '';
		const market = searchParams.get('market') || '';
		const limit = parseInt(searchParams.get('limit') || '10');
		const useYahoo = searchParams.get('yahoo') === 'true';

		if (!query) {
			return NextResponse.json({ success: false, error: '請提供搜尋關鍵字' }, { status: 400 });
		}

		logger.api.request(`Searching stocks with query: ${query}`, { market, limit, useYahoo });

		const results: any[] = [];

		// 1) 從本地股票資料庫搜尋
		// 使用新的交易所地區搜尋
		const localResults = stockDB.searchStocksByExchange(query, market);
		for (const stock of localResults) {
			                   results.push({
                       symbol: stock.代號,
                       name: stock.名稱,
                       market: stock.市場,
                       category: stockDB.getStockCategory(stock),
                       exchange: stock.交易所 || (stock.市場 === '上市' ? 'TW' : 'US'),
                       exchangeName: (stock.交易所 || (stock.市場 === '上市' ? 'TW' : 'US')) === 'TW' ? '台灣證券交易所' : '美國證券交易所',
                       yahoo_symbol: stock.yahoo_symbol,
                       source: 'local'
                   });
		}

		// 2) 如果本地沒有結果且啟用 Yahoo Finance，則使用 Yahoo 搜尋
		if (useYahoo && results.length === 0) {
			try {
				const yahooResults = await yahooFinanceService.searchStocks(query, limit);
				for (const yahooResult of yahooResults) {
					const symbol = (yahooResult && yahooResult.symbol) ? String(yahooResult.symbol).trim() : '';
					if (!symbol) continue;

					// 過濾非 US/TW 市場
					const exchange = yahooResult.exchange || '';
					if (!filterValidMarket(symbol, exchange)) {
						logger.api.warn(`Skipping non-US/TW market: ${symbol} (${exchange})`);
						continue;
					}

					const name = yahooResult.longname || yahooResult.shortname || yahooResult.name || symbol;

					results.push({
						symbol,
						name,
						market: determineMarket(symbol),
						category: determineCategory(symbol, name),
						exchange: exchange,
						exchangeName: yahooResult.exchDisp || '',
						source: 'yahoo'
					});
				}
			} catch (e) {
				logger.api.warn('Yahoo Finance search failed', e);
			}
		}

		// 3) 排序
		results.sort((a, b) => {
			const qa = query;
			const as = String(a.symbol || '').toLowerCase();
			const bs = String(b.symbol || '').toLowerCase();
			if (as === qa && bs !== qa) return -1;
			if (bs === qa && as !== qa) return 1;

			if (as.startsWith(qa) && !bs.startsWith(qa)) return -1;
			if (bs.startsWith(qa) && !as.startsWith(qa)) return 1;

			const an = String(a.name || '').toLowerCase();
			const bn = String(b.name || '').toLowerCase();
			if (an.includes(qa) && !bn.includes(qa)) return -1;
			if (bn.includes(qa) && !an.includes(qa)) return 1;

			return as.localeCompare(bs);
		});

		// 4) 限制數量
		const finalResults = results.slice(0, limit);

		logger.api.response('Stock search completed', { count: finalResults.length });
		return NextResponse.json({ success: true, data: finalResults, total: finalResults.length });
	} catch (error) {
		logger.api.error(`Error searching stocks: ${error}`);
		return NextResponse.json({ success: false, error: '搜尋股票時發生錯誤' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { symbol, name, market, category } = body;

		if (!symbol || !name) {
			return NextResponse.json({ success: false, error: '請提供股票代碼和名稱' }, { status: 400 });
		}

		logger.api.request('Checking stock in database', { symbol, name });

		// 檢查股票是否已存在於資料庫中
		const existing = stockDB.getStockBySymbol(symbol, market);
		if (existing) {
			return NextResponse.json({ 
				success: true, 
				message: '股票已存在於資料庫中', 
				data: { 
					symbol: existing.代號, 
					name: existing.名稱, 
					market: existing.市場, 
					category: stockDB.getStockCategory(existing)
				} 
			});
		}

		// 如果不存在，返回錯誤（因為我們現在使用完整的資料庫）
		return NextResponse.json({ 
			success: false, 
			error: '股票不存在於資料庫中，請使用股票資料收集器更新資料庫' 
		}, { status: 404 });
	} catch (error) {
		logger.api.error(`Error checking stock: ${error}`);
		return NextResponse.json({ success: false, error: '檢查股票時發生錯誤' }, { status: 500 });
	}
}
