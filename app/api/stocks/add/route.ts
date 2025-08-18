import { NextRequest, NextResponse } from 'next/server';
import { StockUpdater } from '@/lib/stock-updater';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, name, market, category } = body;

    // 驗證必要參數
    if (!symbol || !name || !market || !category) {
      return NextResponse.json({
        success: false,
        message: 'Missing required parameters: symbol, name, market, category'
      }, { status: 400 });
    }

    // 驗證市場和類別
    if (!['TW', 'US'].includes(market)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid market. Must be "TW" or "US"'
      }, { status: 400 });
    }

    if (!['stock', 'etf'].includes(category)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid category. Must be "stock" or "etf"'
      }, { status: 400 });
    }

    const updater = new StockUpdater();
    const result = await updater.addStock(symbol, name, market as 'TW' | 'US', category as 'stock' | 'etf');
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error adding stock:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
