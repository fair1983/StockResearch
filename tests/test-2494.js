async function test2494() {
  try {
    console.log('測試國碩（2494）資料載入...');
    
    const url = 'http://localhost:3000/api/ohlc?market=TW&symbol=2494&tf=1d';
    console.log('請求 URL:', url);
    
    const response = await fetch(url);
    console.log('回應狀態:', response.status);
    console.log('回應標頭:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('錯誤回應:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('資料類型:', typeof data);
    console.log('是否有 data 屬性:', 'data' in data);
    
    if (data.data && Array.isArray(data.data)) {
      console.log('資料筆數:', data.data.length);
      if (data.data.length > 0) {
        console.log('第一筆資料:', data.data[0]);
        console.log('最後一筆資料:', data.data[data.data.length - 1]);
      }
    } else {
      console.log('完整回應:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('測試失敗:', error.message);
  }
}

// 等待伺服器啟動
setTimeout(test2494, 3000);
