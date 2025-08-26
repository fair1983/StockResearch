// 簡單的 API 測試
async function testSimpleAPI() {
  console.log('🔍 測試簡單 API...\n');

  try {
    // 測試基本連接
    console.log('📊 測試基本連接...');
    const response = await fetch('http://localhost:3000/api/full-market-screener?mode=quick&limit=5&markets=TW');
    
    console.log('狀態碼:', response.status);
    console.log('狀態文字:', response.statusText);
    
    if (response.ok) {
      const text = await response.text();
      console.log('回應內容:', text);
      
      if (text) {
        const result = JSON.parse(text);
        console.log('解析結果:', result);
      }
    } else {
      console.log('❌ API 回應錯誤');
    }
    
  } catch (error) {
    console.error('❌ 測試錯誤:', error);
  }

  console.log('\n🎯 簡單 API 測試完成！');
}

// 執行測試
testSimpleAPI();
