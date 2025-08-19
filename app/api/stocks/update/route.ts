import { NextRequest, NextResponse } from 'next/server';
import { stockDB } from '@/lib/stock-database';
import { dataManager } from '@/lib/data-manager';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    logger.api.request('Stock list update request received');
    
    const startTime = Date.now();
    
    // 重新載入股票資料庫
    stockDB.reload();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logger.api.response(`Stock list reload completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      message: '股票資料庫已重新載入',
      data: {
        totalStocks: stockDB.getAllStocks().length,
        marketStats: stockDB.getMarketStats(),
        categoryStats: stockDB.getCategoryStats(),
        detailedMarketStats: stockDB.getDetailedMarketStats(),
        categories: stockDB.getAllCategories()
      },
      duration: duration
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    const errorMessage = `Unexpected error during stock list update: ${error}`;
    logger.api.error(errorMessage);
    
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    logger.api.request('Stock list status request received');
    
    const stats = dataManager.getDataStats();
    const marketStats = stockDB.getMarketStats();
    
    const totalStocks = stockDB.getAllStocks().length;
    
    logger.api.response(`Stock list status: ${totalStocks} total symbols`);
    
    return NextResponse.json({
      success: true,
      data: {
        lastUpdated: stats.latestFile ? new Date().toISOString() : null,
        version: '2.0',
        totalStocks: totalStocks,
        breakdown: marketStats,
        categoryStats: stockDB.getCategoryStats(),
        detailedMarketStats: stockDB.getDetailedMarketStats(),
        categories: stockDB.getAllCategories(),
        dataFiles: stats.files.length,
        latestFile: stats.latestFile
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    const errorMessage = `Failed to get stock list status: ${error}`;
    logger.api.error(errorMessage);
    
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}
