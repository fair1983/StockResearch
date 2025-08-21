const { MarketScanner } = require('../lib/screener/market-scanner');

async function testScreener() {
  console.log('🧪 開始測試全市場掃描系統...\n');

  try {
    const scanner = new MarketScanner();

    // 1. 測試全市場掃描
    console.log('📊 測試全市場掃描...');
    const scanResults = await scanner.scanMarkets({
      markets: ['US', 'TW'],
      limit: 10,
      mode: 'quick',
      includeBacktest: false
    });

    console.log(`✅ 掃描完成，共分析 ${scanResults.length} 支股票`);
    console.log(`📈 Buy: ${scanResults.filter(r => r.action === 'Buy').length}`);
    console.log(`⏸️  Hold: ${scanResults.filter(r => r.action === 'Hold').length}`);
    console.log(`❌ Avoid: ${scanResults.filter(r => r.action === 'Avoid').length}`);

    // 顯示前5名
    console.log('\n🏆 前5名股票:');
    scanResults.slice(0, 5).forEach((stock, index) => {
      console.log(`${index + 1}. ${stock.symbol} (${stock.market}) - ${stock.action} - 分數: ${stock.score}`);
      console.log(`   價格: $${stock.quote.price} (${stock.quote.changePct > 0 ? '+' : ''}${stock.quote.changePct}%)`);
      console.log(`   信號: ${stock.summary.signals.join(', ')}`);
      console.log(`   反轉分數: ${stock.rebound.score}`);
      console.log('');
    });

    // 2. 測試反轉雷達
    console.log('🔄 測試反轉雷達...');
    const reboundResults = await scanner.scanReboundStocks(['US', 'TW']);
    
    console.log(`✅ 反轉雷達完成，發現 ${reboundResults.length} 支潛在反轉股票`);
    
    if (reboundResults.length > 0) {
      console.log('\n🚀 反轉雷達前5名:');
      reboundResults.slice(0, 5).forEach((stock, index) => {
        console.log(`${index + 1}. ${stock.symbol} (${stock.market}) - 反轉分數: ${stock.reboundScore}`);
        console.log(`   價格: $${stock.currentPrice} (${stock.priceChangePercent > 0 ? '+' : ''}${stock.priceChangePercent}%)`);
        console.log(`   觸發規則: ${stock.rules.join(', ')}`);
        console.log('');
      });
    }

    // 3. 保存結果
    console.log('💾 保存掃描結果...');
    await scanner.saveScanResults(scanResults.filter(r => r.market === 'US'), 'US');
    await scanner.saveScanResults(scanResults.filter(r => r.market === 'TW'), 'TW');

    console.log('✅ 測試完成！');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

// 運行測試
testScreener();
