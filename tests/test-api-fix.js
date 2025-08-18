async function testAPI() {
  console.log('🧪 測試修復後的 API...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // 測試案例
  const testCases = [
    { market: 'TW', symbol: '2330', name: '台積電' },
    { market: 'TW', symbol: '00878', name: '國泰永續高股息' },
    { market: 'US', symbol: 'AAPL', name: 'Apple' },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n=== 測試 ${testCase.name} (${testCase.market}:${testCase.symbol}) ===`);
    
    try {
      // 測試 OHLC API
      const ohlcUrl = `${baseUrl}/api/ohlc?market=${testCase.market}&symbol=${testCase.symbol}&tf=1d`;
      console.log(`📊 測試 OHLC API: ${ohlcUrl}`);
      
      const ohlcResponse = await fetch(ohlcUrl);
      console.log(`  狀態碼: ${ohlcResponse.status}`);
      
      if (ohlcResponse.ok) {
        const ohlcData = await ohlcResponse.json();
        console.log(`  ✅ 成功取得資料`);
        console.log(`  資料筆數: ${ohlcData.data?.length || 0}`);
        console.log(`  資料來源: ${ohlcData.metadata?.dataSource || 'Unknown'}`);
        console.log(`  執行時間: ${ohlcData.metadata?.executionTime || 'Unknown'}`);
        
        if (ohlcData.data && ohlcData.data.length > 0) {
          const firstCandle = ohlcData.data[0];
          const lastCandle = ohlcData.data[ohlcData.data.length - 1];
          console.log(`  最早日期: ${firstCandle.time}`);
          console.log(`  最新日期: ${lastCandle.time}`);
          console.log(`  最新收盤價: ${lastCandle.close}`);
        }
      } else {
        const errorText = await ohlcResponse.text();
        console.log(`  ❌ 失敗: ${errorText}`);
      }
      
      // 測試搜尋 API
      const searchUrl = `${baseUrl}/api/search-stocks?q=${testCase.symbol}&yahoo=true`;
      console.log(`\n🔍 測試搜尋 API: ${searchUrl}`);
      
      const searchResponse = await fetch(searchUrl);
      console.log(`  狀態碼: ${searchResponse.status}`);
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log(`  ✅ 成功搜尋`);
        console.log(`  結果數量: ${searchData.data?.length || 0}`);
        
        if (searchData.data && searchData.data.length > 0) {
          const result = searchData.data[0];
          console.log(`  找到: ${result.name} (${result.market} | ${result.category})`);
        }
      } else {
        const errorText = await searchResponse.text();
        console.log(`  ❌ 失敗: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`  ❌ 錯誤: ${error.message}`);
    }
  }
  
  console.log('\n✅ API 測試完成！');
}

// 等待伺服器啟動
setTimeout(() => {
  testAPI().catch(console.error);
}, 3000);
