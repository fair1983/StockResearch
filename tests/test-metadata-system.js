const yahooFinance = require('yahoo-finance2').default;
const fs = require('fs').promises;
const path = require('path');

// 模擬 StockMetadataManager
class StockMetadataManager {
  constructor() {
    this.metadataPath = path.join(__dirname, '..', 'data', 'stock-metadata.json');
    this.metadata = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      stocks: {}
    };
  }

  async load() {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf8');
      this.metadata = JSON.parse(data);
      console.log(`載入 ${Object.keys(this.metadata.stocks).length} 筆股票元資料`);
    } catch (error) {
      console.log('元資料檔案不存在，將創建新的檔案');
      await this.save();
    }
  }

  async save() {
    try {
      this.metadata.lastUpdated = new Date().toISOString();
      await fs.writeFile(this.metadataPath, JSON.stringify(this.metadata, null, 2), 'utf8');
      console.log('元資料已儲存');
    } catch (error) {
      console.error('儲存元資料失敗', error);
      throw error;
    }
  }

  getStockMetadata(symbol) {
    return this.metadata.stocks[symbol] || null;
  }

  setStockMetadata(symbol, metadata) {
    const existing = this.metadata.stocks[symbol] || {
      symbol,
      name: '',
      market: 'TW',
      category: 'stock',
      exchange: '',
      exchangeName: '',
      quoteType: '',
      currency: 'TWD',
      lastUpdated: new Date().toISOString()
    };

    this.metadata.stocks[symbol] = {
      ...existing,
      ...metadata,
      lastUpdated: new Date().toISOString()
    };

    console.log(`更新股票元資料: ${symbol}`);
  }

  updateFromYahooData(symbol, yahooQuote, yahooSummary) {
    const metadata = {
      symbol,
      name: yahooQuote.longName || yahooQuote.shortName || '',
      market: this.determineMarketFromYahoo(yahooQuote),
      category: this.determineCategoryFromYahoo(yahooQuote),
      exchange: yahooQuote.exchange || '',
      exchangeName: yahooQuote.fullExchangeName || yahooQuote.exchangeName || '',
      quoteType: yahooQuote.quoteType || '',
      currency: yahooQuote.currency || 'TWD',
      yahooData: {
        longName: yahooQuote.longName,
        shortName: yahooQuote.shortName,
        market: yahooQuote.market,
        fullExchangeName: yahooQuote.fullExchangeName,
        exchangeTimezoneName: yahooQuote.exchangeTimezoneName,
        dividendYield: yahooQuote.dividendYield,
        trailingPE: yahooQuote.trailingPE,
        totalAssets: yahooQuote.totalAssets || yahooQuote.netAssets,
        fundFamily: yahooQuote.fundFamily,
        fundInceptionDate: yahooQuote.fundInceptionDate,
        ...yahooQuote
      }
    };

    if (yahooSummary) {
      metadata.yahooData = {
        ...metadata.yahooData,
        summaryDetail: yahooSummary.summaryDetail,
        defaultKeyStatistics: yahooSummary.defaultKeyStatistics,
        price: yahooSummary.price
      };
    }

    this.setStockMetadata(symbol, metadata);
  }

  determineMarketFromYahoo(quote) {
    if (quote.market === 'tw_market') return 'TW';
    if (quote.market === 'us_market') return 'US';
    
    if (quote.exchange === 'TAI') return 'TW';
    if (['NMS', 'NYQ', 'PCX', 'NGM', 'OPR', 'NEO', 'BTS', 'PNK'].includes(quote.exchange)) return 'US';
    
    if (/^\d{4,5}$/.test(quote.symbol)) return 'TW';
    if (/^[A-Z][A-Z0-9.]{0,6}$/.test(quote.symbol)) return 'US';
    
    return 'TW';
  }

  determineCategoryFromYahoo(quote) {
    if (quote.quoteType === 'ETF') return 'etf';
    if (quote.quoteType === 'EQUITY') return 'stock';
    if (quote.quoteType === 'OPTION') return 'option';
    
    if (/^\d{5}$/.test(quote.symbol)) return 'etf';
    if (/^\d{4}$/.test(quote.symbol)) return 'stock';
    
    return 'stock';
  }

  getAllStockMetadata() {
    return this.metadata.stocks;
  }

  getStats() {
    const stocks = Object.values(this.metadata.stocks);
    const byMarket = {};
    const byCategory = {};

    stocks.forEach(stock => {
      byMarket[stock.market] = (byMarket[stock.market] || 0) + 1;
      byCategory[stock.category] = (byCategory[stock.category] || 0) + 1;
    });

    return {
      total: stocks.length,
      byMarket,
      byCategory
    };
  }
}

async function testMetadataSystem() {
  console.log('測試股票元資料管理系統...\n');
  
  const metadataManager = new StockMetadataManager();
  await metadataManager.load();

  // 測試股票列表
  const testStocks = [
    '00878',  // 台股ETF
    '2330',   // 台股股票
    'AAPL',   // 美股股票
    'SPY',    // 美股ETF
    'CRWV270115C00125000'  // 美股期權
  ];

  for (const symbol of testStocks) {
    console.log(`\n=== 測試股票: ${symbol} ===`);
    
    try {
      // 格式化股票代碼
      let formattedSymbol = symbol;
      if (/^\d{4,5}$/.test(symbol)) {
        formattedSymbol = `${symbol}.TW`;
      }

      // 取得報價資訊
      const quote = await yahooFinance.quote(formattedSymbol);
      console.log('✅ 成功取得報價資訊');
      console.log(`   - 名稱: ${quote.longName || quote.shortName}`);
      console.log(`   - 交易所: ${quote.fullExchangeName} (${quote.exchange})`);
      console.log(`   - 類型: ${quote.quoteType}`);
      console.log(`   - 市場: ${quote.market}`);

      // 取得基本面資料
      let summary = null;
      try {
        summary = await yahooFinance.quoteSummary(formattedSymbol, {
          modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics']
        });
        console.log('✅ 成功取得基本面資料');
      } catch (summaryError) {
        console.log('⚠️ 無法取得基本面資料');
      }

      // 更新元資料
      metadataManager.updateFromYahooData(symbol, quote, summary);
      
    } catch (error) {
      console.log(`❌ 錯誤: ${error.message}`);
    }
  }

  // 儲存元資料
  await metadataManager.save();

  // 顯示統計
  console.log('\n=== 元資料統計 ===');
  const stats = metadataManager.getStats();
  console.log(`總計: ${stats.total} 筆`);
  console.log('按市場分類:');
  Object.entries(stats.byMarket).forEach(([market, count]) => {
    console.log(`  ${market}: ${count} 筆`);
  });
  console.log('按類別分類:');
  Object.entries(stats.byCategory).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} 筆`);
  });

  // 顯示詳細資料
  console.log('\n=== 詳細資料 ===');
  const allMetadata = metadataManager.getAllStockMetadata();
  Object.entries(allMetadata).forEach(([symbol, metadata]) => {
    console.log(`\n${symbol}:`);
    console.log(`  名稱: ${metadata.name}`);
    console.log(`  市場: ${metadata.market}`);
    console.log(`  類別: ${metadata.category}`);
    console.log(`  交易所: ${metadata.exchangeName} (${metadata.exchange})`);
    console.log(`  貨幣: ${metadata.currency}`);
    console.log(`  更新時間: ${metadata.lastUpdated}`);
  });

  console.log('\n✅ 測試完成！');
}

testMetadataSystem().catch(console.error);
