import { StockRepository } from '@/lib/interfaces/stock-repository';
import { StockRepositoryImpl } from '@/lib/modules/stock-repository-impl';
import { StockDataLoader } from '@/lib/modules/stock-data-loader';
import { StockCategoryAnalyzer } from '@/lib/modules/stock-category-analyzer';
import { StockConfigManager } from '@/lib/config/stock-config';

/**
 * 股票資料庫工廠類別
 */
export class StockDatabaseFactory {
  static createStockRepository(): StockRepository {
    const config = StockConfigManager.getInstance().getConfig();
    
    const dataLoader = new StockDataLoader({
      dataDir: config.dataDir,
      primaryFilePattern: config.primaryFilePattern,
      fallbackFiles: config.fallbackFiles
    });
    
    const categoryAnalyzer = new StockCategoryAnalyzer();
    
    return new StockRepositoryImpl(dataLoader, categoryAnalyzer);
  }
}

// 建立全域實例
export const stockDB = StockDatabaseFactory.createStockRepository();
