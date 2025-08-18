// 測試新增股票到本地資料庫功能
async function testAddStocks() {
  console.log('=== 測試新增股票到本地資料庫功能 ===\n');

  // 測試資料
  const testStocks = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      category: 'stock',
      market: 'US'
    },
    {
      symbol: 'TSLA',
      name: 'Tesla, Inc.',
      category: 'stock',
      market: 'US'
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      category: 'stock',
      market: 'US'
    }
  ];

  try {
    console.log('準備新增以下股票:');
    testStocks.forEach(stock => {
      console.log(`  - ${stock.symbol} (${stock.name})`);
    });

    // 測試新增股票 API
    const response = await fetch('http://localhost:3000/api/search-stocks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stocks: testStocks,
        market: 'US'
      }),
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        console.log('\n✅ 新增股票成功!');
        console.log(`新增了 ${data.totalAdded} 支股票`);
        console.log(`跳過了 ${data.totalSkipped} 支已存在的股票`);
        
        if (data.added && data.added.length > 0) {
          console.log('\n新增的股票:');
          data.added.forEach(stock => {
            console.log(`  ✅ ${stock.symbol} - ${stock.name}`);
          });
        }
        
        if (data.skipped && data.skipped.length > 0) {
          console.log('\n跳過的股票:');
          data.skipped.forEach(stock => {
            console.log(`  ⏭️  ${stock.symbol} - ${stock.reason}`);
          });
        }
      } else {
        console.log(`❌ 新增失敗: ${data.error}`);
      }
    } else {
      console.log(`❌ HTTP 錯誤: ${response.status}`);
    }

    // 測試搜尋新增的股票
    console.log('\n=== 測試搜尋新增的股票 ===\n');
    
    for (const stock of testStocks) {
      try {
        const searchUrl = `http://localhost:3000/api/search-stocks?q=${stock.symbol}&market=US&limit=5&yahoo=false`;
        const searchResponse = await fetch(searchUrl);
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.success) {
            const foundStock = searchData.data.find(s => s.symbol === stock.symbol);
            if (foundStock) {
              console.log(`✅ 成功找到 ${stock.symbol} (來源: ${foundStock.source || 'local'})`);
            } else {
              console.log(`❌ 未找到 ${stock.symbol}`);
            }
          }
        }
      } catch (error) {
        console.log(`❌ 搜尋 ${stock.symbol} 失敗: ${error.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ 測試失敗: ${error.message}`);
  }

  console.log('\n=== 測試完成 ===');
}

// 等待伺服器啟動
setTimeout(testAddStocks, 3000);
