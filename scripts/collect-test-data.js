#!/usr/bin/env node

const yahooFinance = require('yahoo-finance2').default;
const fs = require('fs');
const path = require('path');

/**
 * 收集測試資料
 */
async function collectTestData() {
  const testStocks = [
    { symbol: '2330.TW', name: '台積電', market: 'TW' },
    { symbol: 'TSLA', name: '特斯拉', market: 'US' }
  ];

  const results = [];

  console.log('🚀 開始收集測試資料...');
  console.log('='.repeat(50));

  for (const stock of testStocks) {
    console.log(`📊 收集 ${stock.name} (${stock.symbol}) 資料...`);
    
    try {
      // 收集最近 3 個月的日K資料
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const data = await yahooFinance.historical(stock.symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });

      // 轉換資料格式
      const formattedData = data.map(item => ({
        time: item.date.toISOString().split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));

      const result = {
        symbol: stock.symbol,
        market: stock.market,
        name: stock.name,
        data: formattedData,
        success: true,
        count: formattedData.length
      };

      results.push(result);
      console.log(`✅ ${stock.name} 資料收集完成 (${formattedData.length} 筆)`);
      
    } catch (error) {
      console.error(`❌ ${stock.name} 資料收集失敗:`, error.message);
      
      results.push({
        symbol: stock.symbol,
        market: stock.market,
        name: stock.name,
        data: [],
        success: false,
        error: error.message
      });
    }
  }

  // 儲存測試資料
  await saveTestData(results);

  return results;
}

/**
 * 儲存測試資料
 */
async function saveTestData(results) {
  const testDataDir = path.join(process.cwd(), 'test-data');
  
  // 確保目錄存在
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // 儲存完整測試資料
  const testDataPath = path.join(testDataDir, 'test-stocks-data.json');
  fs.writeFileSync(testDataPath, JSON.stringify(results, null, 2));

  // 儲存個別股票資料
  for (const result of results) {
    if (result.success) {
      const stockDir = path.join(testDataDir, result.market);
      if (!fs.existsSync(stockDir)) {
        fs.mkdirSync(stockDir, { recursive: true });
      }

      // 儲存原始資料
      const dataPath = path.join(stockDir, `${result.symbol.replace('.', '_')}_data.json`);
      fs.writeFileSync(dataPath, JSON.stringify(result.data, null, 2));
    }
  }

  console.log(`💾 測試資料已儲存到: ${testDataDir}`);
}

/**
 * 顯示收集結果摘要
 */
function displaySummary(results) {
  console.log('\n📈 收集結果摘要');
  console.log('='.repeat(50));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ 成功: ${successful.length} 支股票`);
  console.log(`❌ 失敗: ${failed.length} 支股票`);

  for (const result of successful) {
    console.log(`  - ${result.symbol}: ${result.count} 筆資料`);
  }

  for (const result of failed) {
    console.log(`  - ${result.symbol}: ${result.error}`);
  }

  console.log('\n📁 檔案位置:');
  console.log('  - 完整資料: test-data/test-stocks-data.json');
  console.log('  - 個別股票: test-data/{market}/{symbol}_data.json');
}

/**
 * 主程式
 */
async function main() {
  try {
    const results = await collectTestData();
    displaySummary(results);
    
    console.log('\n🎉 測試資料收集完成！');
  } catch (error) {
    console.error('❌ 收集測試資料時發生錯誤:', error);
    process.exit(1);
  }
}

// 執行主程式
main();
