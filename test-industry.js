// 測試產業分類功能
async function testIndustryClassification() {
  console.log('🔍 測試產業分類功能...\n');

  const testStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', market: 'US' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'US' },
    { symbol: 'TSLA', name: 'Tesla Inc.', market: 'US' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', market: 'US' },
    { symbol: '1104', name: '環泥', market: 'TW' },
    { symbol: '2330', name: '台積電', market: 'TW' }
  ];

  for (const stock of testStocks) {
    try {
      console.log(`📊 測試 ${stock.symbol} (${stock.name})...`);
      
      // 測試搜尋功能
      const searchResponse = await fetch(`http://localhost:3000/api/search-stocks?q=${stock.symbol}&market=${stock.market}&limit=1`);
      const searchData = await searchResponse.json();
      
      if (searchData.success && searchData.data.length > 0) {
        const result = searchData.data[0];
        console.log(`  ✅ 搜尋成功:`);
        console.log(`     代號: ${result.symbol}`);
        console.log(`     名稱: ${result.name}`);
        console.log(`     市場: ${result.market}`);
        console.log(`     產業分類: ${result.sector || '未分類'}`);
        console.log(`     細分產業: ${result.industry || '未分類'}`);
        console.log(`     資料來源: ${result.source}`);
      } else {
        console.log(`  ❌ 搜尋失敗: ${searchData.error || '未知錯誤'}`);
      }

      // 測試基本面資料
      const fundamentalResponse = await fetch(`http://localhost:3000/api/fundamentals?symbol=${stock.symbol}&market=${stock.market}`);
      const fundamentalData = await fundamentalResponse.json();
      
      if (fundamentalData.success) {
        console.log(`  ✅ 基本面資料:`);
        console.log(`     產業分類: ${fundamentalData.data.sector || '未分類'}`);
        console.log(`     細分產業: ${fundamentalData.data.industry || '未分類'}`);
        console.log(`     市值: ${fundamentalData.data.marketCap ? (fundamentalData.data.marketCap / 1000000000).toFixed(2) + 'B' : '未知'}`);
      } else {
        console.log(`  ❌ 基本面資料獲取失敗: ${fundamentalData.error || '未知錯誤'}`);
      }

      console.log(''); // 空行分隔
      
    } catch (error) {
      console.error(`❌ 測試 ${stock.symbol} 時發生錯誤:`, error);
    }
  }

  console.log('🎯 產業分類測試完成！');
}

// 執行測試
testIndustryClassification();
