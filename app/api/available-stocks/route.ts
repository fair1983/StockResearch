import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // 載入測試資料
    const testDataPath = path.join(process.cwd(), 'test-data', 'test-stocks-data.json');
    
    if (!fs.existsSync(testDataPath)) {
      return NextResponse.json({ 
        success: false, 
        error: '找不到測試資料檔案' 
      }, { status: 404 });
    }

    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    
    // 過濾有效的股票資料
    const validStocks = testData.filter((stock: any) => 
      stock.success && 
      stock.data && 
      stock.data.length > 100 &&
      stock.symbol &&
      stock.name
    );

    return NextResponse.json({
      success: true,
      stocks: validStocks,
      total: validStocks.length
    });

  } catch (error) {
    console.error('載入股票列表失敗:', error);
    return NextResponse.json({ 
      success: false, 
      error: '載入股票列表失敗' 
    }, { status: 500 });
  }
}
