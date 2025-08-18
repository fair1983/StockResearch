const fs = require('fs');
const path = require('path');

// 讀取 stocks.json 檔案
const stocksFilePath = path.join(__dirname, '..', 'data', 'stocks.json');
const stocksData = JSON.parse(fs.readFileSync(stocksFilePath, 'utf8'));

console.log('開始修正台股ETF分類...');

let fixedCount = 0;

// 修正台股市場的股票分類
if (stocksData.stocks.TW && stocksData.stocks.TW.stocks) {
  stocksData.stocks.TW.stocks = stocksData.stocks.TW.stocks.map(stock => {
    // 5位數字代碼應該是ETF
    if (/^\d{5}$/.test(stock.symbol)) {
      if (stock.category !== 'etf') {
        console.log(`修正: ${stock.symbol} ${stock.name} (stock → etf)`);
        fixedCount++;
        return { ...stock, category: 'etf' };
      }
    }
    return stock;
  });
}

// 將修正後的ETF移動到etfs陣列
const correctedStocks = [];
const correctedEtfs = [];

if (stocksData.stocks.TW && stocksData.stocks.TW.stocks) {
  stocksData.stocks.TW.stocks.forEach(item => {
    if (item.category === 'etf') {
      correctedEtfs.push(item);
    } else {
      correctedStocks.push(item);
    }
  });
}

// 更新資料結構
stocksData.stocks.TW.stocks = correctedStocks;
stocksData.stocks.TW.etfs = correctedEtfs;

// 更新時間戳記
stocksData.lastUpdated = new Date().toISOString();

// 寫回檔案
fs.writeFileSync(stocksFilePath, JSON.stringify(stocksData, null, 2), 'utf8');

console.log('修正完成！');
console.log(`修正: ${fixedCount} 筆資料`);

// 顯示統計
console.log('\n最終統計:');
Object.keys(stocksData.stocks).forEach(market => {
  const marketData = stocksData.stocks[market];
  console.log(`${market} 市場:`);
  console.log(`  股票: ${marketData.stocks.length} 筆`);
  console.log(`  ETF: ${marketData.etfs.length} 筆`);
  if (marketData.options) {
    console.log(`  期權: ${marketData.options.length} 筆`);
  }
});

console.log('\n檔案已更新:', stocksFilePath);
