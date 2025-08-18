import { NextRequest, NextResponse } from 'next/server';
import { StockUpdater } from '@/lib/stock-updater';

export async function POST() {
  try {
    const updater = new StockUpdater();
    const result = await updater.incrementalUpdate();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error performing incremental update:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
