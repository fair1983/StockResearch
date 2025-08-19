import { NextRequest, NextResponse } from 'next/server';
import { WatchlistManager } from '@/lib/watchlist';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const watchlist = WatchlistManager.getWatchlist();
    const stats = WatchlistManager.getWatchlistStats();
    
    logger.api.info('Watchlist retrieved', { count: watchlist.length });
    
    return NextResponse.json({
      success: true,
      data: watchlist,
      stats
    });
  } catch (error) {
    logger.api.error('Failed to get watchlist', error);
    return NextResponse.json(
      { success: false, error: '無法取得關注列表' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, symbol, name, market, category } = body;
    
    if (!action || !symbol || !market) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'add':
        if (!name || !category) {
          return NextResponse.json(
            { success: false, error: '添加關注股票需要完整資訊' },
            { status: 400 }
          );
        }
        
        const added = WatchlistManager.addToWatchlist({
          symbol,
          name,
          market,
          category
        });
        
        if (added) {
          logger.api.info('Stock added to watchlist', { symbol, market });
          return NextResponse.json({ success: true, message: '已添加到關注列表' });
        } else {
          return NextResponse.json(
            { success: false, error: '股票已在關注列表中' },
            { status: 409 }
          );
        }
        
      case 'remove':
        const removed = WatchlistManager.removeFromWatchlist(symbol, market);
        
        if (removed) {
          logger.api.info('Stock removed from watchlist', { symbol, market });
          return NextResponse.json({ success: true, message: '已從關注列表移除' });
        } else {
          return NextResponse.json(
            { success: false, error: '股票不在關注列表中' },
            { status: 404 }
          );
        }
        
      case 'clear':
        WatchlistManager.clearWatchlist();
        logger.api.info('Watchlist cleared');
        return NextResponse.json({ success: true, message: '關注列表已清空' });
        
      default:
        return NextResponse.json(
          { success: false, error: '無效的操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.api.error('Watchlist operation failed', error);
    return NextResponse.json(
      { success: false, error: '操作失敗' },
      { status: 500 }
    );
  }
}
