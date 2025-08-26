#!/usr/bin/env tsx

import { FullMarketCollector } from '../lib/data-collection/full-market-collector';
import { logger } from '../lib/logger';

// 簡化的 logger 實作，避免複雜的配置
const simpleLogger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
};

// 收集選項
interface CollectionOptions {
  usLimit?: number; // 美股限制，undefined 表示全部
  twLimit?: number; // 台股限制，undefined 表示全部
  mode: 'test' | 'quick' | 'full' | 'custom';
}

async function main() {
  // 從命令行參數獲取收集模式
  const args = process.argv.slice(2);
  const mode = args[0] || 'quick';
  
  let options: CollectionOptions;
  
  switch (mode) {
    case 'test':
      options = {
        usLimit: 50,
        twLimit: 50,
        mode: 'test'
      };
      break;
    case 'quick':
      options = {
        usLimit: 500,
        twLimit: 500,
        mode: 'quick'
      };
      break;
    case 'full':
      options = {
        usLimit: undefined, // 全部美股
        twLimit: undefined, // 全部台股
        mode: 'full'
      };
      break;
    case 'custom':
      const usLimit = args[1] ? parseInt(args[1]) : undefined;
      const twLimit = args[2] ? parseInt(args[2]) : undefined;
      options = {
        usLimit,
        twLimit,
        mode: 'custom'
      };
      break;
    default:
      simpleLogger.error('無效的模式，請使用: test, quick, full, custom');
      process.exit(1);
  }
  
  const collector = new FullMarketCollector();
  
  try {
    simpleLogger.info(`開始全市場資料收集流程（模式: ${options.mode}）`);
    
    // 收集美股資料
    const usLimitText = options.usLimit ? `${options.usLimit}支` : '全部';
    simpleLogger.info(`=== 開始收集美股資料（${usLimitText}） ===`);
    const usResult = await collector.collectUSMarketStocks(options.usLimit);
    simpleLogger.info(`美股收集完成: ${usResult.collectedStocks.length} 支成功，${usResult.failedStocks.length} 支失敗`);
    
    // 收集台股資料
    const twLimitText = options.twLimit ? `${options.twLimit}支` : '全部';
    simpleLogger.info(`=== 開始收集台股資料（${twLimitText}） ===`);
    const twResult = await collector.collectTWMarketStocks(options.twLimit);
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

// 顯示使用說明
function showUsage() {
  console.log(`
全市場資料收集工具

使用方法:
  npx tsx scripts/collect-full-market-data-flexible.ts [模式] [美股數量] [台股數量]

模式選項:
  test    - 測試模式: 美股50支, 台股50支
  quick   - 快速模式: 美股500支, 台股500支
  full    - 完整模式: 收集所有股票
  custom  - 自定義模式: 指定數量

範例:
  npx tsx scripts/collect-full-market-data-flexible.ts test
  npx tsx scripts/collect-full-market-data-flexible.ts quick
  npx tsx scripts/collect-full-market-data-flexible.ts full
  npx tsx scripts/collect-full-market-data-flexible.ts custom 1000 500
  `);
}

// 執行主程式
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showUsage();
    process.exit(0);
  }
  
  main().catch(error => {
    simpleLogger.error('程式執行失敗:', error);
    process.exit(1);
  });
}
