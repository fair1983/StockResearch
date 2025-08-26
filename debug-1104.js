// 診斷環泥 (1104) 評分問題

async function debugStock1104() {
  console.log('🔍 開始診斷環泥 (1104) 評分問題...\n');

  try {
    // 1. 檢查 OHLC 資料
    console.log('1️⃣ 檢查 OHLC 資料...');
    const ohlcResponse = await fetch('http://localhost:3000/api/ohlc?market=TW&symbol=1104&tf=1d');
    const ohlcData = await ohlcResponse.json();
    
    if (ohlcData.success) {
      console.log(`✅ OHLC 資料獲取成功`);
      console.log(`   資料筆數: ${ohlcData.data.length}`);
      console.log(`   資料期間: ${ohlcData.data[0]?.time} 至 ${ohlcData.data[ohlcData.data.length - 1]?.time}`);
      console.log(`   最新收盤價: ${ohlcData.data[ohlcData.data.length - 1]?.close}`);
      
      if (ohlcData.data.length < 50) {
        console.log(`⚠️  資料不足: 只有 ${ohlcData.data.length} 筆，需要至少 50 筆`);
      }
    } else {
      console.log(`❌ OHLC 資料獲取失敗: ${ohlcData.error}`);
    }

    // 2. 檢查基本面資料
    console.log('\n2️⃣ 檢查基本面資料...');
    const fundamentalResponse = await fetch('http://localhost:3000/api/fundamentals?symbol=1104&market=TW');
    const fundamentalData = await fundamentalResponse.json();
    
    if (fundamentalData.success) {
      console.log(`✅ 基本面資料獲取成功`);
      console.log(`   市值: ${fundamentalData.data.marketCap}`);
      console.log(`   本益比: ${fundamentalData.data.forwardPE}`);
      console.log(`   股價淨值比: ${fundamentalData.data.priceToBook}`);
      console.log(`   EPS: ${fundamentalData.data.epsTrailingTwelveMonths}`);
    } else {
      console.log(`❌ 基本面資料獲取失敗: ${fundamentalData.error}`);
    }

    // 3. 檢查全市場掃描結果
    console.log('\n3️⃣ 檢查全市場掃描結果...');
    const scanResponse = await fetch('http://localhost:3000/api/full-market-screener', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markets: ['TW'],
        limit: 10,
        mode: 'quick'
      })
    });
    const scanData = await scanResponse.json();
    
    if (scanData.success) {
      console.log(`✅ 全市場掃描成功`);
      console.log(`   掃描結果數量: ${scanData.data.results.length}`);
      
      // 尋找環泥 (1104)
      const stock1104 = scanData.data.results.find(stock => stock.symbol === '1104');
      if (stock1104) {
        console.log(`✅ 找到環泥 (1104) 在掃描結果中:`);
        console.log(`   綜合評分: ${stock1104.overallScore || '不能評定'}`);
        console.log(`   基本面評分: ${stock1104.fundamentalScore || '不能評定'}`);
        console.log(`   技術面評分: ${stock1104.technicalScore || '不能評定'}`);
        console.log(`   建議: ${stock1104.recommendedStrategy || '不能評定'}`);
        console.log(`   信心度: ${stock1104.confidence || '不能評定'}`);
        console.log(`   產業: ${stock1104.sector || '不能評定'}`);
      } else {
        console.log(`❌ 環泥 (1104) 未出現在掃描結果中`);
      }
    } else {
      console.log(`❌ 全市場掃描失敗: ${scanData.error}`);
    }

    // 4. 檢查股票搜尋
    console.log('\n4️⃣ 檢查股票搜尋...');
    const searchResponse = await fetch('http://localhost:3000/api/search-stocks?q=1104&market=TW&limit=5');
    const searchData = await searchResponse.json();
    
    if (searchData.success) {
      console.log(`✅ 股票搜尋成功`);
      console.log(`   搜尋結果數量: ${searchData.data.length}`);
      if (searchData.data.length > 0) {
        console.log(`   搜尋結果:`, searchData.data);
      }
    } else {
      console.log(`❌ 股票搜尋失敗: ${searchData.error}`);
    }

  } catch (error) {
    console.error('❌ 診斷過程發生錯誤:', error);
  }
}

// 執行診斷
debugStock1104();
