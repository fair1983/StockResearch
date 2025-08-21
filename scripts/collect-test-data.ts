#!/usr/bin/env ts-node

import { YahooFinanceService } from '../lib/yahoo-finance';
import { HistoricalDataManager } from '../lib/historical-data-manager';
import { TechnicalIndicatorsCache } from '../lib/technical-indicators-cache';
import { logger } from '../lib/logger';
import fs from 'fs';
import path from 'path';

interface TestDataResult {
  symbol: string;
  market: string;
  data: any[];
  indicators: any;
  success: boolean;
  error?: string;
}

class TestDataCollector {
  private yahooService: YahooFinanceService;
  private historicalManager: HistoricalDataManager;
  private indicatorsCache: TechnicalIndicatorsCache;

  constructor() {
    this.yahooService = new YahooFinanceService();
    this.historicalManager = new HistoricalDataManager();
    this.indicatorsCache = new TechnicalIndicatorsCache();
  }

  /**
   * 收集測試資料
   */
  async collectTestData(): Promise<TestDataResult[]> {
    const testStocks = [
      { symbol: '2330', market: 'TW', name: '台積電' },
      { symbol: 'TSLA', market: 'US', name: '特斯拉' }
    ];

    const results: TestDataResult[] = [];

    console.log('🚀 開始收集測試資料...');
    console.log('='.repeat(50));

    for (const stock of testStocks) {
      console.log(`📊 收集 ${stock.name} (${stock.symbol}.${stock.market}) 資料...`);
      
      try {
        // 1. 收集歷史資料
        const data = await this.collectHistoricalData(stock.symbol, stock.market);
        
        // 2. 計算技術指標
        const indicators = await this.calculateIndicators(stock.symbol, stock.market, data);
        
        // 3. 儲存結果
        const result: TestDataResult = {
          symbol: stock.symbol,
          market: stock.market,
          data,
          indicators,
          success: true
        };
        
        results.push(result);
        
        console.log(`✅ ${stock.name} 資料收集完成 (${data.length} 筆)`);
        
      } catch (error) {
        console.error(`❌ ${stock.name} 資料收集失敗:`, error);
        
        results.push({
          symbol: stock.symbol,
          market: stock.market,
          data: [],
          indicators: {},
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 4. 儲存測試資料到檔案
    await this.saveTestData(results);

    return results;
  }

  /**
   * 收集歷史資料
   */
  private async collectHistoricalData(symbol: string, market: string): Promise<any[]> {
    try {
      // 收集最近 3 個月的日K資料
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const data = await this.yahooService.getKlineData(
        symbol,
        market,
        '1d',
        startDate,
        endDate
      );

      return data;
    } catch (error) {
      logger.api.error(`收集歷史資料失敗: ${symbol}.${market}`, error);
      throw error;
    }
  }

  /**
   * 計算技術指標
   */
  private async calculateIndicators(symbol: string, market: string, data: any[]): Promise<any> {
    try {
      const indicators = await this.indicatorsCache.calculateAndCacheIndicators(
        market,
        symbol,
        '1d',
        data
      );

      return indicators;
    } catch (error) {
      logger.api.error(`計算技術指標失敗: ${symbol}.${market}`, error);
      throw error;
    }
  }

  /**
   * 儲存測試資料
   */
  private async saveTestData(results: TestDataResult[]): Promise<void> {
    const testDataDir = path.join(process.cwd(), 'test-data');
    
    // 確保目錄存在
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // 儲存完整測試資料
    const testDataPath = path.join(testDataDir, 'test-stocks-data.json');
    fs.writeFileSync(testDataPath, JSON.stringify(results, null, 2));

    // 儲存個別股票資料
    for (const result of results) {
      if (result.success) {
        const stockDir = path.join(testDataDir, result.market);
        if (!fs.existsSync(stockDir)) {
          fs.mkdirSync(stockDir, { recursive: true });
        }

        // 儲存原始資料
        const dataPath = path.join(stockDir, `${result.symbol}_data.json`);
        fs.writeFileSync(dataPath, JSON.stringify(result.data, null, 2));

        // 儲存技術指標
        const indicatorsPath = path.join(stockDir, `${result.symbol}_indicators.json`);
        fs.writeFileSync(indicatorsPath, JSON.stringify(result.indicators, null, 2));
      }
    }

    console.log(`💾 測試資料已儲存到: ${testDataDir}`);
  }

  /**
   * 顯示收集結果摘要
   */
  displaySummary(results: TestDataResult[]): void {
    console.log('\n📈 收集結果摘要');
    console.log('='.repeat(50));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ 成功: ${successful.length} 支股票`);
    console.log(`❌ 失敗: ${failed.length} 支股票`);

    for (const result of successful) {
      console.log(`  - ${result.symbol}.${result.market}: ${result.data.length} 筆資料`);
    }

    for (const result of failed) {
      console.log(`  - ${result.symbol}.${result.market}: ${result.error}`);
    }

    console.log('\n📁 檔案位置:');
    console.log('  - 完整資料: test-data/test-stocks-data.json');
    console.log('  - 個別股票: test-data/{market}/{symbol}_data.json');
    console.log('  - 技術指標: test-data/{market}/{symbol}_indicators.json');
  }
}

/**
 * 主程式
 */
async function main() {
  try {
    const collector = new TestDataCollector();
    const results = await collector.collectTestData();
    collector.displaySummary(results);
    
    console.log('\n🎉 測試資料收集完成！');
  } catch (error) {
    console.error('❌ 收集測試資料時發生錯誤:', error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

export { TestDataCollector };
export type { TestDataResult };
