// 修正 stocks.json 中的錯誤市場分類
const fs = require('fs');
const path = require('path');

// 市場判斷函數（與 API 中的邏輯一致）
function determineMarket(exchange, symbol) {
  // 台股市場
  if (exchange === 'TWSE' || exchange === 'TPEX') {
    return 'TW';
  }
  
  // 美股市場
  if (exchange === 'NMS' || exchange === 'NYQ' || exchange === 'NGM' || 
      exchange === 'PCX' || exchange === 'OPR' || exchange === 'NEO') {
    return 'US';
  }
  
  // 港股市場
  if (exchange === 'HKG') {
    return 'HK';
  }
  
  // 日股市場
  if (exchange === 'JPX' || exchange === 'TSE') {
    return 'JP';
  }
  
  // 歐股市場
  if (exchange === 'LSE' || exchange === 'GER' || exchange === 'FRA' || 
      exchange === 'SWX' || exchange === 'AMS') {
    return 'EU';
  }
  
  // 其他亞洲市場
  if (exchange === 'SHH' || exchange === 'SHE' || exchange === 'SAU' || 
      exchange === 'SAO' || exchange === 'BSE' || exchange === 'NSE') {
    return 'ASIA';
  }
  
  // 根據股票代碼判斷（備用方案）
  if (/^\d{4}$/.test(symbol)) {
    return 'TW'; // 4位數字通常是台股
  }
  
  if (/^[A-Z]{1,5}$/.test(symbol)) {
    return 'US'; // 1-5位大寫字母通常是美股
  }
  
  // 預設為美股
  return 'US';
}

// 類型判斷函數
function determineCategory(quoteType, exchange, symbol) {
  // 根據 Yahoo Finance 的 quoteType 判斷
  switch (quoteType) {
    case 'EQUITY':
      return 'stock';
    case 'ETF':
      return 'etf';
    case 'INDEX':
      return 'index';
    case 'CRYPTOCURRENCY':
      return 'crypto';
    case 'CURRENCY':
      return 'currency';
    case 'FUTURE':
      return 'future';
    case 'OPTION':
      return 'option';
    case 'MUTUALFUND':
      return 'mutualfund';
    default:
      break;
  }
  
  // 根據交易所判斷
  if (exchange === 'OPR') {
    return 'option'; // 期權
  }
  
  // 根據股票代碼模式判斷
  if (symbol.includes('ETF') || symbol.includes('ETN') || symbol.includes('ETP')) {
    return 'etf';
  }
  
  if (symbol.includes('FUND') || symbol.includes('MUTUAL')) {
    return 'mutualfund';
  }
  
  if (symbol.includes('CRYPTO') || symbol.includes('BTC') || symbol.includes('ETH')) {
    return 'crypto';
  }
  
  // 預設為股票
  return 'stock';
}

function fixStockData() {
  console.log('=== 修正 stocks.json 中的錯誤市場分類 ===\n');
  
  const stocksFilePath = path.join(process.cwd(), 'data', 'stocks.json');
  const stocksData = JSON.parse(fs.readFileSync(stocksFilePath, 'utf8'));
  
  const corrections = [];
  const movedStocks = [];
  
  // 檢查所有市場的股票
  Object.keys(stocksData.stocks).forEach(marketKey => {
    const marketData = stocksData.stocks[marketKey];
    
    // 檢查股票
    if (marketData.stocks) {
      const stocksToMove = [];
      const stocksToKeep = [];
      
      marketData.stocks.forEach(stock => {
        // 根據股票代碼判斷正確的市場
        const correctMarket = determineMarket('', stock.symbol);
        const correctCategory = determineCategory('', '', stock.symbol);
        
        if (correctMarket !== marketKey || correctCategory !== stock.category) {
          corrections.push({
            symbol: stock.symbol,
            name: stock.name,
            oldMarket: marketKey,
            oldCategory: stock.category,
            newMarket: correctMarket,
            newCategory: correctCategory
          });
          
          stocksToMove.push({
            ...stock,
            market: correctMarket,
            category: correctCategory
          });
        } else {
          stocksToKeep.push(stock);
        }
      });
      
      // 更新當前市場的股票列表
      marketData.stocks = stocksToKeep;
      
      // 記錄需要移動的股票
      movedStocks.push(...stocksToMove);
    }
    
    // 檢查 ETF
    if (marketData.etfs) {
      const etfsToMove = [];
      const etfsToKeep = [];
      
      marketData.etfs.forEach(etf => {
        const correctMarket = determineMarket('', etf.symbol);
        const correctCategory = determineCategory('', '', etf.symbol);
        
        if (correctMarket !== marketKey || correctCategory !== etf.category) {
          corrections.push({
            symbol: etf.symbol,
            name: etf.name,
            oldMarket: marketKey,
            oldCategory: etf.category,
            newMarket: correctMarket,
            newCategory: correctCategory
          });
          
          etfsToMove.push({
            ...etf,
            market: correctMarket,
            category: correctCategory
          });
        } else {
          etfsToKeep.push(etf);
        }
      });
      
      // 更新當前市場的 ETF 列表
      marketData.etfs = etfsToKeep;
      
      // 記錄需要移動的 ETF
      movedStocks.push(...etfsToMove);
    }
  });
  
  // 將移動的股票放到正確的市場
  movedStocks.forEach(stock => {
    const targetMarket = stock.market;
    
    // 確保目標市場存在
    if (!stocksData.stocks[targetMarket]) {
      stocksData.stocks[targetMarket] = { stocks: [], etfs: [] };
    }
    
    // 根據類型決定放到哪個陣列
    if (stock.category === 'etf') {
      if (!stocksData.stocks[targetMarket].etfs) {
        stocksData.stocks[targetMarket].etfs = [];
      }
      stocksData.stocks[targetMarket].etfs.push(stock);
    } else {
      if (!stocksData.stocks[targetMarket].stocks) {
        stocksData.stocks[targetMarket].stocks = [];
      }
      stocksData.stocks[targetMarket].stocks.push(stock);
    }
  });
  
  // 顯示修正結果
  if (corrections.length > 0) {
    console.log(`發現 ${corrections.length} 個需要修正的項目:\n`);
    
    corrections.forEach(correction => {
      console.log(`  ${correction.symbol} - ${correction.name}`);
      console.log(`    從: ${correction.oldMarket} (${correction.oldCategory})`);
      console.log(`    到: ${correction.newMarket} (${correction.newCategory})`);
      console.log('');
    });
    
    // 寫回檔案
    fs.writeFileSync(stocksFilePath, JSON.stringify(stocksData, null, 2), 'utf8');
    console.log('✅ 已修正 stocks.json 檔案');
  } else {
    console.log('✅ 沒有發現需要修正的項目');
  }
  
  // 顯示各市場統計
  console.log('\n=== 各市場統計 ===');
  Object.keys(stocksData.stocks).forEach(marketKey => {
    const marketData = stocksData.stocks[marketKey];
    const stockCount = marketData.stocks ? marketData.stocks.length : 0;
    const etfCount = marketData.etfs ? marketData.etfs.length : 0;
    
    console.log(`${marketKey}: ${stockCount} 支股票, ${etfCount} 支 ETF`);
  });
  
  console.log('\n=== 修正完成 ===');
}

// 執行修正
try {
  fixStockData();
} catch (error) {
  console.error('修正過程中發生錯誤:', error);
  process.exit(1);
}
