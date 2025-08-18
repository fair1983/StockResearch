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
   * 儲存股票資料到快取
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

      const cachedData: CachedStockData = {
        market,
        symbol,
        interval,
        lastUpdated: new Date().toISOString(),
        data,
        from,
        to
      };

      fs.writeFileSync(filePath, JSON.stringify(cachedData, null, 2));
      logger.api.response(`Data cached: ${fileName} (${data.length} records)`);

      // 更新快取統計
      await this.updateCacheMetadata();
    } catch (error) {
      logger.api.error(`Error saving cache for ${market}/${symbol}: ${error}`);
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

      // 刪除最舊的 20% 檔案
      const filesToDelete = Math.ceil(files.length * 0.2);
      for (let i = 0; i < filesToDelete; i++) {
        fs.unlinkSync(files[i].filePath);
        logger.api.response(`Removed old cache: ${files[i].file}`);
      }
    } catch (error) {
      logger.api.error(`Error cleaning oldest cache: ${error}`);
    }
  }

  /**
   * 更新快取統計資訊
   */
  private async updateCacheMetadata(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir).filter(file => file !== 'metadata.json');
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }

      const metadata: CacheMetadata = {
        version: '1.0.0',
        lastCleanup: new Date().toISOString(),
        totalCached: files.length,
        cacheSize: totalSize
      };

      fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      logger.api.error(`Error updating cache metadata: ${error}`);
    }
  }

  /**
   * 獲取快取統計資訊
   */
  async getCacheStats(): Promise<CacheMetadata | null> {
    try {
      if (!fs.existsSync(this.metadataPath)) {
        return null;
      }

      const data = fs.readFileSync(this.metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.api.error(`Error reading cache stats: ${error}`);
      return null;
    }
  }

  /**
   * 清除特定股票的快取
   */
  async clearStockCache(market: string, symbol: string): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      let clearedCount = 0;

      for (const file of files) {
        if (file.startsWith(`${market}_${symbol}_`)) {
          const filePath = path.join(this.cacheDir, file);
          fs.unlinkSync(filePath);
          clearedCount++;
        }
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
      const files = fs.readdirSync(this.cacheDir);
      let clearedCount = 0;

      for (const file of files) {
        if (file !== 'metadata.json') {
          const filePath = path.join(this.cacheDir, file);
          fs.unlinkSync(filePath);
          clearedCount++;
        }
      }

      logger.api.response(`Cleared all cache: ${clearedCount} files`);
      await this.updateCacheMetadata();
    } catch (error) {
      logger.api.error(`Error clearing all cache: ${error}`);
    }
  }
}
