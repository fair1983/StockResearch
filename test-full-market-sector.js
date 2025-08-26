// 測試全市場掃描頁面的產業顯示功能
async function testFullMarketSectorDisplay() {
  console.log('🔍 測試全市場掃描頁面產業顯示功能...\n');

  try {
    // 執行全市場掃描
    console.log('📊 執行全市場掃描...');
    const response = await fetch('http://localhost:3000/api/full-market-screener', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'quick',
        limit: 20,
        markets: ['TW', 'US'],
        filters: {}
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ 掃描成功，共 ${result.data.results.length} 支股票\n`);
      
      // 檢查產業顯示
      const stocksWithSector = result.data.results.filter(stock => stock.sector && stock.sector !== '不能評定');
      const stocksWithoutSector = result.data.results.filter(stock => !stock.sector || stock.sector === '不能評定');
      
      console.log(`📈 有產業資訊的股票: ${stocksWithSector.length} 支`);
      console.log(`❓ 無產業資訊的股票: ${stocksWithoutSector.length} 支\n`);
      
      // 顯示前10支有產業資訊的股票
      console.log('📋 前10支有產業資訊的股票:');
      stocksWithSector.slice(0, 10).forEach((stock, index) => {
        console.log(`  ${index + 1}. ${stock.symbol} (${stock.name}) - ${stock.market}`);
        console.log(`     產業: ${stock.sector}`);
        console.log(`     細分產業: ${stock.industry || '未分類'}`);
        console.log(`     評分: ${stock.overallScore}/100`);
        console.log('');
      });
      
      // 檢查台股產業代碼
      const twStocks = stocksWithSector.filter(stock => stock.market === 'TW');
      console.log(`🏢 台股股票產業代碼統計:`);
      const sectorCounts = {};
      twStocks.forEach(stock => {
        sectorCounts[stock.sector] = (sectorCounts[stock.sector] || 0) + 1;
      });
      
      Object.entries(sectorCounts).forEach(([sector, count]) => {
        console.log(`     ${sector}: ${count} 支`);
      });
      
      // 檢查美股產業分類
      const usStocks = stocksWithSector.filter(stock => stock.market === 'US');
      console.log(`\n🇺🇸 美股股票產業分類統計:`);
      const usSectorCounts = {};
      usStocks.forEach(stock => {
        usSectorCounts[stock.sector] = (usSectorCounts[stock.sector] || 0) + 1;
      });
      
      Object.entries(usSectorCounts).forEach(([sector, count]) => {
        console.log(`     ${sector}: ${count} 支`);
      });
      
    } else {
      console.log(`❌ 掃描失敗: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ 測試錯誤:', error);
  }

  console.log('\n🎯 全市場掃描產業顯示測試完成！');
}

// 執行測試
testFullMarketSectorDisplay();
