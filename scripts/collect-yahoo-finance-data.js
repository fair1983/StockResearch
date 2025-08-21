#!/usr/bin/env node

const { YahooFinanceCollector } = require('../lib/data/yahoo-finance-collector');
const { getMarketConfig, getAllMarkets } = require('../lib/data/market-config');

/**
 * 數據收集主函數
 */
async function collectData() {
  console.log('🚀 開始收集 Yahoo Finance 數據...');
  console.log('='.repeat(80));

  try {
    // 初始化收集器
    const config = getMarketConfig();
    const collector = new YahooFinanceCollector(config);

    // 獲取所有市場
    const markets = getAllMarkets();
    console.log(`📊 將收集 ${markets.length} 個市場的數據:`);
    markets.forEach(market => {
      const marketInfo = config.markets[market];
      console.log(`  - ${market}: ${marketInfo.name} (${marketInfo.symbols.length} 支股票)`);
    });

    console.log('\n' + '='.repeat(80));

    // 逐個市場收集數據
    for (const market of markets) {
      console.log(`\n📈 開始收集 ${market} 市場數據...`);
      
      try {
        await collector.collectMarketData(market);
        console.log(`✅ ${market} 市場數據收集完成`);
      } catch (error) {
        console.error(`❌ ${market} 市場數據收集失敗:`, error.message);
      }

      // 市場間延遲
      if (market !== markets[markets.length - 1]) {
        console.log('⏳ 等待 5 秒後繼續下一個市場...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 所有市場數據收集完成！');
    console.log(`📁 數據存儲位置: ${config.baseDir}`);

  } catch (error) {
    console.error('❌ 數據收集過程中發生錯誤:', error);
    process.exit(1);
  }
}

/**
 * 收集單個市場數據
 */
async function collectMarketData(market) {
  console.log(`🚀 開始收集 ${market} 市場數據...`);

  try {
    const config = getMarketConfig();
    const collector = new YahooFinanceCollector(config);
    
    await collector.collectMarketData(market);
    console.log(`✅ ${market} 市場數據收集完成`);
  } catch (error) {
    console.error(`❌ ${market} 市場數據收集失敗:`, error);
    process.exit(1);
  }
}

/**
 * 收集單個股票數據
 */
async function collectStockData(symbol, market) {
  console.log(`🚀 開始收集 ${symbol} (${market}) 數據...`);

  try {
    const config = getMarketConfig();
    const collector = new YahooFinanceCollector(config);
    
    // 獲取報價數據
    const quoteData = await collector.getQuote(symbol, market);
    if (quoteData) {
      await collector.saveQuoteData(symbol, market, quoteData);
      console.log(`✅ ${symbol} 報價數據已保存`);
    } else {
      console.log(`⚠️ 無法獲取 ${symbol} 報價數據`);
    }

    // 獲取歷史數據
    const period1 = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
    const period2 = Math.floor(Date.now() / 1000);
    const historicalData = await collector.getHistoricalData(symbol, market, period1, period2);
    if (historicalData) {
      await collector.saveHistoricalData(symbol, market, historicalData);
      console.log(`✅ ${symbol} 歷史數據已保存`);
    } else {
      console.log(`⚠️ 無法獲取 ${symbol} 歷史數據`);
    }

  } catch (error) {
    console.error(`❌ ${symbol} 數據收集失敗:`, error);
    process.exit(1);
  }
}

/**
 * 檢查數據狀態
 */
async function checkDataStatus() {
  console.log('🔍 檢查數據狀態...');

  try {
    const config = getMarketConfig();
    const collector = new YahooFinanceCollector(config);
    const markets = getAllMarkets();

    for (const market of markets) {
      console.log(`\n📊 ${market} 市場狀態:`);
      
      try {
        const symbols = await collector.getMarketSymbols(market);
        console.log(`  - 已收集股票數量: ${symbols.length}`);
        
        if (symbols.length > 0) {
          // 檢查前幾個股票的數據狀態
          const sampleSymbols = symbols.slice(0, 3);
          for (const symbol of sampleSymbols) {
            const isStale = await collector.isDataStale(symbol, market);
            const status = isStale ? '過期' : '最新';
            console.log(`  - ${symbol}: ${status}`);
          }
        }
      } catch (error) {
        console.log(`  - 無法讀取 ${market} 市場狀態: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ 檢查數據狀態失敗:', error);
  }
}

// 命令行參數處理
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'all':
    collectData();
    break;
  case 'market':
    const market = args[1];
    if (!market) {
      console.error('請指定市場代碼 (US, TW, HK, JP, CN)');
      process.exit(1);
    }
    collectMarketData(market);
    break;
  case 'stock':
    const symbol = args[1];
    const stockMarket = args[2];
    if (!symbol || !stockMarket) {
      console.error('請指定股票代碼和市場 (例如: node collect-yahoo-finance-data.js stock AAPL US)');
      process.exit(1);
    }
    collectStockData(symbol, stockMarket);
    break;
  case 'status':
    checkDataStatus();
    break;
  default:
    console.log('Yahoo Finance 數據收集工具');
    console.log('');
    console.log('使用方法:');
    console.log('  node collect-yahoo-finance-data.js all                    # 收集所有市場數據');
    console.log('  node collect-yahoo-finance-data.js market <MARKET>       # 收集指定市場數據');
    console.log('  node collect-yahoo-finance-data.js stock <SYMBOL> <MARKET> # 收集指定股票數據');
    console.log('  node collect-yahoo-finance-data.js status                # 檢查數據狀態');
    console.log('');
    console.log('市場代碼:');
    console.log('  US - 美國股市');
    console.log('  TW - 台灣股市');
    console.log('  HK - 香港股市');
    console.log('  JP - 日本股市');
    console.log('  CN - 中國股市');
    console.log('');
    console.log('範例:');
    console.log('  node collect-yahoo-finance-data.js all');
    console.log('  node collect-yahoo-finance-data.js market US');
    console.log('  node collect-yahoo-finance-data.js stock AAPL US');
    console.log('  node collect-yahoo-finance-data.js stock 2330.TW TW');
    break;
}
