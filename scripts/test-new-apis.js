const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 測試新的三個 API 端點...\n');

  try {
    // 1. 測試 Screener API
    console.log('📊 測試 Screener API...');
    const screenerResponse = await fetch(`${BASE_URL}/api/screener?market=ALL&limit=5`);
    const screenerData = await screenerResponse.json();
    
    if (screenerData.success) {
      console.log(`✅ Screener API 成功，返回 ${screenerData.total} 支股票`);
      console.log('前3名股票:');
      screenerData.data.slice(0, 3).forEach((stock, index) => {
        console.log(`  ${index + 1}. ${stock.symbol} (${stock.market}) - ${stock.recommendedStrategy} - 分數: ${stock.overallScore}`);
        console.log(`     價格: $${stock.currentPrice} (${stock.priceChangePercent > 0 ? '+' : ''}${(stock.priceChangePercent * 100).toFixed(2)}%)`);
        console.log(`     技術分: ${stock.technicalScore}, 基本面分: ${stock.fundamentalScore}`);
        console.log(`     預期報酬: ${(stock.expectedReturn * 100).toFixed(1)}%, 信心度: ${(stock.confidence * 100).toFixed(1)}%`);
        console.log('');
      });
    } else {
      console.log('❌ Screener API 失敗:', screenerData.error);
    }

    // 2. 測試 Rebound Radar API
    console.log('🔄 測試 Rebound Radar API...');
    const radarResponse = await fetch(`${BASE_URL}/api/rebound-radar?market=ALL&limit=5`);
    const radarData = await radarResponse.json();
    
    if (radarData.success) {
      console.log(`✅ Rebound Radar API 成功，返回 ${radarData.total} 支股票`);
      console.log('前3名反轉股票:');
      radarData.data.slice(0, 3).forEach((stock, index) => {
        console.log(`  ${index + 1}. ${stock.symbol} (${stock.market}) - 反轉分數: ${stock.score}`);
        console.log(`     價格: $${stock.price}`);
        console.log(`     觸發原因: ${stock.reason}`);
        console.log('');
      });
    } else {
      console.log('❌ Rebound Radar API 失敗:', radarData.error);
    }

    // 3. 測試 What-If API
    console.log('📈 測試 What-If API...');
    const whatIfResponse = await fetch(`${BASE_URL}/api/what-if`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'AAPL',
        market: 'US',
        buyDate: '2024-01-15',
        holdingDays: 60,
        rules: {
          takeProfitPct: 0.15,
          stopLossPct: 0.07,
          trailingPct: 0.08
        }
      })
    });
    const whatIfData = await whatIfResponse.json();
    
    if (whatIfData.success) {
      console.log('✅ What-If API 成功');
      const data = whatIfData.data;
      console.log(`股票: ${data.symbol} (${data.market})`);
      console.log(`買進日期: ${data.buyDate}, 賣出日期: ${data.sellDate}`);
      console.log(`進場價: $${data.entry.toFixed(2)}, 出場價: $${data.exit.toFixed(2)}`);
      console.log(`持有天數: ${data.days} 天`);
      console.log(`報酬率: ${(data.returnPct * 100).toFixed(2)}%`);
      console.log(`年化報酬: ${(data.annualized * 100).toFixed(2)}%`);
      console.log(`最大回撤: ${(data.maxDrawdown * 100).toFixed(2)}%`);
      console.log(`出場原因: ${data.exitReason}`);
    } else {
      console.log('❌ What-If API 失敗:', whatIfData.error);
    }

    console.log('\n🎉 所有 API 測試完成！');

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  }
}

// 運行測試
testAPI();
