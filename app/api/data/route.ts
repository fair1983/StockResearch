import { NextRequest, NextResponse } from 'next/server';
import { dataManager } from '@/lib/data-manager';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        // 取得資料統計
        const stats = dataManager.getDataStats();
        return NextResponse.json({ success: true, data: stats });

      case 'files':
        // 取得檔案列表
        const files = dataManager.getStockDataFiles();
        return NextResponse.json({ success: true, data: files });

      case 'validate':
        // 驗證資料檔案
        const filename = searchParams.get('file');
        if (!filename) {
          return NextResponse.json({ success: false, error: '請提供檔案名稱' }, { status: 400 });
        }
        const validation = dataManager.validateDataFile(filename);
        return NextResponse.json({ success: true, data: validation });

      default:
        // 預設返回統計資訊
        const defaultStats = dataManager.getDataStats();
        return NextResponse.json({ success: true, data: defaultStats });
    }
  } catch (error) {
    logger.api.error(`Error in data API: ${error}`);
    return NextResponse.json({ success: false, error: '資料管理 API 錯誤' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, filename, keepDays } = body;

    switch (action) {
      case 'backup':
        // 備份檔案
        if (!filename) {
          return NextResponse.json({ success: false, error: '請提供檔案名稱' }, { status: 400 });
        }
        const backupName = dataManager.backupDataFile(filename);
        if (backupName) {
          return NextResponse.json({ success: true, data: { backupName } });
        } else {
          return NextResponse.json({ success: false, error: '備份失敗' }, { status: 500 });
        }

      case 'cleanup':
        // 清理舊檔案
        const days = keepDays || 7;
        dataManager.cleanupOldFiles(days);
        return NextResponse.json({ success: true, message: `已清理 ${days} 天前的舊檔案` });

      default:
        return NextResponse.json({ success: false, error: '不支援的操作' }, { status: 400 });
    }
  } catch (error) {
    logger.api.error(`Error in data API POST: ${error}`);
    return NextResponse.json({ success: false, error: '資料管理 API 錯誤' }, { status: 500 });
  }
}
