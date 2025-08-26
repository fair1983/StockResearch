#!/usr/bin/env tsx

import { FullMarketScanner } from '../lib/screener/full-market-scanner';

// 簡化的 logger 實作
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
};

async function main() {
  const scanner = new FullMarketScanner();
  
  try {
    logger.info('開始測試全市場掃描器');
    
    // 測試快速掃描模式
    logger.info('=== 測試快速掃描模式 ===');
    const quickResult = await scanner.scanFullMarkets('quick');
    logger.info(`快速掃描結果: ${quickResult.stocks.length} 支股票`);
    
    // 測試產業掃描模式
    logger.info('=== 測試產業掃描模式 ===');
    const sectorResult = await scanner.scanFullMarkets('sector', { sector: '01' }); // 水泥業
    logger.info(`產業掃描結果: ${sectorResult.stocks.length} 支股票`);
    
    // 測試市值掃描模式
    logger.info('=== 測試市值掃描模式 ===');
    const marketCapResult = await scanner.scanFullMarkets('market-cap', { minMarketCap: 1000000000 }); // 10億以上
    logger.info(`市值掃描結果: ${marketCapResult.stocks.length} 支股票`);
    
    // 顯示掃描結果範例
    if (quickResult.stocks.length > 0) {
      logger.info('快速掃描範例:');
      quickResult.stocks.slice(0, 5).forEach(stock => {
        logger.info(`  ${stock.symbol}: ${stock.name} (${stock.market})`);
      });
    }
    
    if (sectorResult.stocks.length > 0) {
      logger.info('產業掃描範例:');
      sectorResult.stocks.slice(0, 5).forEach(stock => {
        logger.info(`  ${stock.symbol}: ${stock.name} (${stock.sector})`);
      });
    }
    
    // 生成測試報告
    const report = {
      timestamp: new Date().toISOString(),
      tests: {
        quick: {
          totalStocks: quickResult.stocks.length,
          success: quickResult.stocks.length > 0
        },
        sector: {
          totalStocks: sectorResult.stocks.length,
          success: sectorResult.stocks.length > 0
        },
        marketCap: {
          totalStocks: marketCapResult.stocks.length,
          success: marketCapResult.stocks.length > 0
        }
      },
      summary: {
        totalTests: 3,
        passedTests: [quickResult.stocks.length > 0, sectorResult.stocks.length > 0, marketCapResult.stocks.length > 0].filter(Boolean).length,
        totalStocksFound: quickResult.stocks.length + sectorResult.stocks.length + marketCapResult.stocks.length
      }
    };
    
    logger.info('測試報告:', report);
    
  } catch (error) {
    logger.error('測試失敗:', error);
    process.exit(1);
  }
}

// 執行主程式
if (require.main === module) {
  main().catch(error => {
    logger.error('程式執行失敗:', error);
    process.exit(1);
  });
}
