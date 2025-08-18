import { NextRequest, NextResponse } from 'next/server';
import { Market } from '@/types';
import { logger } from '@/lib/logger';
import { StockDataManager } from '@/lib/stock-data-manager';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') as Market;
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();
    
    logger.api.request('Symbols API Request', { market, category, search });
    
    const stockManager = StockDataManager.getInstance();
    let symbols: any[] = [];
    
    if (market === 'TW' || market === 'US') {
      symbols = await stockManager.getStocksByMarket(market);
    } else {
      // 如果沒有指定市場，返回所有股票
      symbols = await stockManager.getAllStocks();
    }
    
    // 按類別篩選
    if (category) {
      symbols = symbols.filter(s => s.category === category);
    }
    
    // 按搜尋關鍵字篩選
    if (search) {
      symbols = symbols.filter(s => 
        s.symbol.toLowerCase().includes(search) ||
        s.name.toLowerCase().includes(search)
      );
    }
    
    // 按代碼排序
    symbols.sort((a, b) => a.symbol.localeCompare(b.symbol));
    
    // 取得類別列表
    const categories = await stockManager.getCategories(market);
    
    logger.api.response('Symbols API Response', { 
      totalSymbols: symbols.length,
      market,
      category,
      search 
    });
    
    return NextResponse.json({
      market,
      symbols,
      total: symbols.length,
      categories: market ? categories : ['TW', 'US']
    });
    
  } catch (error) {
    logger.api.error('Symbols API error', error);
    return NextResponse.json(
      { error: '內部伺服器錯誤' },
      { status: 500 }
    );
  }
}
