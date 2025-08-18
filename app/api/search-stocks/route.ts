import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceService } from '@/lib/yahoo-finance';
import { stockMetadataManager } from '@/lib/stock-metadata';
import { logger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

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
		await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
		logger.api.response('stocks.json updated from search', { count: results.length });
	} catch (e) {
		logger.api.error('Failed to persist results to stocks.json', e);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const query = searchParams.get('q')?.toLowerCase().trim() || '';
		const market = searchParams.get('market') || 'TW';
		const limit = parseInt(searchParams.get('limit') || '10');
		const useYahoo = searchParams.get('yahoo') === 'true';

		if (!query) {
			return NextResponse.json({ success: false, error: '請提供搜尋關鍵字' }, { status: 400 });
		}

		logger.api.request(`Searching stocks with query: ${query}`, { market, limit, useYahoo });

		// 載入元資料
		await stockMetadataManager.load();

		const results: any[] = [];

		// 1) 先從本地元資料搜尋
		const localResults = stockMetadataManager.searchStocks(query, limit);
		for (const metadata of localResults) {
			if (!metadata?.symbol) continue;
			results.push({
				symbol: metadata.symbol,
				name: metadata.name || metadata.symbol,
				market: metadata.market,
				category: metadata.category,
				exchange: metadata.exchange,
				exchangeName: metadata.exchangeName,
				source: 'local'
			});
		}

		// 2) Yahoo Finance 搜尋（補足）
		if (useYahoo && results.length < limit) {
			try {
				const yahooResults = await yahooFinanceService.searchStocks(query, limit - results.length);
				for (const yahooResult of yahooResults) {
					const symbol = (yahooResult && yahooResult.symbol) ? String(yahooResult.symbol).trim() : '';
					if (!symbol) continue; // 跳過無 symbol 的項目

					// 去重
					if (results.some(r => r.symbol === symbol)) continue;

					// 過濾非 US/TW 市場
					const exchange = yahooResult.exchange || '';
					if (!filterValidMarket(symbol, exchange)) {
						logger.api.warn(`Skipping non-US/TW market: ${symbol} (${exchange})`);
						continue;
					}

					const metadata = stockMetadataManager.getStockMetadata(symbol);
					const name = yahooResult.longname || yahooResult.shortname || yahooResult.name || metadata?.name || symbol;

					results.push({
						symbol,
						name,
						market: metadata?.market || determineMarket(symbol),
						category: metadata?.category || determineCategory(symbol, name),
						exchange: metadata?.exchange || exchange,
						exchangeName: metadata?.exchangeName || yahooResult.exchDisp || '',
						source: 'yahoo'
					});
				}
			} catch (e) {
				logger.api.warn('Yahoo Finance search failed (continuing with partial results)', e);
			}
		}

		// 3) 直接代碼查詢（若目前還沒有結果）
		if (results.length === 0 && /^[A-Z0-9.]{1,12}$/.test(query.toUpperCase())) {
			try {
				const symbol = query.toUpperCase();
				const metadata = stockMetadataManager.getStockMetadata(symbol);
				if (metadata) {
					results.push({
						symbol: metadata.symbol,
						name: metadata.name || metadata.symbol,
						market: metadata.market,
						category: metadata.category,
						exchange: metadata.exchange,
						exchangeName: metadata.exchangeName,
						source: 'local'
					});
				} else {
					try {
						const quote = await yahooFinanceService.getQuote(symbol);
						const name = quote?.longName || quote?.shortName || symbol;
						
						// 過濾非 US/TW 市場
						const exchange = quote?.exchange || '';
						if (!filterValidMarket(symbol, exchange)) {
							logger.api.warn(`Skipping non-US/TW market in direct lookup: ${symbol} (${exchange})`);
							return NextResponse.json({ success: false, error: '不支援此市場的股票' }, { status: 400 });
						}
						
						results.push({
							symbol,
							name,
							market: determineMarket(symbol),
							category: determineCategory(symbol, name),
							exchange: exchange,
							exchangeName: quote?.fullExchangeName || '',
							source: 'yahoo'
						});
					} catch (e) {
						logger.api.warn(`Direct symbol quote failed for ${symbol}`, e);
					}
				}
			} catch (e) {
				logger.api.warn('Direct symbol lookup failed', e);
			}
		}

		// 4) 排序（安全處理大小寫與 name 缺失）
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

		// 5) 限制數量
		const finalResults = results.slice(0, limit);

		// 6) 依使用者要求：搜尋結果自動寫入 data（去重，已存在就更新）
		await persistResultsToStocksJson(finalResults.map(r => ({
			symbol: r.symbol,
			name: r.name,
			market: r.market,
			category: r.category,
		})));

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

		logger.api.request('Adding stock to local data', { symbol, name });

		await stockMetadataManager.load();
		const existing = stockMetadataManager.getStockMetadata(symbol);
		if (existing) {
			return NextResponse.json({ success: false, error: '股票已存在於本地資料中' }, { status: 409 });
		}

		const finalMarket = market || determineMarket(symbol);
		const finalCategory = category || determineCategory(symbol, name);

		stockMetadataManager.setStockMetadata(symbol, {
			symbol,
			name,
			market: finalMarket,
			category: finalCategory,
			exchange: '',
			exchangeName: '',
			quoteType: '',
			currency: finalMarket === 'TW' ? 'TWD' : 'USD'
		});

		// 同步到 stocks.json
		await persistResultsToStocksJson([{ symbol, name, market: finalMarket, category: finalCategory }]);

		await stockMetadataManager.save();
		logger.api.response('Stock added to local data', { symbol, name });
		return NextResponse.json({ success: true, message: '股票已成功加入本地資料', data: { symbol, name, market: finalMarket, category: finalCategory } });
	} catch (error) {
		logger.api.error(`Error adding stock: ${error}`);
		return NextResponse.json({ success: false, error: '加入股票時發生錯誤' }, { status: 500 });
	}
}
