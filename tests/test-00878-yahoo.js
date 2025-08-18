const yahooFinance = require('yahoo-finance2').default;

async function test00878() {
  try {
    console.log('測試 00878 的 Yahoo Finance API 回應...\n');
    
    // 測試不同的代碼格式
    const symbols = [
      '00878',           // 原始代碼
      '00878.TW',        // 台股格式
      '00878.TW:US',     // 完整格式
      '00878.TW:TW'      // 台股完整格式
    ];
    
    for (const symbol of symbols) {
      console.log(`\n=== 測試代碼: ${symbol} ===`);
      
      try {
        // 1. 基本報價資訊
        console.log('1. 基本報價資訊:');
        const quote = await yahooFinance.quote(symbol);
        console.log('   - 成功取得報價');
        console.log('   - 股票名稱:', quote.longName || quote.shortName);
        console.log('   - 當前價格:', quote.regularMarketPrice);
        console.log('   - 交易所:', quote.fullExchangeName);
        console.log('   - 市場時區:', quote.exchangeTimezoneName);
        console.log('   - 報價類型:', quote.quoteType);
        console.log('   - 完整報價資料:', JSON.stringify(quote, null, 2));
        
        // 2. 歷史資料
        console.log('\n2. 歷史資料 (最近5天):');
        const history = await yahooFinance.historical(symbol, {
          period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          period2: new Date(),
          interval: '1d'
        });
        console.log('   - 成功取得歷史資料');
        console.log('   - 資料筆數:', history.length);
        if (history.length > 0) {
          console.log('   - 最新日期:', history[history.length - 1].date);
          console.log('   - 最新收盤價:', history[history.length - 1].close);
        }
        
        // 3. 基本面資料
        console.log('\n3. 基本面資料:');
        const summary = await yahooFinance.quoteSummary(symbol, {
          modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics']
        });
        console.log('   - 成功取得基本面資料');
        console.log('   - 完整基本面資料:', JSON.stringify(summary, null, 2));
        
        console.log('\n✅ 此代碼格式可用');
        break; // 找到可用的格式就停止
        
      } catch (error) {
        console.log('   ❌ 錯誤:', error.message);
      }
    }
    
    // 4. 搜尋功能測試
    console.log('\n=== 搜尋功能測試 ===');
    try {
      const searchResults = await yahooFinance.search('00878');
      console.log('搜尋結果:', searchResults);
      
      if (searchResults && Array.isArray(searchResults)) {
        console.log('搜尋結果數量:', searchResults.length);
        searchResults.forEach((result, index) => {
          console.log(`\n結果 ${index + 1}:`);
          console.log('  - 代碼:', result.symbol);
          console.log('  - 名稱:', result.name);
          console.log('  - 交易所:', result.exchange);
          console.log('  - 類型:', result.quoteType);
          console.log('  - 市場:', result.market);
        });
      } else {
        console.log('搜尋結果不是陣列格式:', typeof searchResults);
      }
    } catch (error) {
      console.log('搜尋錯誤:', error.message);
    }
    
  } catch (error) {
    console.error('測試失敗:', error);
  }
}

test00878();
