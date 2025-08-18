// 使用內建的 fetch API (Node.js 18+)

async function testHistoricalRange() {
  console.log('🧪 測試長期歷史資料取得...\n');
  
  try {
    // 測試台積電的長期歷史資料
    const url = 'http://localhost:3000/api/ohlc?market=TW&symbol=2330&tf=1d';
    
    console.log('📡 請求 URL:', url);
    console.log('⏳ 正在取得資料...\n');
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.error) {
      console.error('❌ 錯誤:', result.error);
      return;
    }
    
    console.log('✅ 資料取得成功！');
    console.log(`📊 資料筆數: ${result.data.length}`);
    
    if (result.data.length > 0) {
      const firstDate = result.data[0].time;
      const lastDate = result.data[result.data.length - 1].time;
      
      console.log(`📅 資料期間: ${firstDate} 至 ${lastDate}`);
      console.log(`📈 最早日期: ${firstDate}`);
      console.log(`📉 最新日期: ${lastDate}`);
      
      // 計算年份跨度
      const firstYear = new Date(firstDate).getFullYear();
      const lastYear = new Date(lastDate).getFullYear();
      const yearSpan = lastYear - firstYear;
      
      console.log(`📅 年份跨度: ${yearSpan} 年 (${firstYear} - ${lastYear})`);
      
      // 顯示前5筆和後5筆資料
      console.log('\n📋 前5筆資料:');
      result.data.slice(0, 5).forEach((candle, index) => {
        console.log(`  ${index + 1}. ${candle.time} - 開盤: ${candle.open}, 收盤: ${candle.close}`);
      });
      
      console.log('\n📋 後5筆資料:');
      result.data.slice(-5).forEach((candle, index) => {
        console.log(`  ${index + 1}. ${candle.time} - 開盤: ${candle.open}, 收盤: ${candle.close}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 執行測試
testHistoricalRange();
