import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { YahooFinanceService } from '@/lib/yahoo-finance';

const service = new YahooFinanceService();

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const symbol = searchParams.get('symbol') || '';
		const market = searchParams.get('market') || 'TW';

		if (!symbol) {
			return NextResponse.json({ success: false, error: '請提供股票代碼 symbol' }, { status: 400 });
		}

		logger.api.request(`Fetching fundamentals`, { symbol, market });
		const data = await service.getFundamentals(symbol, market);
		logger.api.response(`Fundamentals fetched`, { keys: Object.keys(data || {}) });

		return NextResponse.json({ success: true, data }, {
			headers: {
				'X-Data-Source': 'Yahoo Finance',
			},
		});
	} catch (error) {
		logger.api.error('Fundamentals API error', error);
		return NextResponse.json({ success: false, error: '取得基本面資料失敗' }, { status: 500 });
	}
}
