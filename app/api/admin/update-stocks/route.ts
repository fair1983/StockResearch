import { NextRequest, NextResponse } from 'next/server';
import { StockDataManager, StockData } from '@/lib/stock-data-manager';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    logger.api.request('Update stocks API called');
    
    const stockManager = StockDataManager.getInstance();
    
    // 這裡可以加入從外部 API 獲取最新股票列表的邏輯
    // 目前先使用現有的 JSON 檔案作為範例
    
    // 讀取現有資料
    const currentData = await stockManager.loadStockData();
    
    // 更新時間戳
    const updatedData: StockData = {
      ...currentData,
      lastUpdated: new Date().toISOString(),
      version: (parseFloat(currentData.version) + 0.1).toFixed(1)
    };
    
    // 更新股票資料
    await stockManager.updateStockData(updatedData);
    
    // 取得更新後的統計
    const stats = await stockManager.getStats();
    
    logger.api.response('Stocks updated successfully', stats);
    
    return NextResponse.json({
      success: true,
      message: '股票列表更新成功',
      stats
    });
    
  } catch (error) {
    logger.api.error('Failed to update stocks', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '更新股票列表失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    logger.api.request('Get stocks stats API called');
    
    const stockManager = StockDataManager.getInstance();
    const stats = await stockManager.getStats();
    
    logger.api.response('Stocks stats retrieved', stats);
    
    return NextResponse.json({
      success: true,
      stats
    });
    
  } catch (error) {
    logger.api.error('Failed to get stocks stats', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '取得股票統計失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    );
  }
}
