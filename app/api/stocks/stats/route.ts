import { NextRequest, NextResponse } from 'next/server';
import { StockUpdater } from '@/lib/stock-updater';

export async function GET() {
  try {
    const updater = new StockUpdater();
    const result = await updater.getStockStats();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error getting stock stats:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
