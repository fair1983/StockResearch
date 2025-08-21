import fs from 'fs';
import path from 'path';
import { Candle } from '@/types';
import { calculateAllIndicators } from './technical-indicators';
import { logger } from './logger';

export interface TechnicalIndicatorsData {
  market: string;
  symbol: string;
  interval: string;
  lastUpdated: string;
  dataHash: string; // 用於檢查資料是否變更
  indicators: {
    ma5: number[];
    ma10: number[];
    ma20: number[];
    ema12: number[];
    ema26: number[];
    macd: {
      macd: number[];
      signal: number[];
      histogram: number[];
    };
    rsi: number[];
    bollinger: {
      upper: number[];
      middle: number[];
      lower: number[];
    };
    kdj: {
      k: number[];
      d: number[];
      j: number[];
    };
    stochastic: {
      k: number[];
      d: number[];
    };
    cci: number[];
    atr: number[];
    adx: number[];
    obv: number[];
    volume: number[];
  };
}

export class TechnicalIndicatorsCache {
  private cacheDir: string;
  private readonly CACHE_EXPIRY_HOURS = 24; // 快取過期時間（小時）

  constructor() {
    this.cacheDir = path.join(process.cwd(), 'data', 'indicators');
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 計算資料的雜湊值，用於檢查資料是否變更
   */
  private calculateDataHash(data: Candle[]): string {
    if (data.length === 0) return '';
    
    // 使用最後幾筆資料的關鍵資訊來生成雜湊
    const lastData = data.slice(-10); // 取最後10筆
    const hashData = lastData.map(candle => 
      `${candle.time}-${candle.close}-${candle.volume}`
    ).join('|');
    
    // 簡單的雜湊函數
    let hash = 0;
    for (let i = 0; i < hashData.length; i++) {
      const char = hashData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉換為32位整數
    }
    return hash.toString(16);
  }

  /**
   * 檢查快取是否有效
   */
  private isCacheValid(lastUpdated: string): boolean {
    const cacheTime = new Date(lastUpdated).getTime();
    const currentTime = Date.now();
    const hoursDiff = (currentTime - cacheTime) / (1000 * 60 * 60);
    return hoursDiff < this.CACHE_EXPIRY_HOURS;
  }

  /**
   * 取得快取檔案路徑
   */
  private getCacheFilePath(market: string, symbol: string, interval: string): string {
    const symbolDir = path.join(this.cacheDir, market, symbol);
    if (!fs.existsSync(symbolDir)) {
      fs.mkdirSync(symbolDir, { recursive: true });
    }
    return path.join(symbolDir, `${interval}_indicators.json`);
  }

  /**
   * 從快取讀取技術指標資料
   */
  async getCachedIndicators(market: string, symbol: string, interval: string, data: Candle[]): Promise<any | null> {
    try {
      const filePath = this.getCacheFilePath(market, symbol, interval);
      
      if (!fs.existsSync(filePath)) {
        logger.api.request(`Indicators cache miss: ${market}/${symbol}/${interval}`);
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const cachedData: TechnicalIndicatorsData = JSON.parse(fileContent);

      // 檢查快取是否過期
      if (!this.isCacheValid(cachedData.lastUpdated)) {
        logger.api.request(`Indicators cache expired: ${market}/${symbol}/${interval}`);
        return null;
      }

      // 檢查資料是否變更
      const currentDataHash = this.calculateDataHash(data);
      if (cachedData.dataHash !== currentDataHash) {
        logger.api.request(`Indicators data changed: ${market}/${symbol}/${interval}`);
        return null;
      }

      logger.api.response(`Indicators cache hit: ${market}/${symbol}/${interval}`);
      return cachedData.indicators;
    } catch (error) {
      logger.api.error(`Error reading indicators cache for ${market}/${symbol}/${interval}`, error);
      return null;
    }
  }

  /**
   * 儲存技術指標資料到快取
   */
  async saveIndicators(market: string, symbol: string, interval: string, data: Candle[], indicators: any): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(market, symbol, interval);
      const dataHash = this.calculateDataHash(data);
      
      const cacheData: TechnicalIndicatorsData = {
        market,
        symbol,
        interval,
        lastUpdated: new Date().toISOString(),
        dataHash,
        indicators
      };

      fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2));
      logger.api.response(`Indicators saved to cache: ${filePath}`);
    } catch (error) {
      logger.api.error(`Error saving indicators cache for ${market}/${symbol}/${interval}`, error);
      throw error;
    }
  }

  /**
   * 計算並快取技術指標
   */
  async calculateAndCacheIndicators(market: string, symbol: string, interval: string, data: Candle[]): Promise<any> {
    try {
      // 先嘗試從快取讀取
      const cachedIndicators = await this.getCachedIndicators(market, symbol, interval, data);
      if (cachedIndicators) {
        return cachedIndicators;
      }

      // 快取未命中，重新計算
      logger.api.request(`Calculating indicators for ${market}/${symbol}/${interval}`);
      const startTime = Date.now();
      
      const indicators = calculateAllIndicators(data, market);
      
      const duration = Date.now() - startTime;
      logger.api.response(`Indicators calculated in ${duration}ms for ${market}/${symbol}/${interval}`);

      // 儲存到快取
      await this.saveIndicators(market, symbol, interval, data, indicators);
      
      return indicators;
    } catch (error) {
      logger.api.error(`Error calculating indicators for ${market}/${symbol}/${interval}`, error);
      throw error;
    }
  }

  /**
   * 清除特定股票的技術指標快取
   */
  async clearIndicatorsCache(market: string, symbol: string, interval?: string): Promise<void> {
    try {
      const symbolDir = path.join(this.cacheDir, market, symbol);
      
      if (!fs.existsSync(symbolDir)) {
        return;
      }

      if (interval) {
        // 清除特定時間週期的快取
        const filePath = path.join(symbolDir, `${interval}_indicators.json`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.api.response(`Cleared indicators cache: ${market}/${symbol}/${interval}`);
        }
      } else {
        // 清除該股票的所有快取
        const files = fs.readdirSync(symbolDir);
        files.forEach(file => {
          if (file.endsWith('_indicators.json')) {
            fs.unlinkSync(path.join(symbolDir, file));
          }
        });
        logger.api.response(`Cleared all indicators cache for ${market}/${symbol}`);
      }
    } catch (error) {
      logger.api.error(`Error clearing indicators cache for ${market}/${symbol}`, error);
      throw error;
    }
  }

  /**
   * 取得快取統計資訊
   */
  async getCacheStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    markets: { [key: string]: number };
  }> {
    try {
      let totalFiles = 0;
      let totalSize = 0;
      const markets: { [key: string]: number } = {};

      const marketDirs = fs.readdirSync(this.cacheDir);
      
      for (const market of marketDirs) {
        const marketDir = path.join(this.cacheDir, market);
        if (!fs.statSync(marketDir).isDirectory()) continue;

        let marketFiles = 0;
        const symbolDirs = fs.readdirSync(marketDir);
        
        for (const symbol of symbolDirs) {
          const symbolDir = path.join(marketDir, symbol);
          if (!fs.statSync(symbolDir).isDirectory()) continue;

          const files = fs.readdirSync(symbolDir).filter(file => file.endsWith('_indicators.json'));
          marketFiles += files.length;
          
          files.forEach(file => {
            const filePath = path.join(symbolDir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
          });
        }
        
        markets[market] = marketFiles;
        totalFiles += marketFiles;
      }

      return {
        totalFiles,
        totalSize,
        markets
      };
    } catch (error) {
      logger.api.error('Error getting indicators cache stats', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        markets: {}
      };
    }
  }
}
