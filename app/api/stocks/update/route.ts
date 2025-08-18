import { NextRequest, NextResponse } from 'next/server';
import { StockUpdater } from '@/lib/stock-updater';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    logger.api.request('Stock list update request received');
    
    const startTime = Date.now();
    const updater = new StockUpdater();
    
    const result = await updater.updateAllStocks();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (result.success) {
      logger.api.response(`Stock list update completed successfully in ${duration}ms`);
      
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
        duration: duration
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    } else {
      logger.api.error(`Stock list update failed: ${result.message}`);
      
      return NextResponse.json({
        success: false,
        message: result.message,
        duration: duration
      }, {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
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
    
    const updater = new StockUpdater();
    const data = await updater.loadStockData();
    
    const totalStocks = data.stocks.TW.stocks.length + data.stocks.TW.etfs.length + 
                       data.stocks.US.stocks.length + data.stocks.US.etfs.length;
    
    logger.api.response(`Stock list status: ${totalStocks} total symbols`);
    
    return NextResponse.json({
      success: true,
      data: {
        lastUpdated: data.lastUpdated,
        version: data.version,
        totalStocks: totalStocks,
        breakdown: {
          twStocks: data.stocks.TW.stocks.length,
          twETFs: data.stocks.TW.etfs.length,
          usStocks: data.stocks.US.stocks.length,
          usETFs: data.stocks.US.etfs.length
        }
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
