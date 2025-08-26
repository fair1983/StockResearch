#!/usr/bin/env tsx

import { FullMarketCollector } from '../lib/data-collection/full-market-collector';
import { logger } from '../lib/logger';

// 簡化的 logger 實作，避免複雜的配置
const simpleLogger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
};

async function main() {
  const collector = new FullMarketCollector();
  
  try {
    simpleLogger.info('開始全市場資料收集流程（收集所有股票資料）');
    
    // 收集美股資料（完整模式：全部美股）
    simpleLogger.info('=== 開始收集美股資料（完整模式：全部美股） ===');
    const usResult = await collector.collectUSMarketStocks(); // 處理所有美股（約10075支）
    simpleLogger.info(`美股收集完成: ${usResult.collectedStocks.length} 支成功，${usResult.failedStocks.length} 支失敗`);
    
    // 收集台股資料（完整模式：全部台股）
    simpleLogger.info('=== 開始收集台股資料（完整模式：全部台股） ===');
    const twResult = await collector.collectTWMarketStocks(); // 處理所有台股（約1057支）
    simpleLogger.info(`台股收集完成: ${twResult.collectedStocks.length} 支成功，${twResult.failedStocks.length} 支失敗`);
    
    // 生成總統計報告
    simpleLogger.info('=== 生成統計報告 ===');
    const totalStocks = usResult.collectedStocks.length + twResult.collectedStocks.length;
    const totalFailed = usResult.failedStocks.length + twResult.failedStocks.length;
    const successRate = ((totalStocks / (totalStocks + totalFailed)) * 100).toFixed(2);
    
    simpleLogger.info('全市場資料收集完成！');
    simpleLogger.info(`總計: ${totalStocks + totalFailed} 支股票`);
    simpleLogger.info(`成功: ${totalStocks} 支 (${successRate}%)`);
    simpleLogger.info(`失敗: ${totalFailed} 支`);
    simpleLogger.info(`美股: ${usResult.collectedStocks.length} 支`);
    simpleLogger.info(`台股: ${twResult.collectedStocks.length} 支`);
    
    // 顯示前幾支股票的資訊
    if (usResult.collectedStocks.length > 0) {
      simpleLogger.info('美股範例:');
      usResult.collectedStocks.slice(0, 3).forEach(stock => {
        simpleLogger.info(`  ${stock.symbol}: ${stock.name}`);
      });
    }
    
    if (twResult.collectedStocks.length > 0) {
      simpleLogger.info('台股範例:');
      twResult.collectedStocks.slice(0, 3).forEach(stock => {
        simpleLogger.info(`  ${stock.symbol}: ${stock.name}`);
      });
    }
    
  } catch (error) {
    simpleLogger.error('全市場資料收集失敗:', error);
    process.exit(1);
  }
}

// 執行主程式
if (require.main === module) {
  main().catch(error => {
    simpleLogger.error('程式執行失敗:', error);
    process.exit(1);
  });
}
