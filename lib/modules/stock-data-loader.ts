import fs from 'fs';
import path from 'path';
import { Result } from '@/lib/core/result';
import { StockData } from '@/lib/interfaces/stock-repository';

export interface DataLoaderConfig {
  dataDir: string;
  primaryFilePattern: string;
  fallbackFiles: string[];
}

export class StockDataLoader {
  private config: DataLoaderConfig;

  constructor(config: DataLoaderConfig) {
    this.config = config;
  }

  /**
   * 載入股票資料
   */
  async loadStockData(): Promise<Result<StockData[]>> {
    try {
      // 嘗試載入主要資料檔案
      const primaryResult = await this.loadPrimaryData();
      if (primaryResult.isOk()) {
        return primaryResult;
      }

      // 嘗試載入備用資料檔案
      const fallbackResult = await this.loadFallbackData();
      if (fallbackResult.isOk()) {
        return fallbackResult;
      }

      return Result.fail(new Error('無法載入任何股票資料檔案'));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * 載入主要資料檔案
   */
  private async loadPrimaryData(): Promise<Result<StockData[]>> {
    try {
      const files = fs.readdirSync(this.config.dataDir);
      const stockDataFiles = files
        .filter(file => file.startsWith(this.config.primaryFilePattern) && file.endsWith('.jsonl'))
        .sort()
        .reverse();

      if (stockDataFiles.length === 0) {
        return Result.fail(new Error('找不到主要資料檔案'));
      }

      const mainFile = path.join(this.config.dataDir, stockDataFiles[0]);
      const content = fs.readFileSync(mainFile, 'utf-8');
      const lines = content.trim().split('\n');

      const stocks = lines
        .map(line => {
          try {
            return JSON.parse(line) as StockData;
          } catch (e) {
            console.warn('解析股票資料失敗:', line);
            return null;
          }
        })
        .filter(Boolean) as StockData[];

      console.log(`✅ 已載入 ${stocks.length} 支股票資料 (檔案: ${stockDataFiles[0]})`);
      return Result.ok(stocks);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * 載入備用資料檔案
   */
  private async loadFallbackData(): Promise<Result<StockData[]>> {
    for (const fileName of this.config.fallbackFiles) {
      try {
        const filePath = path.join(this.config.dataDir, fileName);
        if (!fs.existsSync(filePath)) {
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n');

        const stocks = lines
          .map(line => {
            try {
              const data = JSON.parse(line);
              return this.normalizeStockData(data, fileName);
            } catch (e) {
              console.warn(`解析備用資料失敗 (${fileName}):`, line);
              return null;
            }
          })
          .filter(Boolean) as StockData[];

        console.log(`✅ 已載入備用資料 ${stocks.length} 支股票 (檔案: ${fileName})`);
        return Result.ok(stocks);
      } catch (error) {
        console.warn(`載入備用檔案失敗 (${fileName}):`, error);
        continue;
      }
    }

    return Result.fail(new Error('所有備用資料檔案都無法載入'));
  }

  /**
   * 標準化股票資料格式
   */
  private normalizeStockData(data: any, fileName: string): StockData {
    const isTwData = fileName.includes('tw_');
    const isUsData = fileName.includes('us_');

    return {
      代號: data.代號 || data.symbol || '',
      名稱: data.名稱 || data.name || '',
      市場: data.市場 || (isTwData ? '上市' : 'NASDAQ'),
      交易所: data.交易所 || (isTwData ? 'TW' : 'US'),
      yahoo_symbol: data.yahoo_symbol || (isTwData ? `${data.代號 || data.symbol}.TW` : data.代號 || data.symbol),
      ISIN: data.ISIN,
      上市日期: data.上市日期,
      產業: data.產業,
      ETF: data.ETF || false,
      CIK: data.CIK
    };
  }
}
