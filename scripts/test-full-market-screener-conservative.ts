#!/usr/bin/env tsx

import { FullMarketScanner } from '../lib/screener/full-market-scanner';
import { logger } from '../lib/logger';

// 簡化的 logger 實作
const simpleLogger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
};

async function main() {
  const scanner = new FullMarketScanner();
  
  try {
    simpleLogger.info('開始保守模式全市場掃描測試');
    
    // 使用保守設定：只掃描前50支股票
    const result = await scanner.scanFullMarkets('quick', {}, 50, ['US', 'TW']);
    
    simpleLogger.info('掃描完成！');
    simpleLogger.info(`總計掃描: ${result.stocks.length} 支股票`);
    
    // 顯示前10支股票的結果
    if (result.stocks.length > 0) {
      simpleLogger.info('前10支股票結果:');
      result.stocks.slice(0, 10).forEach((stock, index) => {
        simpleLogger.info(`${index + 1}. ${stock.symbol} (${stock.market}) - ${stock.name}`);
        simpleLogger.info(`   評分: ${stock.score}, 建議: ${stock.action}, 信心度: ${stock.confidence}%`);
        simpleLogger.info(`   產業: ${stock.metadata?.sector || 'N/A'} / ${stock.metadata?.industry || 'N/A'}`);
      });
    }
    
    // 統計結果
    const usStocks = result.stocks.filter(s => s.market === 'US');
    const twStocks = result.stocks.filter(s => s.market === 'TW');
    
    simpleLogger.info('統計結果:');
    simpleLogger.info(`美股: ${usStocks.length} 支`);
    simpleLogger.info(`台股: ${twStocks.length} 支`);
    
    const buyStocks = result.stocks.filter(s => s.action === 'Buy');
    const holdStocks = result.stocks.filter(s => s.action === 'Hold');
    const avoidStocks = result.stocks.filter(s => s.action === 'Avoid');
    
    simpleLogger.info('建議分布:');
    simpleLogger.info(`買入: ${buyStocks.length} 支`);
    simpleLogger.info(`持有: ${holdStocks.length} 支`);
    simpleLogger.info(`避免: ${avoidStocks.length} 支`);
    
  } catch (error) {
    simpleLogger.error('掃描失敗:', error);
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
