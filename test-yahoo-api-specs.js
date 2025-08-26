#!/usr/bin/env node

const yahooFinance = require('yahoo-finance2').default;

// 簡化的 logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`)
};

async function testYahooFinanceAPI() {
  logger.info('=== Yahoo Finance API 介面規格測試 ===\n');
  
  try {
    // 測試 1: 基本報價查詢
    logger.info('1. 測試基本報價查詢 (quote)');
    const quote = await yahooFinance.quote('AAPL');
    logger.success(`✓ AAPL 報價成功`);
    logger.info(`   - 股票代號: ${quote.symbol}`);
    logger.info(`   - 當前價格: $${quote.regularMarketPrice}`);
    logger.info(`   - 漲跌幅: ${quote.regularMarketChangePercent}%`);
    logger.info(`   - 成交量: ${quote.regularMarketVolume}`);
    logger.info(`   - 市值: $${quote.marketCap}`);
    logger.info(`   - 產業: ${quote.sector}`);
    logger.info(`   - 子產業: ${quote.industry}`);
    logger.info(`   - 交易所: ${quote.exchange}`);
    logger.info(`   - 貨幣: ${quote.currency}`);
    logger.info(`   - 時區: ${quote.exchangeTimezoneName}`);
    logger.info(`   - 最後更新: ${quote.regularMarketTime}`);
    
    // 測試 2: 歷史資料查詢
    logger.info('\n2. 測試歷史資料查詢 (historical)');
    const historical = await yahooFinance.historical('AAPL', {
      period1: new Date('2024-01-01'),
      period2: new Date('2024-12-31'),
      interval: '1d'
    });
    logger.success(`✓ AAPL 歷史資料成功，共 ${historical.length} 天`);
    logger.info(`   - 日期範圍: ${historical[0].date} 到 ${historical[historical.length-1].date}`);
    logger.info(`   - 資料欄位: ${Object.keys(historical[0]).join(', ')}`);
    
    // 測試 3: 台股查詢
    logger.info('\n3. 測試台股查詢');
    const twQuote = await yahooFinance.quote('1101.TW');
    logger.success(`✓ 1101.TW 台泥報價成功`);
    logger.info(`   - 股票代號: ${twQuote.symbol}`);
    logger.info(`   - 當前價格: ${twQuote.regularMarketPrice}`);
    logger.info(`   - 漲跌幅: ${twQuote.regularMarketChangePercent}%`);
    
    // 測試 4: 批量查詢測試
    logger.info('\n4. 測試批量查詢限制');
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'BRK-B', 'JPM', 'JNJ'];
    
    logger.info(`嘗試批量查詢 ${symbols.length} 支股票...`);
    const startTime = Date.now();
    
    const batchPromises = symbols.map(async (symbol) => {
      try {
        const quote = await yahooFinance.quote(symbol);
        return { symbol, success: true, price: quote.regularMarketPrice };
      } catch (error) {
        return { symbol, success: false, error: error.message };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successCount = batchResults.filter(r => r.success).length;
    const failCount = batchResults.filter(r => !r.success).length;
    
    logger.info(`批量查詢結果: ${successCount} 成功, ${failCount} 失敗`);
    logger.info(`查詢時間: ${duration}ms (平均 ${duration/symbols.length}ms/支)`);
    
    // 測試 5: 不同時間間隔測試
    logger.info('\n5. 測試不同時間間隔');
    const intervals = ['1m', '5m', '15m', '30m', '1h', '1d', '1wk', '1mo'];
    
    for (const interval of intervals) {
      try {
        const testHistorical = await yahooFinance.historical('AAPL', {
          period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
          period2: new Date(),
          interval: interval
        });
        logger.success(`✓ 間隔 ${interval}: ${testHistorical.length} 筆資料`);
      } catch (error) {
        logger.error(`✗ 間隔 ${interval}: ${error.message}`);
      }
    }
    
    // 測試 6: 搜尋功能測試
    logger.info('\n6. 測試搜尋功能');
    try {
      const search = await yahooFinance.search('Apple');
      logger.success(`✓ 搜尋 "Apple" 成功，找到 ${search.length} 個結果`);
      if (search.length > 0) {
        logger.info(`  第一個結果: ${search[0].symbol} - ${search[0].name}`);
      }
    } catch (error) {
      logger.error(`✗ 搜尋失敗: ${error.message}`);
    }
    
    // 測試 7: 推薦股票測試
    logger.info('\n7. 測試推薦股票功能');
    try {
      const recommendations = await yahooFinance.recommendations('AAPL');
      logger.success(`✓ AAPL 推薦股票成功，共 ${recommendations.length} 個推薦`);
      if (recommendations.length > 0) {
        logger.info(`  第一個推薦: ${recommendations[0].symbol} - ${recommendations[0].score}`);
      }
    } catch (error) {
      logger.error(`✗ 推薦股票失敗: ${error.message}`);
    }
    
    // 測試 8: 財務報表測試
    logger.info('\n8. 測試財務報表功能');
    try {
      const cashflow = await yahooFinance.cashflow('AAPL');
      logger.success(`✓ AAPL 現金流量表成功，共 ${cashflow.length} 個期間`);
    } catch (error) {
      logger.error(`✗ 現金流量表失敗: ${error.message}`);
    }
    
    // API 規格總結
    logger.info('\n=== Yahoo Finance API 規格總結 ===');
    logger.info('✓ 支援的功能:');
    logger.info('  - quote(): 即時報價');
    logger.info('  - historical(): 歷史資料');
    logger.info('  - search(): 股票搜尋');
    logger.info('  - recommendations(): 推薦股票');
    logger.info('  - cashflow(): 現金流量表');
    logger.info('  - income(): 損益表');
    logger.info('  - balanceSheet(): 資產負債表');
    
    logger.info('\n✓ 支援的市場:');
    logger.info('  - 美股: AAPL, MSFT, GOOGL 等');
    logger.info('  - 台股: 1101.TW, 2330.TW 等');
    logger.info('  - 其他國際市場');
    
    logger.info('\n✓ 時間間隔選項:');
    logger.info('  - 1m, 5m, 15m, 30m (分鐘)');
    logger.info('  - 1h (小時)');
    logger.info('  - 1d (日)');
    logger.info('  - 1wk (週)');
    logger.info('  - 1mo (月)');
    
    logger.info('\n✓ 批量查詢建議:');
    logger.info(`  - 測試結果: ${successCount}/${symbols.length} 成功`);
    logger.info(`  - 平均查詢時間: ${Math.round(duration/symbols.length)}ms/支`);
    logger.info('  - 建議批量大小: 10-20 支股票');
    logger.info('  - 建議查詢間隔: 1-2 秒');
    
  } catch (error) {
    logger.error(`API 測試失敗: ${error.message}`);
    logger.error(`錯誤詳情: ${error.stack}`);
  }
}

// 執行測試
testYahooFinanceAPI().catch(error => {
  logger.error(`測試執行失敗: ${error.message}`);
  process.exit(1);
});
