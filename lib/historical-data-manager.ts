import fs from 'fs';
import path from 'path';
import { YahooFinanceService } from './yahoo-finance';
import { StockCache } from './stock-cache';
import { Candle } from '@/types';
import { logger } from './logger';

export interface HistoricalDataConfig {
  market: string;
  symbol: string;
  intervals: string[]; // ['1d', '1w', '1mo']
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  forceUpdate?: boolean; // 強制更新現有資料
}

export interface DataCollectionResult {
  market: string;
  symbol: string;
  interval: string;
  success: boolean;
  recordsCount: number;
  dateRange: string;
  error?: string;
}

export interface BatchCollectionResult {
  total: number;
  successful: number;
  failed: number;
  results: DataCollectionResult[];
  duration: number;
}

export class HistoricalDataManager {
  private yahooService: YahooFinanceService;
  private cache: StockCache;
  private dataDir: string;

  constructor() {
    this.yahooService = new YahooFinanceService();
    this.cache = new StockCache();
    this.dataDir = path.join(process.cwd(), 'data', 'historical');
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 取得股票代碼的完整歷史資料
   */
  async collectHistoricalData(config: HistoricalDataConfig): Promise<DataCollectionResult[]> {
    const results: DataCollectionResult[] = [];
    const startTime = Date.now();

    logger.api.request(`Starting historical data collection for ${config.market}/${config.symbol}`, config);

    for (const interval of config.intervals) {
      try {
        const result = await this.collectIntervalData(config.market, config.symbol, interval, config);
        results.push(result);
        
        // 避免過於頻繁的請求
        await this.delay(1000);
      } catch (error) {
        logger.api.error(`Failed to collect ${interval} data for ${config.market}/${config.symbol}`, error);
        results.push({
          market: config.market,
          symbol: config.symbol,
          interval,
          success: false,
          recordsCount: 0,
          dateRange: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.api.response(`Historical data collection completed for ${config.market}/${config.symbol} in ${duration}ms`);

    return results;
  }

  /**
   * 收集特定時間週期的資料
   */
  private async collectIntervalData(market: string, symbol: string, interval: string, config: HistoricalDataConfig): Promise<DataCollectionResult> {
    try {
      logger.api.request(`Collecting ${interval} data for ${market}/${symbol}`);

      // 檢查是否已有資料且不需要強制更新
      if (!config.forceUpdate) {
        const existingData = await this.getExistingData(market, symbol, interval);
        if (existingData && existingData.length > 0) {
          logger.api.response(`Using existing ${interval} data for ${market}/${symbol} (${existingData.length} records)`);
          return {
            market,
            symbol,
            interval,
            success: true,
            recordsCount: existingData.length,
            dateRange: this.getDateRange(existingData)
          };
        }
      }

      // 抓取新資料
      const startDate = config.startDate ? new Date(config.startDate) : undefined;
      const endDate = config.endDate ? new Date(config.endDate) : undefined;
      
      const data = await this.yahooService.getKlineData(
        symbol,
        market,
        interval,
        startDate,
        endDate
      );

      // 儲存到歷史資料目錄
      await this.saveHistoricalData(market, symbol, interval, data);

      logger.api.response(`Collected ${interval} data for ${market}/${symbol}: ${data.length} records`);

      return {
        market,
        symbol,
        interval,
        success: true,
        recordsCount: data.length,
        dateRange: this.getDateRange(data)
      };

    } catch (error) {
      logger.api.error(`Error collecting ${interval} data for ${market}/${symbol}`, error);
      throw error;
    }
  }

  /**
   * 批次收集多個股票的歷史資料
   */
  async batchCollectHistoricalData(configs: HistoricalDataConfig[]): Promise<BatchCollectionResult> {
    const startTime = Date.now();
    const results: DataCollectionResult[] = [];
    let successful = 0;
    let failed = 0;

    logger.api.request(`Starting batch historical data collection for ${configs.length} symbols`);

    for (const config of configs) {
      try {
        const symbolResults = await this.collectHistoricalData(config);
        results.push(...symbolResults);
        
        // 計算成功/失敗數量
        const symbolSuccess = symbolResults.filter(r => r.success).length;
        const symbolFailed = symbolResults.filter(r => !r.success).length;
        successful += symbolSuccess;
        failed += symbolFailed;

        // 避免過於頻繁的請求
        await this.delay(2000);
      } catch (error) {
        logger.api.error(`Failed to collect data for ${config.market}/${config.symbol}`, error);
        failed += config.intervals.length;
      }
    }

    const duration = Date.now() - startTime;
    const result: BatchCollectionResult = {
      total: configs.length * configs[0]?.intervals.length || 0,
      successful,
      failed,
      results,
      duration
    };

    logger.api.response(`Batch collection completed: ${successful} successful, ${failed} failed in ${duration}ms`);

    return result;
  }

  /**
   * 儲存歷史資料到檔案
   */
  private async saveHistoricalData(market: string, symbol: string, interval: string, data: Candle[]): Promise<void> {
    try {
      const symbolDir = path.join(this.dataDir, market, symbol);
      if (!fs.existsSync(symbolDir)) {
        fs.mkdirSync(symbolDir, { recursive: true });
      }

      const filePath = path.join(symbolDir, `${interval}.json`);
      const historicalData = {
        market,
        symbol,
        interval,
        lastUpdated: new Date().toISOString(),
        totalRecords: data.length,
        data
      };

      fs.writeFileSync(filePath, JSON.stringify(historicalData, null, 2));
      logger.api.response(`Historical data saved: ${filePath} (${data.length} records)`);
    } catch (error) {
      logger.api.error(`Error saving historical data for ${market}/${symbol}/${interval}`, error);
      throw error;
    }
  }

  /**
   * 讀取現有的歷史資料
   */
  private async getExistingData(market: string, symbol: string, interval: string): Promise<Candle[] | null> {
    try {
      const filePath = path.join(this.dataDir, market, symbol, `${interval}.json`);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      const historicalData = JSON.parse(data);
      
      return historicalData.data || null;
    } catch (error) {
      logger.api.error(`Error reading existing data for ${market}/${symbol}/${interval}`, error);
      return null;
    }
  }

  /**
   * 取得資料的日期範圍
   */
  private getDateRange(data: Candle[]): string {
    if (data.length === 0) return '';
    
    const firstDate = data[0].time;
    const lastDate = data[data.length - 1].time;
    return `${firstDate} to ${lastDate}`;
  }

  /**
   * 取得所有已儲存的股票列表
   */
  async getStoredSymbols(): Promise<{ market: string; symbol: string; intervals: string[] }[]> {
    const symbols: { market: string; symbol: string; intervals: string[] }[] = [];

    try {
      const markets = fs.readdirSync(this.dataDir);
      
      for (const market of markets) {
        const marketDir = path.join(this.dataDir, market);
        if (!fs.statSync(marketDir).isDirectory()) continue;

        const symbolDirs = fs.readdirSync(marketDir);
        
        for (const symbol of symbolDirs) {
          const symbolDir = path.join(marketDir, symbol);
          if (!fs.statSync(symbolDir).isDirectory()) continue;

          const files = fs.readdirSync(symbolDir)
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));

          if (files.length > 0) {
            symbols.push({
              market,
              symbol,
              intervals: files
            });
          }
        }
      }
    } catch (error) {
      logger.api.error('Error getting stored symbols', error);
    }

    return symbols;
  }

  /**
   * 取得特定股票的歷史資料統計
   */
  async getSymbolStats(market: string, symbol: string): Promise<{ interval: string; records: number; dateRange: string }[]> {
    const stats: { interval: string; records: number; dateRange: string }[] = [];

    try {
      const symbolDir = path.join(this.dataDir, market, symbol);
      if (!fs.existsSync(symbolDir)) {
        return stats;
      }

      const files = fs.readdirSync(symbolDir)
        .filter(file => file.endsWith('.json'));

      for (const file of files) {
        const interval = file.replace('.json', '');
        const filePath = path.join(symbolDir, file);
        
        try {
          const data = fs.readFileSync(filePath, 'utf-8');
          const historicalData = JSON.parse(data);
          
          stats.push({
            interval,
            records: historicalData.totalRecords || 0,
            dateRange: this.getDateRange(historicalData.data || [])
          });
        } catch (error) {
          logger.api.error(`Error reading stats for ${market}/${symbol}/${interval}`, error);
        }
      }
    } catch (error) {
      logger.api.error(`Error getting stats for ${market}/${symbol}`, error);
    }

    return stats;
  }

  /**
   * 清除特定股票的歷史資料
   */
  async clearSymbolData(market: string, symbol: string): Promise<void> {
    try {
      const symbolDir = path.join(this.dataDir, market, symbol);
      if (fs.existsSync(symbolDir)) {
        fs.rmSync(symbolDir, { recursive: true, force: true });
        logger.api.response(`Cleared historical data for ${market}/${symbol}`);
      }
    } catch (error) {
      logger.api.error(`Error clearing data for ${market}/${symbol}`, error);
      throw error;
    }
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
