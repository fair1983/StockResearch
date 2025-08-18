// 測試 Yahoo Finance 搜尋功能
async function testYahooSearch() {
  const testQueries = [
    'NBIS',      // 測試不存在的股票
    'AAPL',      // 蘋果
    'TSLA',      // 特斯拉
    '2330',      // 台積電
    '台積電',     // 台積電中文
    'Apple',     // 蘋果英文
    'Tesla'      // 特斯拉英文
  ];

  console.log('=== 測試 Yahoo Finance 搜尋功能 ===\n');

  for (const query of testQueries) {
    try {
      console.log(`搜尋: "${query}"`);
      
      // 測試本地搜尋
      const localUrl = `http://localhost:3000/api/search-stocks?q=${encodeURIComponent(query)}&market=TW&limit=5&yahoo=false`;
      console.log('本地搜尋結果:');
      const localResponse = await fetch(localUrl);
      
      if (localResponse.ok) {
        const localData = await localResponse.json();
        if (localData.success) {
          console.log(`  ✅ 找到 ${localData.data.length} 個本地結果`);
          localData.data.forEach((stock, index) => {
            console.log(`    ${index + 1}. ${stock.symbol} - ${stock.name} (${stock.source || 'local'})`);
          });
        } else {
          console.log(`  ❌ 本地搜尋失敗: ${localData.error}`);
        }
      } else {
        console.log(`  ❌ 本地搜尋錯誤: HTTP ${localResponse.status}`);
      }

      // 測試 Yahoo Finance 搜尋
      const yahooUrl = `http://localhost:3000/api/search-stocks?q=${encodeURIComponent(query)}&market=TW&limit=5&yahoo=true`;
      console.log('Yahoo Finance 搜尋結果:');
      const yahooResponse = await fetch(yahooUrl);
      
      if (yahooResponse.ok) {
        const yahooData = await yahooResponse.json();
        if (yahooData.success) {
          console.log(`  ✅ 找到 ${yahooData.data.length} 個結果 (本地: ${yahooData.sources.local}, Yahoo: ${yahooData.sources.yahoo})`);
          yahooData.data.forEach((stock, index) => {
            const source = stock.source === 'yahoo' ? 'Yahoo' : 'Local';
            console.log(`    ${index + 1}. ${stock.symbol} - ${stock.name} (${source})`);
            if (stock.exchange) {
              console.log(`       交易所: ${stock.exchange}`);
            }
          });
        } else {
          console.log(`  ❌ Yahoo 搜尋失敗: ${yahooData.error}`);
        }
      } else {
        console.log(`  ❌ Yahoo 搜尋錯誤: HTTP ${yahooResponse.status}`);
      }
      
    } catch (error) {
      console.log(`❌ 請求失敗: ${error.message}`);
    }
    
    console.log('---');
  }

  // 測試美股搜尋
  console.log('\n=== 測試美股 Yahoo Finance 搜尋 ===\n');
  
  try {
    const usUrl = 'http://localhost:3000/api/search-stocks?q=AAPL&market=US&limit=5&yahoo=true';
    const usResponse = await fetch(usUrl);
    
    if (usResponse.ok) {
      const usData = await usResponse.json();
      if (usData.success) {
        console.log('✅ 美股 Yahoo Finance 搜尋成功:');
        console.log(`找到 ${usData.data.length} 個結果 (本地: ${usData.sources.local}, Yahoo: ${usData.sources.yahoo})`);
        usData.data.forEach((stock, index) => {
          const source = stock.source === 'yahoo' ? 'Yahoo' : 'Local';
          console.log(`  ${index + 1}. ${stock.symbol} - ${stock.name} (${source})`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ 美股搜尋失敗: ${error.message}`);
  }

  console.log('\n=== 測試完成 ===');
}

// 等待伺服器啟動
setTimeout(testYahooSearch, 3000);
