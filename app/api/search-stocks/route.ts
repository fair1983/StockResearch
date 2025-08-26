import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceService } from '@/lib/yahoo-finance';
import { stockDB } from '@/lib/stock-database-v2';
import { logger } from '@/lib/logger';
import { Result } from '@/lib/core/result';
import fs from 'fs/promises';
import path from 'path';

const yahooFinanceService = new YahooFinanceService();

// 期權代碼正則（如 AAPL250815C00225000, CRWV270115C00125000）
const OPTION_SYMBOL_REGEX = /^[A-Z][A-Z0-9.]{0,6}\d{6}[CP]\d{8}$/i;

// 市場判斷函數（備用，優先使用元資料）
function determineMarket(symbol: string, exchange?: string): string {
	// 優先根據交易所代號判斷
	if (exchange) {
		if (exchange === 'TAI') return 'TW';
		if (['NMS', 'NYQ', 'PCX', 'NGM', 'OPR', 'NEO', 'BTS', 'PNK'].includes(exchange)) return 'US';
	}
	
	// 根據股票代號格式判斷（備用）
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

async function loadFullMarketData(market: string) {
	try {
		const filePath = path.join(process.cwd(), 'data', 'full-market', `${market}-stocks-latest.json`);
		const raw = await fs.readFile(filePath, 'utf8');
		const data = JSON.parse(raw);
		return data.collectedStocks || [];
	} catch (error) {
		logger.api.warn(`Failed to load full-market data for ${market}`, error);
		return [];
	}
}

/**
 * 根據股票代號和名稱獲取預設產業分類
 */
function getDefaultSector(symbol: string, name: string): string {
	const lowerName = name.toLowerCase();
	const lowerSymbol = symbol.toLowerCase();

	// 科技股
	if (lowerName.includes('apple') || lowerName.includes('microsoft') || lowerName.includes('google') || 
		lowerName.includes('amazon') || lowerName.includes('meta') || lowerName.includes('tesla') ||
		lowerName.includes('nvidia') || lowerName.includes('intel') || lowerName.includes('amd') ||
		lowerName.includes('netflix') || lowerName.includes('salesforce') || lowerName.includes('oracle')) {
		return 'Technology';
	}

	// 金融股
	if (lowerName.includes('bank') || lowerName.includes('financial') || lowerName.includes('insurance') ||
		lowerName.includes('jpmorgan') || lowerName.includes('goldman') || lowerName.includes('morgan stanley') ||
		lowerName.includes('wells fargo') || lowerName.includes('citigroup')) {
		return 'Financial Services';
	}

	// 醫療保健
	if (lowerName.includes('pharma') || lowerName.includes('medical') || lowerName.includes('health') ||
		lowerName.includes('biotech') || lowerName.includes('johnson') || lowerName.includes('pfizer')) {
		return 'Healthcare';
	}

	// 消費品
	if (lowerName.includes('coca') || lowerName.includes('pepsi') || lowerName.includes('procter') ||
		lowerName.includes('walmart') || lowerName.includes('target') || lowerName.includes('costco')) {
		return 'Consumer Defensive';
	}

	// 能源
	if (lowerName.includes('exxon') || lowerName.includes('chevron') || lowerName.includes('conocophillips')) {
		return 'Energy';
	}

	// 工業
	if (lowerName.includes('boeing') || lowerName.includes('general electric') || lowerName.includes('3m')) {
		return 'Industrials';
	}

	// 通訊服務
	if (lowerName.includes('verizon') || lowerName.includes('at&t') || lowerName.includes('comcast')) {
		return 'Communication Services';
	}

	// 房地產
	if (lowerName.includes('real estate') || lowerName.includes('reit')) {
		return 'Real Estate';
	}

	// 材料
	if (lowerName.includes('chemical') || lowerName.includes('material') || lowerName.includes('mining')) {
		return 'Basic Materials';
	}

	// 公用事業
	if (lowerName.includes('utility') || lowerName.includes('power') || lowerName.includes('energy')) {
		return 'Utilities';
	}

	return 'Technology'; // 預設為科技股
}

/**
 * 根據股票代號和名稱獲取預設產業
 */
function getDefaultIndustry(symbol: string, name: string): string {
	const lowerName = name.toLowerCase();
	const lowerSymbol = symbol.toLowerCase();

	// Apple
	if (lowerName.includes('apple')) return 'Consumer Electronics';

	// Microsoft
	if (lowerName.includes('microsoft')) return 'Software - Infrastructure';

	// Google/Alphabet
	if (lowerName.includes('google') || lowerName.includes('alphabet')) return 'Internet Content & Information';

	// Amazon
	if (lowerName.includes('amazon')) return 'Internet Retail';

	// Meta/Facebook
	if (lowerName.includes('meta') || lowerName.includes('facebook')) return 'Internet Content & Information';

	// Tesla
	if (lowerName.includes('tesla')) return 'Auto Manufacturers';

	// Nvidia
	if (lowerName.includes('nvidia')) return 'Semiconductors';

	// Intel
	if (lowerName.includes('intel')) return 'Semiconductors';

	// AMD
	if (lowerName.includes('amd')) return 'Semiconductors';

	// Netflix
	if (lowerName.includes('netflix')) return 'Entertainment';

	// Salesforce
	if (lowerName.includes('salesforce')) return 'Software - Application';

	// Oracle
	if (lowerName.includes('oracle')) return 'Software - Infrastructure';

	// 銀行
	if (lowerName.includes('bank') || lowerName.includes('jpmorgan') || lowerName.includes('wells fargo')) {
		return 'Banks - Global';
	}

	// 保險
	if (lowerName.includes('insurance') || lowerName.includes('aig') || lowerName.includes('metlife')) {
		return 'Insurance - Diversified';
	}

	// 醫療
	if (lowerName.includes('pharma') || lowerName.includes('pfizer') || lowerName.includes('merck')) {
		return 'Drug Manufacturers - General';
	}

	// 消費品
	if (lowerName.includes('coca') || lowerName.includes('pepsi')) return 'Beverages - Non-Alcoholic';
	if (lowerName.includes('procter')) return 'Household & Personal Products';
	if (lowerName.includes('walmart') || lowerName.includes('target')) return 'Discount Stores';

	// 能源
	if (lowerName.includes('exxon') || lowerName.includes('chevron')) return 'Oil & Gas Integrated';

	// 工業
	if (lowerName.includes('boeing')) return 'Aerospace & Defense';
	if (lowerName.includes('general electric')) return 'Specialty Industrial Machinery';

	// 通訊
	if (lowerName.includes('verizon') || lowerName.includes('at&t')) return 'Telecom Services';

	return 'Technology'; // 預設
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
		const localStocks = stockDB.searchStocks(query, market);
		if (localStocks && localStocks.length > 0) {
			results.push(...localStocks.map(stock => ({
				symbol: stock.代號,
				name: stock.名稱,
				market: stock.市場 === '上市' ? 'TW' : stock.市場,
				category: stock.ETF ? 'etf' : 'stock',
				exchange: stock.交易所 || (stock.市場 === '上市' ? 'TW' : 'US'),
				exchangeName: (stock.交易所 || (stock.市場 === '上市' ? 'TW' : 'US')) === 'TW' ? '台灣證券交易所' : '美國證券交易所',
				yahoo_symbol: stock.yahoo_symbol,
				source: 'local'
			})));
		}

		// 2) 如果本地資料庫沒有結果，從 full-market 資料搜尋
		if (results.length === 0) {
			try {
				const fullMarketData = await loadFullMarketData(market);
				if (fullMarketData && fullMarketData.length > 0) {
					const matchingStocks = fullMarketData.filter(stock => {
						const lowerQuery = query.toLowerCase();
						return stock.symbol.toLowerCase().includes(lowerQuery) ||
							   stock.name.toLowerCase().includes(lowerQuery);
					});

					if (matchingStocks.length > 0) {
						// 為每個匹配的股票獲取詳細資訊
						const detailedResults = await Promise.all(
							matchingStocks.map(async (stock) => {
								try {
									// 從基本面 API 獲取詳細資訊
									const fundamentalResponse = await fetch(`http://localhost:3000/api/fundamentals?symbol=${stock.symbol}&market=${stock.market}`);
									const fundamentalData = await fundamentalResponse.json();
									
									if (fundamentalData.success) {
										return {
											symbol: stock.symbol,
											name: stock.name,
											market: stock.market,
											category: 'stock', // 預設為股票
											exchange: stock.exchange || stock.market,
											exchangeName: stock.market === 'TW' ? '台灣證券交易所' : '美國證券交易所',
											yahoo_symbol: stock.symbol,
											source: 'full-market',
											sector: fundamentalData.data.sector || stock.sector || getDefaultSector(stock.symbol, stock.name),
											industry: fundamentalData.data.industry || stock.industry || getDefaultIndustry(stock.symbol, stock.name)
										};
									} else {
										// 如果基本面 API 失敗，使用預設值
										return {
											symbol: stock.symbol,
											name: stock.name,
											market: stock.market,
											category: 'stock',
											exchange: stock.exchange || stock.market,
											exchangeName: stock.market === 'TW' ? '台灣證券交易所' : '美國證券交易所',
											yahoo_symbol: stock.symbol,
											source: 'full-market',
											sector: stock.sector || getDefaultSector(stock.symbol, stock.name),
											industry: stock.industry || getDefaultIndustry(stock.symbol, stock.name)
										};
									}
								} catch (error) {
									// 如果無法獲取詳細資訊，使用預設值
									return {
										symbol: stock.symbol,
										name: stock.name,
										market: stock.market,
										category: 'stock',
										exchange: stock.exchange || stock.market,
										exchangeName: stock.market === 'TW' ? '台灣證券交易所' : '美國證券交易所',
										yahoo_symbol: stock.symbol,
										source: 'full-market',
										sector: getDefaultSector(stock.symbol, stock.name),
										industry: getDefaultIndustry(stock.symbol, stock.name)
									};
								}
							})
						);
						
						results.push(...detailedResults);
					}
				}
			} catch (error) {
				logger.api.warn('Full-market data search failed', error);
			}
		}

		// 2) 如果本地沒有結果且啟用 Yahoo Finance，則檢查是否在 Yahoo 中存在但本地資料庫中沒有
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

					// 檢查是否已存在於本地資料庫中
					const existingResult = await stockDB.getStockBySymbol(symbol);
					if (existingResult.isOk() && existingResult.getData()) {
						const existingStock = existingResult.getData()!;
						// 如果存在於本地資料庫，加入結果
						results.push({
							symbol: existingStock.代號,
							name: existingStock.名稱,
							market: existingStock.市場,
							category: 'stock', // 簡化處理
							exchange: existingStock.交易所 || (existingStock.市場 === '上市' ? 'TW' : 'US'),
							exchangeName: (existingStock.交易所 || (existingStock.市場 === '上市' ? 'TW' : 'US')) === 'TW' ? '台灣證券交易所' : '美國證券交易所',
							yahoo_symbol: existingStock.yahoo_symbol,
							source: 'local'
						});
					}
					// 如果不存在於本地資料庫，不加入結果（不自動新增）
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
		const existingResult = await stockDB.getStockBySymbol(symbol, market);
		if (existingResult.isOk() && existingResult.getData()) {
			const existing = existingResult.getData()!;
			return NextResponse.json({ 
				success: true, 
				message: '股票已存在於資料庫中', 
				data: { 
					symbol: existing.代號, 
					name: existing.名稱, 
					market: existing.市場, 
					category: 'stock' // 簡化處理
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
