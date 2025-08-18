import fs from 'fs';
import path from 'path';
import { Candle } from '@/types';
import { logger } from './logger';

export interface CachedStockData {
  market: string;
  symbol: string;
  interval: string;
  lastUpdated: string;
  data: Candle[];
  from?: string;
  to?: string;
}

export interface CacheMetadata {
  version: string;
  lastCleanup: string;
  totalCached: number;
  cacheSize: number;
}

export class StockCache {
  private cacheDir: string;
  private metadataPath: string;
  private readonly CACHE_EXPIRY_HOURS = 24; // 快取過期時間（小時）
  private readonly MAX_CACHE_SIZE_MB = 100; // 最大快取大小（MB）

  constructor() {
    this.cacheDir = path.join(process.cwd(), 'data', 'cache');
    this.metadataPath = path.join(this.cacheDir, 'metadata.json');
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 生成快取檔案名稱
   * 格式：{market}/{symbol}/{interval}.json
   * 例如：TW/2330/1d.json, US/AAPL/1w.json
   */
  private getCacheFileName(market: string, symbol: string, interval: string, from?: string, to?: string): string {
    const dateRange = from && to ? `_${from}_${to}` : '';
    return `${market}/${symbol}/${interval}${dateRange}.json`;
  }

  /**
   * 檢查快取是否有效
   */
  private isCacheValid(lastUpdated: string): boolean {
    const cacheTime = new Date(lastUpdated);
    const now = new Date();
    const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
    return hoursDiff < this.CACHE_EXPIRY_HOURS;
  }

  /**
   * 從快取讀取股票資料
   */
  async getCachedData(market: string, symbol: string, interval: string, from?: string, to?: string): Promise<Candle[] | null> {
    try {
      const fileName = this.getCacheFileName(market, symbol, interval, from, to);
      const filePath = path.join(this.cacheDir, fileName);

      if (!fs.existsSync(filePath)) {
        logger.api.request(`Cache miss: ${fileName}`);
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      const cachedData: CachedStockData = JSON.parse(data);

      // 檢查快取是否過期
      if (!this.isCacheValid(cachedData.lastUpdated)) {
        logger.api.request(`Cache expired: ${fileName}`);
        return null;
      }

      logger.api.response(`Cache hit: ${fileName} (${cachedData.data.length} records)`);
      return cachedData.data;
    } catch (error) {
      logger.api.error(`Error reading cache for ${market}/${symbol}: ${error}`);
      return null;
    }
  }

  /**
   * 合併現有快取資料與新資料
   * 新資料會覆蓋相同時間的舊資料
   */
  private mergeCachedData(existingData: Candle[], newData: Candle[]): Candle[] {
    const dataMap = new Map<string, Candle>();
    
    // 先加入現有資料
    existingData.forEach(candle => {
      dataMap.set(candle.time, candle);
    });
    
    // 新資料覆蓋舊資料
    newData.forEach(candle => {
      dataMap.set(candle.time, candle);
    });
    
    // 轉換回陣列並按時間排序
    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  }

  /**
   * 儲存股票資料到快取（支援合併現有資料）
   */
  async setCachedData(market: string, symbol: string, interval: string, data: Candle[], from?: string, to?: string): Promise<void> {
    try {
      const fileName = this.getCacheFileName(market, symbol, interval, from, to);
      const filePath = path.join(this.cacheDir, fileName);
      
      // 確保目錄存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let finalData = data;
      let mergeInfo = '';

      // 嘗試讀取現有快取資料進行合併
      if (fs.existsSync(filePath)) {
        try {
          const existingData = fs.readFileSync(filePath, 'utf-8');
          const cachedData: CachedStockData = JSON.parse(existingData);
          
          if (cachedData.data && cachedData.data.length > 0) {
            const beforeCount = cachedData.data.length;
            finalData = this.mergeCachedData(cachedData.data, data);
            const afterCount = finalData.length;
            const updatedCount = data.length;
            const newCount = afterCount - beforeCount + updatedCount;
            
            mergeInfo = ` (merged: ${beforeCount} → ${afterCount}, updated: ${updatedCount}, new: ${newCount})`;
            logger.api.response(`Cache merge: ${fileName}${mergeInfo}`);
          }
        } catch (error) {
          logger.api.error(`Error merging cache for ${fileName}: ${error}`);
        }
      }

      const cachedData: CachedStockData = {
        market,
        symbol,
        interval,
        lastUpdated: new Date().toISOString(),
        data: finalData,
        from,
        to
      };

      fs.writeFileSync(filePath, JSON.stringify(cachedData, null, 2));
      logger.api.response(`Data cached: ${fileName} (${finalData.length} records)${mergeInfo}`);

      // 更新快取統計
      await this.updateCacheMetadata();
    } catch (error) {
      logger.api.error(`Error saving cache for ${market}/${symbol}: ${error}`);
    }
  }

  /**
   * 更新特定時間範圍的資料（不影響其他時間範圍）
   */
  async updateCachedData(market: string, symbol: string, interval: string, newData: Candle[], from?: string, to?: string): Promise<void> {
    try {
      const fileName = this.getCacheFileName(market, symbol, interval, from, to);
      const filePath = path.join(this.cacheDir, fileName);
      
      let existingData: Candle[] = [];
      
      // 讀取現有資料
      if (fs.existsSync(filePath)) {
        try {
          const data = fs.readFileSync(filePath, 'utf-8');
          const cachedData: CachedStockData = JSON.parse(data);
          existingData = cachedData.data || [];
        } catch (error) {
          logger.api.error(`Error reading existing cache for update: ${error}`);
        }
      }
      
      // 合併資料
      const mergedData = this.mergeCachedData(existingData, newData);
      
      // 儲存合併後的資料
      await this.setCachedData(market, symbol, interval, mergedData, from, to);
      
      logger.api.response(`Cache updated: ${fileName} (${existingData.length} → ${mergedData.length} records)`);
    } catch (error) {
      logger.api.error(`Error updating cache for ${market}/${symbol}: ${error}`);
    }
  }

  /**
   * 清除過期的快取檔案
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      let cleanedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        if (file === 'metadata.json') continue;

        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;

        try {
          const data = fs.readFileSync(filePath, 'utf-8');
          const cachedData: CachedStockData = JSON.parse(data);

          if (!this.isCacheValid(cachedData.lastUpdated)) {
            fs.unlinkSync(filePath);
            cleanedCount++;
            logger.api.response(`Cleaned expired cache: ${file}`);
          }
        } catch (error) {
          // 如果檔案損壞，刪除它
          fs.unlinkSync(filePath);
          cleanedCount++;
          logger.api.error(`Removed corrupted cache: ${file}`);
        }
      }

      // 檢查快取大小限制
      const cacheSizeMB = totalSize / (1024 * 1024);
      if (cacheSizeMB > this.MAX_CACHE_SIZE_MB) {
        await this.cleanupOldestCache();
      }

      logger.api.response(`Cache cleanup completed: ${cleanedCount} files removed`);
      await this.updateCacheMetadata();
    } catch (error) {
      logger.api.error(`Error during cache cleanup: ${error}`);
    }
  }

  /**
   * 清除最舊的快取檔案（當快取大小超過限制時）
   */
  private async cleanupOldestCache(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir)
        .filter(file => file !== 'metadata.json')
        .map(file => {
          const filePath = path.join(this.cacheDir, file);
          const stats = fs.statSync(filePath);
          return { file, filePath, mtime: stats.mtime };
        })
        .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // 刪除最舊的檔案直到快取大小符合限制
      let deletedSize = 0;
      const targetSize = this.MAX_CACHE_SIZE_MB * 0.8; // 目標大小為限制的80%

      for (const { file, filePath } of files) {
        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        fs.unlinkSync(filePath);
        deletedSize += fileSizeMB;
        
        logger.api.response(`Removed old cache: ${file} (${fileSizeMB.toFixed(2)}MB)`);
        
        if (deletedSize >= targetSize) {
          break;
        }
      }

      logger.api.response(`Cache size reduced by ${deletedSize.toFixed(2)}MB`);
    } catch (error) {
      logger.api.error(`Error cleaning oldest cache: ${error}`);
    }
  }

  /**
   * 更新快取統計資訊
   */
  private async updateCacheMetadata(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir)
        .filter(file => file !== 'metadata.json');
      
      let totalSize = 0;
      let totalCached = 0;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        totalCached++;
      }

      const metadata: CacheMetadata = {
        version: '1.0',
        lastCleanup: new Date().toISOString(),
        totalCached,
        cacheSize: totalSize
      };

      fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      logger.api.error(`Error updating cache metadata: ${error}`);
    }
  }

  /**
   * 取得快取統計資訊
   */
  async getCacheMetadata(): Promise<CacheMetadata | null> {
    try {
      if (!fs.existsSync(this.metadataPath)) {
        return null;
      }

      const data = fs.readFileSync(this.metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.api.error(`Error reading cache metadata: ${error}`);
      return null;
    }
  }

  /**
   * 清除特定股票的快取
   */
  async clearStockCache(market: string, symbol: string, interval?: string): Promise<void> {
    try {
      const stockDir = path.join(this.cacheDir, market, symbol);
      
      if (!fs.existsSync(stockDir)) {
        return;
      }

      const files = fs.readdirSync(stockDir);
      let clearedCount = 0;

      for (const file of files) {
        if (interval && !file.startsWith(interval)) {
          continue;
        }

        const filePath = path.join(stockDir, file);
        fs.unlinkSync(filePath);
        clearedCount++;
      }

      // 如果目錄為空，刪除目錄
      if (fs.readdirSync(stockDir).length === 0) {
        fs.rmdirSync(stockDir);
      }

      logger.api.response(`Cleared cache for ${market}/${symbol}: ${clearedCount} files`);
      await this.updateCacheMetadata();
    } catch (error) {
      logger.api.error(`Error clearing cache for ${market}/${symbol}: ${error}`);
    }
  }

  /**
   * 清除所有快取
   */
  async clearAllCache(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir)
        .filter(file => file !== 'metadata.json');

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }

      logger.api.response(`Cleared all cache: ${files.length} items`);
      await this.updateCacheMetadata();
    } catch (error) {
      logger.api.error(`Error clearing all cache: ${error}`);
    }
  }
}
