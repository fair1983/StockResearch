import fs from 'fs';
import path from 'path';
import { StockData } from './stock-database';

export class DataManager {
  private dataDir: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
  }

  /**
   * 取得所有可用的股票資料檔案
   */
  getStockDataFiles(): Array<{ name: string; size: number; date: string }> {
    try {
      const files = fs.readdirSync(this.dataDir);
      const stockFiles = files
        .filter(file => file.endsWith('.jsonl'))
        .map(file => {
          const filePath = path.join(this.dataDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            date: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return stockFiles;
    } catch (error) {
      console.error('取得資料檔案列表失敗:', error);
      return [];
    }
  }

  /**
   * 取得最新的股票資料檔案
   */
  getLatestStockDataFile(): string | null {
    const files = this.getStockDataFiles();
    const stockDataFile = files.find(file => file.name.startsWith('stocks_data_'));
    return stockDataFile ? stockDataFile.name : null;
  }

  /**
   * 載入股票資料檔案
   */
  loadStockDataFile(filename: string): StockData[] {
    try {
      const filePath = path.join(this.dataDir, filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`檔案不存在: ${filename}`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      const stocks = lines.map(line => {
        try {
          return JSON.parse(line) as StockData;
        } catch (e) {
          console.warn('解析股票資料失敗:', line);
          return null;
        }
      }).filter(Boolean) as StockData[];

      console.log(`✅ 已載入 ${stocks.length} 支股票資料 (檔案: ${filename})`);
      return stocks;
    } catch (error) {
      console.error(`載入股票資料檔案失敗: ${filename}`, error);
      return [];
    }
  }

  /**
   * 取得資料統計
   */
  getDataStats(): Record<string, any> {
    const files = this.getStockDataFiles();
    const stats: Record<string, any> = {
      totalFiles: files.length,
      files: files,
      latestFile: this.getLatestStockDataFile()
    };

    // 載入最新檔案進行統計
    const latestFile = this.getLatestStockDataFile();
    if (latestFile) {
      const stocks = this.loadStockDataFile(latestFile);
      
      // 按市場統計
      const marketStats: Record<string, number> = {};
      stocks.forEach(stock => {
        marketStats[stock.市場] = (marketStats[stock.市場] || 0) + 1;
      });
      
      stats.totalStocks = stocks.length;
      stats.marketStats = marketStats;
    }

    return stats;
  }

  /**
   * 清理舊的資料檔案
   */
  cleanupOldFiles(keepDays: number = 7): void {
    try {
      const files = this.getStockDataFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      let cleanedCount = 0;
      files.forEach(file => {
        const fileDate = new Date(file.date);
        if (fileDate < cutoffDate) {
          const filePath = path.join(this.dataDir, file.name);
          fs.unlinkSync(filePath);
          console.log(`🗑️ 已刪除舊檔案: ${file.name}`);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`✅ 已清理 ${cleanedCount} 個舊檔案`);
      } else {
        console.log('✅ 沒有需要清理的舊檔案');
      }
    } catch (error) {
      console.error('清理舊檔案失敗:', error);
    }
  }

  /**
   * 備份資料檔案
   */
  backupDataFile(filename: string): string | null {
    try {
      const sourcePath = path.join(this.dataDir, filename);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`檔案不存在: ${filename}`);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${filename.replace('.jsonl', '')}_backup_${timestamp}.jsonl`;
      const backupPath = path.join(this.dataDir, backupName);

      fs.copyFileSync(sourcePath, backupPath);
      console.log(`✅ 已備份檔案: ${backupName}`);
      
      return backupName;
    } catch (error) {
      console.error('備份檔案失敗:', error);
      return null;
    }
  }

  /**
   * 驗證資料檔案完整性
   */
  validateDataFile(filename: string): { valid: boolean; errors: string[]; stats: any } {
    try {
      const stocks = this.loadStockDataFile(filename);
      const errors: string[] = [];
      const stats = {
        total: stocks.length,
        valid: 0,
        invalid: 0,
        missingFields: {
          代號: 0,
          名稱: 0,
          市場: 0,
          yahoo_symbol: 0
        }
      };

      stocks.forEach((stock, index) => {
        let isValid = true;

        if (!stock.代號) {
          errors.push(`第 ${index + 1} 行: 缺少代號`);
          stats.missingFields.代號++;
          isValid = false;
        }

        if (!stock.名稱) {
          errors.push(`第 ${index + 1} 行: 缺少名稱`);
          stats.missingFields.名稱++;
          isValid = false;
        }

        if (!stock.市場) {
          errors.push(`第 ${index + 1} 行: 缺少市場`);
          stats.missingFields.市場++;
          isValid = false;
        }

        if (!stock.yahoo_symbol) {
          errors.push(`第 ${index + 1} 行: 缺少 yahoo_symbol`);
          stats.missingFields.yahoo_symbol++;
          isValid = false;
        }

        if (isValid) {
          stats.valid++;
        } else {
          stats.invalid++;
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        stats
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`檔案讀取失敗: ${error}`],
        stats: { total: 0, valid: 0, invalid: 0, missingFields: {} }
      };
    }
  }
}

// 建立全域實例
export const dataManager = new DataManager();
