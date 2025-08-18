const fs = require('fs');
const path = require('path');

// 讀取 stocks.json 檔案
const stocksFilePath = path.join(__dirname, '..', 'data', 'stocks.json');
const stocksData = JSON.parse(fs.readFileSync(stocksFilePath, 'utf8'));

// 市場判斷函數（與 API 邏輯一致）
function determineMarket(symbol) {
  // 台股 ETF 代碼（5位數字）
  if (/^\d{5}$/.test(symbol)) {
    return 'TW';
  }
  
  // 台股股票代碼（4位數字）
  if (/^\d{4}$/.test(symbol)) {
    return 'TW';
  }
  
  // 美股代碼（英數1-7位）
  if (/^[A-Z][A-Z0-9.]{0,6}$/.test(symbol)) {
    return 'US';
  }
  
  // 預設為台股
  return 'TW';
}

// 類型判斷函數
function determineCategory(symbol, name = '') {
  const nm = name.toLowerCase();
  
  // 台股 ETF 代碼（5位數字）
  if (/^\d{5}$/.test(symbol)) {
    return 'etf';
  }
  
  // 台股股票代碼（4位數字）
  if (/^\d{4}$/.test(symbol)) {
    return 'stock';
  }
  
  // 美股代碼判斷
  if (/^[A-Z][A-Z0-9.]{0,6}$/.test(symbol)) {
    // 根據名稱判斷
    if (nm.includes('etf') || nm.includes('fund') || nm.includes('trust')) {
      return 'etf';
    }
    return 'stock';
  }
  
  return 'stock';
}

console.log('開始更新股票市場別分類...');

let updatedCount = 0;
let totalCount = 0;

// 更新每個市場的股票
Object.keys(stocksData.stocks).forEach(marketKey => {
  const marketData = stocksData.stocks[marketKey];
  
  // 更新股票
  if (marketData.stocks) {
    marketData.stocks.forEach(stock => {
      totalCount++;
      const correctMarket = determineMarket(stock.symbol);
      const correctCategory = determineCategory(stock.symbol, stock.name);
      
      if (stock.market !== correctMarket || stock.category !== correctCategory) {
        const oldMarket = stock.market;
        const oldCategory = stock.category;
        
        stock.market = correctMarket;
        stock.category = correctCategory;
        
        console.log(`更新: ${stock.symbol} ${stock.name}`);
        console.log(`  市場: ${oldMarket} → ${correctMarket}`);
        console.log(`  類別: ${oldCategory} → ${correctCategory}`);
        console.log('');
        
        updatedCount++;
      }
    });
  }
  
  // 更新 ETF
  if (marketData.etfs) {
    marketData.etfs.forEach(etf => {
      totalCount++;
      const correctMarket = determineMarket(etf.symbol);
      const correctCategory = determineCategory(etf.symbol, etf.name);
      
      if (etf.market !== correctMarket || etf.category !== correctCategory) {
        const oldMarket = etf.market;
        const oldCategory = etf.category;
        
        etf.market = correctMarket;
        etf.category = correctCategory;
        
        console.log(`更新: ${etf.symbol} ${etf.name}`);
        console.log(`  市場: ${oldMarket} → ${correctMarket}`);
        console.log(`  類別: ${oldCategory} → ${correctCategory}`);
        console.log('');
        
        updatedCount++;
      }
    });
  }
});

// 重新組織資料結構（將股票移動到正確的市場）
const reorganizedStocks = {
  TW: { stocks: [], etfs: [] },
  US: { stocks: [], etfs: [] }
};

Object.keys(stocksData.stocks).forEach(marketKey => {
  const marketData = stocksData.stocks[marketKey];
  
  // 重新分類股票
  if (marketData.stocks) {
    marketData.stocks.forEach(stock => {
      const targetMarket = stock.market;
      if (!reorganizedStocks[targetMarket]) {
        reorganizedStocks[targetMarket] = { stocks: [], etfs: [] };
      }
      
      if (stock.category === 'etf') {
        reorganizedStocks[targetMarket].etfs.push(stock);
      } else {
        reorganizedStocks[targetMarket].stocks.push(stock);
      }
    });
  }
  
  // 重新分類 ETF
  if (marketData.etfs) {
    marketData.etfs.forEach(etf => {
      const targetMarket = etf.market;
      if (!reorganizedStocks[targetMarket]) {
        reorganizedStocks[targetMarket] = { stocks: [], etfs: [] };
      }
      
      if (etf.category === 'etf') {
        reorganizedStocks[targetMarket].etfs.push(etf);
      } else {
        reorganizedStocks[targetMarket].stocks.push(etf);
      }
    });
  }
});

// 去重並排序
Object.keys(reorganizedStocks).forEach(market => {
  const marketData = reorganizedStocks[market];
  
  // 股票去重
  const stockMap = new Map();
  marketData.stocks.forEach(stock => {
    stockMap.set(stock.symbol, stock);
  });
  marketData.stocks = Array.from(stockMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
  
  // ETF 去重
  const etfMap = new Map();
  marketData.etfs.forEach(etf => {
    etfMap.set(etf.symbol, etf);
  });
  marketData.etfs = Array.from(etfMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
});

// 更新資料結構
stocksData.stocks = reorganizedStocks;
stocksData.lastUpdated = new Date().toISOString();

// 寫回檔案
fs.writeFileSync(stocksFilePath, JSON.stringify(stocksData, null, 2), 'utf8');

console.log('更新完成！');
console.log(`總計處理: ${totalCount} 筆資料`);
console.log(`更新: ${updatedCount} 筆資料`);

// 顯示統計
console.log('\n最終統計:');
Object.keys(stocksData.stocks).forEach(market => {
  const marketData = stocksData.stocks[market];
  console.log(`${market} 市場:`);
  console.log(`  股票: ${marketData.stocks.length} 筆`);
  console.log(`  ETF: ${marketData.etfs.length} 筆`);
});

console.log('\n檔案已更新:', stocksFilePath);
