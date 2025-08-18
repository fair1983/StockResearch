// 測試市場和類型判斷功能
async function testMarketDetection() {
  console.log('=== 測試市場和類型判斷功能 ===\n');

  const testQueries = [
    'NBIS',      // 美股
    'AAPL',      // 美股
    '2330',      // 台股
    '0050',      // 台股 ETF
    'TSLA',      // 美股
    'BTC-USD',   // 加密貨幣
    'EUR-USD',   // 貨幣
    'SPY',       // 美股 ETF
    'AAPL250815C00225000', // 期權
    'VIX',       // 指數
    'QQQ',       // ETF
    'TQQQ',      // ETF
    'SOXL',      // ETF
    'ARKK'       // ETF
  ];

  console.log('測試各種股票類型的市場判斷:\n');

  for (const query of testQueries) {
    try {
      console.log(`搜尋: "${query}"`);
      
      // 測試 Yahoo Finance 搜尋
      const yahooUrl = `http://localhost:3000/api/search-stocks?q=${encodeURIComponent(query)}&limit=3&yahoo=true`;
      const yahooResponse = await fetch(yahooUrl);
      
      if (yahooResponse.ok) {
        const yahooData = await yahooResponse.json();
        if (yahooData.success && yahooData.data.length > 0) {
          console.log(`  ✅ 找到 ${yahooData.data.length} 個結果:`);
          yahooData.data.forEach((stock, index) => {
            const marketDisplay = getMarketDisplay(stock.market);
            const categoryDisplay = getCategoryDisplay(stock.category);
            const source = stock.source === 'yahoo' ? 'Yahoo' : 'Local';
            
            console.log(`    ${index + 1}. ${stock.symbol} - ${stock.name}`);
            console.log(`       市場: ${marketDisplay} | 類型: ${categoryDisplay} | 來源: ${source}`);
            if (stock.exchange) {
              console.log(`       交易所: ${stock.exchange}`);
            }
          });
        } else {
          console.log(`  ⚠️  未找到結果`);
        }
      } else {
        console.log(`  ❌ 搜尋失敗: HTTP ${yahooResponse.status}`);
      }
      
    } catch (error) {
      console.log(`❌ 請求失敗: ${error.message}`);
    }
    
    console.log('---');
  }

  // 測試新增不同類型的股票
  console.log('\n=== 測試新增不同類型的股票 ===\n');
  
  const testStocks = [
    {
      symbol: 'NBIS',
      name: 'Nebius Group N.V.',
      category: 'stock',
      market: 'US'
    },
    {
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF Trust',
      category: 'etf',
      market: 'US'
    },
    {
      symbol: 'BTC-USD',
      name: 'Bitcoin USD',
      category: 'crypto',
      market: 'US'
    },
    {
      symbol: 'AAPL250815C00225000',
      name: 'AAPL Aug 2025 225.000 call',
      category: 'option',
      market: 'US'
    }
  ];

  try {
    console.log('準備新增測試股票:');
    testStocks.forEach(stock => {
      console.log(`  - ${stock.symbol} (${stock.name}) - ${stock.category} - ${stock.market}`);
    });

    const response = await fetch('http://localhost:3000/api/search-stocks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stocks: testStocks
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
            console.log(`  ✅ ${stock.symbol} - ${stock.name} (${stock.category}) -> ${stock.market}`);
          });
        }
        
        if (data.skipped && data.skipped.length > 0) {
          console.log('\n跳過的股票:');
          data.skipped.forEach(stock => {
            console.log(`  ⏭️  ${stock.symbol} - ${stock.reason} (${stock.market})`);
          });
        }
      } else {
        console.log(`❌ 新增失敗: ${data.error}`);
      }
    } else {
      console.log(`❌ HTTP 錯誤: ${response.status}`);
    }

  } catch (error) {
    console.log(`❌ 測試失敗: ${error.message}`);
  }

  console.log('\n=== 測試完成 ===');
}

// 輔助函數
function getMarketDisplay(market) {
  switch (market) {
    case 'TW': return '台股';
    case 'US': return '美股';
    case 'HK': return '港股';
    case 'JP': return '日股';
    case 'EU': return '歐股';
    case 'ASIA': return '亞股';
    default: return market;
  }
}

function getCategoryDisplay(category) {
  switch (category) {
    case 'stock': return '股票';
    case 'etf': return 'ETF';
    case 'index': return '指數';
    case 'crypto': return '加密貨幣';
    case 'currency': return '貨幣';
    case 'future': return '期貨';
    case 'option': return '期權';
    case 'mutualfund': return '基金';
    default: return category;
  }
}

// 等待伺服器啟動
setTimeout(testMarketDetection, 3000);
