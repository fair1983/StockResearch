#!/usr/bin/env node

const yahooFinance = require('yahoo-finance2').default;

// 簡化的 logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`)
};

async function testBatchLimits() {
  logger.info('=== Yahoo Finance API 批量查詢限制測試 ===\n');
  
  // 準備測試股票列表
  const usStocks = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'BRK-B', 'JPM', 'JNJ',
    'V', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'PYPL', 'BAC', 'ADBE', 'CRM',
    'NFLX', 'INTC', 'VZ', 'CMCSA', 'PFE', 'ABT', 'KO', 'PEP', 'TMO', 'COST',
    'AVGO', 'ACN', 'DHR', 'NEE', 'LLY', 'TXN', 'HON', 'UNP', 'LOW', 'IBM',
    'CAT', 'UPS', 'RTX', 'QCOM', 'T', 'SPGI', 'INTU', 'AMGN', 'ISRG', 'GILD'
  ];
  
  const twStocks = [
    '1101.TW', '1102.TW', '1103.TW', '1216.TW', '1301.TW', '1303.TW', '1326.TW', '1402.TW', '1419.TW', '1434.TW',
    '1444.TW', '1476.TW', '1504.TW', '1513.TW', '1522.TW', '1605.TW', '1701.TW', '1702.TW', '1710.TW', '1722.TW',
    '1802.TW', '1904.TW', '1907.TW', '2002.TW', '2015.TW', '2027.TW', '2105.TW', '2201.TW', '2207.TW', '2211.TW',
    '2301.TW', '2303.TW', '2308.TW', '2317.TW', '2324.TW', '2327.TW', '2330.TW', '2344.TW', '2347.TW', '2354.TW',
    '2357.TW', '2360.TW', '2377.TW', '2382.TW', '2392.TW', '2408.TW', '2412.TW', '2439.TW', '2449.TW', '2454.TW'
  ];
  
  // 測試不同批量大小
  const batchSizes = [5, 10, 20, 30, 40, 50];
  
  for (const batchSize of batchSizes) {
    logger.info(`\n=== 測試批量大小: ${batchSize} ===`);
    
    // 測試美股
    const usBatch = usStocks.slice(0, batchSize);
    logger.info(`測試 ${usBatch.length} 支美股...`);
    
    const startTime = Date.now();
    const usPromises = usBatch.map(async (symbol, index) => {
      try {
        const quote = await yahooFinance.quote(symbol);
        return { 
          symbol, 
          success: true, 
          price: quote.regularMarketPrice,
          index 
        };
      } catch (error) {
        return { 
          symbol, 
          success: false, 
          error: error.message,
          index 
        };
      }
    });
    
    const usResults = await Promise.all(usPromises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const usSuccessCount = usResults.filter(r => r.success).length;
    const usFailCount = usResults.filter(r => !r.success).length;
    
    logger.info(`美股結果: ${usSuccessCount}/${usBatch.length} 成功, ${usFailCount} 失敗`);
    logger.info(`查詢時間: ${duration}ms (平均 ${Math.round(duration/usBatch.length)}ms/支)`);
    
    if (usFailCount > 0) {
      logger.warn('失敗的股票:');
      usResults.filter(r => !r.success).forEach(r => {
        logger.warn(`  ${r.symbol}: ${r.error}`);
      });
    }
    
    // 測試台股
    const twBatch = twStocks.slice(0, batchSize);
    logger.info(`測試 ${twBatch.length} 支台股...`);
    
    const twStartTime = Date.now();
    const twPromises = twBatch.map(async (symbol, index) => {
      try {
        const quote = await yahooFinance.quote(symbol);
        return { 
          symbol, 
          success: true, 
          price: quote.regularMarketPrice,
          index 
        };
      } catch (error) {
        return { 
          symbol, 
          success: false, 
          error: error.message,
          index 
        };
      }
    });
    
    const twResults = await Promise.all(twPromises);
    const twEndTime = Date.now();
    const twDuration = twEndTime - twStartTime;
    
    const twSuccessCount = twResults.filter(r => r.success).length;
    const twFailCount = twResults.filter(r => !r.success).length;
    
    logger.info(`台股結果: ${twSuccessCount}/${twBatch.length} 成功, ${twFailCount} 失敗`);
    logger.info(`查詢時間: ${twDuration}ms (平均 ${Math.round(twDuration/twBatch.length)}ms/支)`);
    
    if (twFailCount > 0) {
      logger.warn('失敗的股票:');
      twResults.filter(r => !r.success).forEach(r => {
        logger.warn(`  ${r.symbol}: ${r.error}`);
      });
    }
    
    // 等待一下再測試下一批
    if (batchSize < 50) {
      logger.info('等待 3 秒後測試下一批...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // 測試延遲查詢
  logger.info('\n=== 測試延遲查詢策略 ===');
  const testStocks = usStocks.slice(0, 30);
  logger.info(`使用延遲策略查詢 ${testStocks.length} 支股票...`);
  
  const startTime = Date.now();
  const results = [];
  
  for (let i = 0; i < testStocks.length; i++) {
    const symbol = testStocks[i];
    try {
      const quote = await yahooFinance.quote(symbol);
      results.push({ symbol, success: true, price: quote.regularMarketPrice });
      logger.info(`✓ ${symbol}: $${quote.regularMarketPrice}`);
    } catch (error) {
      results.push({ symbol, success: false, error: error.message });
      logger.error(`✗ ${symbol}: ${error.message}`);
    }
    
    // 每查詢 5 支股票後延遲 1 秒
    if ((i + 1) % 5 === 0 && i < testStocks.length - 1) {
      logger.info(`已查詢 ${i + 1} 支，延遲 1 秒...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const successCount = results.filter(r => r.success).length;
  
  logger.info(`\n延遲查詢結果: ${successCount}/${testStocks.length} 成功`);
  logger.info(`總查詢時間: ${duration}ms (平均 ${Math.round(duration/testStocks.length)}ms/支)`);
  
  // 總結
  logger.info('\n=== 批量查詢限制總結 ===');
  logger.info('✓ 建議的批量策略:');
  logger.info('  - 單次批量: 10-20 支股票');
  logger.info('  - 查詢間隔: 每 5 支股票延遲 1 秒');
  logger.info('  - 總體限制: 建議不超過 50 支/批次');
  logger.info('  - 錯誤處理: 需要處理個別股票查詢失敗');
  logger.info('  - 台股查詢: 需要加上 .TW 後綴');
}

// 執行測試
testBatchLimits().catch(error => {
  logger.error(`測試執行失敗: ${error.message}`);
  process.exit(1);
});
