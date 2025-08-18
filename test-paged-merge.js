// 使用內建的 fetch API (Node.js 18+)

async function testPagedMerge() {
  console.log('🧪 測試分頁合併功能...\n');
  
  try {
    // 第一頁：取得初始資料
    console.log('📄 第1頁：取得初始資料');
    const url1 = 'http://localhost:3000/api/ohlc/paged?market=TW&symbol=2330&tf=1d&page=1&pageSize=500';
    
    const response1 = await fetch(url1);
    const result1 = await response1.json();
    
    if (result1.error) {
      console.error('❌ 錯誤:', result1.error);
      return;
    }
    
    console.log(`✅ 第1頁成功！`);
    console.log(`📊 資料筆數: ${result1.data.length}`);
    console.log(`📅 資料期間: ${result1.pageInfo.earliestDate} 至 ${result1.pageInfo.latestDate}`);
    console.log(`🔄 新增筆數: ${result1.pageInfo.newCount}`);
    console.log(`📄 當前頁碼: ${result1.page} / ${result1.pageInfo.totalPages}`);
    console.log(`➡️  還有更多: ${result1.pageInfo.hasMore}\n`);
    
    // 第二頁：合併到現有資料
    console.log('📄 第2頁：合併到現有資料');
    const existingDataStr = encodeURIComponent(JSON.stringify(result1.data));
    const url2 = `http://localhost:3000/api/ohlc/paged?market=TW&symbol=2330&tf=1d&page=2&pageSize=500&existingData=${existingDataStr}`;
    
    const response2 = await fetch(url2);
    const result2 = await response2.json();
    
    if (result2.error) {
      console.error('❌ 錯誤:', result2.error);
      return;
    }
    
    console.log(`✅ 第2頁合併成功！`);
    console.log(`📊 合併後資料筆數: ${result2.data.length}`);
    console.log(`📅 合併後資料期間: ${result2.pageInfo.earliestDate} 至 ${result2.pageInfo.latestDate}`);
    console.log(`🔄 新增筆數: ${result2.pageInfo.newCount}`);
    console.log(`🔄 覆蓋筆數: ${result2.pageInfo.mergedCount}`);
    console.log(`📄 當前頁碼: ${result2.page} / ${result2.pageInfo.totalPages}`);
    console.log(`➡️  還有更多: ${result2.pageInfo.hasMore}\n`);
    
    // 第三頁：繼續合併
    console.log('📄 第3頁：繼續合併');
    const existingDataStr2 = encodeURIComponent(JSON.stringify(result2.data));
    const url3 = `http://localhost:3000/api/ohlc/paged?market=TW&symbol=2330&tf=1d&page=3&pageSize=500&existingData=${existingDataStr2}`;
    
    const response3 = await fetch(url3);
    const result3 = await response3.json();
    
    if (result3.error) {
      console.error('❌ 錯誤:', result3.error);
      return;
    }
    
    console.log(`✅ 第3頁合併成功！`);
    console.log(`📊 合併後資料筆數: ${result3.data.length}`);
    console.log(`📅 合併後資料期間: ${result3.pageInfo.earliestDate} 至 ${result3.pageInfo.latestDate}`);
    console.log(`🔄 新增筆數: ${result3.pageInfo.newCount}`);
    console.log(`🔄 覆蓋筆數: ${result3.pageInfo.mergedCount}`);
    console.log(`📄 當前頁碼: ${result3.page} / ${result3.pageInfo.totalPages}`);
    console.log(`➡️  還有更多: ${result3.pageInfo.hasMore}\n`);
    
    // 顯示資料統計
    console.log('📈 資料統計:');
    console.log(`  第1頁: ${result1.data.length} 筆`);
    console.log(`  第2頁: +${result2.pageInfo.newCount} 筆新資料, ${result2.pageInfo.mergedCount} 筆覆蓋`);
    console.log(`  第3頁: +${result3.pageInfo.newCount} 筆新資料, ${result3.pageInfo.mergedCount} 筆覆蓋`);
    console.log(`  總計: ${result3.data.length} 筆資料`);
    
    // 檢查是否有重複
    const timeSet = new Set();
    result3.data.forEach(candle => timeSet.add(candle.time));
    console.log(`  去重後: ${timeSet.size} 筆資料`);
    console.log(`  重複檢查: ${result3.data.length === timeSet.size ? '✅ 無重複' : '❌ 有重複'}`);
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 執行測試
testPagedMerge();
