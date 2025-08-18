// 測試新增非常不常見的股票
async function testAddRareStock() {
  console.log('=== 測試新增非常不常見的股票 ===\n');

  // 測試一個非常不常見的股票
  const testStock = {
    symbol: 'ZTEST',
    name: 'Test Stock for Adding',
    category: 'stock',
    market: 'US'
  };

  try {
    console.log(`準備新增股票: ${testStock.symbol} (${testStock.name})`);

    // 先檢查是否已存在
    const searchUrl = `http://localhost:3000/api/search-stocks?q=${testStock.symbol}&market=US&limit=5&yahoo=false`;
    const searchResponse = await fetch(searchUrl);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.success) {
        const existingStock = searchData.data.find(s => s.symbol === testStock.symbol);
        if (existingStock) {
          console.log(`⚠️  ${testStock.symbol} 已存在於本地資料庫`);
          return;
        }
      }
    }

    console.log(`✅ ${testStock.symbol} 不存在於本地資料庫，可以新增`);

    // 測試新增股票 API
    const response = await fetch('http://localhost:3000/api/search-stocks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stocks: [testStock],
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

        // 驗證新增後的搜尋
        console.log('\n=== 驗證新增後的搜尋 ===');
        const verifyResponse = await fetch(searchUrl);
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            const foundStock = verifyData.data.find(s => s.symbol === testStock.symbol);
            if (foundStock) {
              console.log(`✅ 成功找到 ${testStock.symbol} (來源: ${foundStock.source || 'local'})`);
            } else {
              console.log(`❌ 未找到 ${testStock.symbol}`);
            }
          }
        }
      } else {
        console.log(`❌ 新增失敗: ${data.error}`);
      }
    } else {
      console.log(`❌ HTTP 錯誤: ${response.status}`);
      const errorText = await response.text();
      console.log(`錯誤詳情: ${errorText}`);
    }

  } catch (error) {
    console.log(`❌ 測試失敗: ${error.message}`);
  }

  console.log('\n=== 測試完成 ===');
}

// 等待伺服器啟動
setTimeout(testAddRareStock, 3000);
