const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 測試配置
const testConfig = {
  // 單一股票測試
  singleStock: {
    market: 'TW',
    symbol: '2330',
    intervals: ['1d', '1w', '1mo'],
    startDate: '2020-01-01',
    endDate: '2024-12-31'
  },
  
  // 批次測試
  batchStocks: {
    symbols: [
      { market: 'TW', symbol: '2330' }, // 台積電
      { market: 'TW', symbol: '2454' }, // 聯發科
      { market: 'US', symbol: 'AAPL' }, // 蘋果
      { market: 'US', symbol: 'GOOGL' } // Google
    ],
    intervals: ['1d', '1w'],
    startDate: '2023-01-01',
    endDate: '2024-12-31'
  }
};

async function testSingleStockCollection() {
  console.log('🧪 測試單一股票歷史資料收集...');
  
  try {
    const response = await axios.post(`${BASE_URL}/historical/collect`, testConfig.singleStock);
    
    if (response.data.success) {
      console.log('✅ 單一股票收集成功');
      console.log('📊 結果摘要:', response.data.data.summary);
      
      response.data.data.results.forEach(result => {
        console.log(`  ${result.interval}: ${result.success ? '✅' : '❌'} ${result.recordsCount} 筆資料 (${result.dateRange})`);
      });
    } else {
      console.log('❌ 單一股票收集失敗:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 單一股票收集錯誤:', error.response?.data?.message || error.message);
  }
}

async function testBatchCollection() {
  console.log('\n🧪 測試批次股票歷史資料收集...');
  
  try {
    const response = await axios.post(`${BASE_URL}/historical/batch`, testConfig.batchStocks);
    
    if (response.data.success) {
      console.log('✅ 批次收集成功');
      console.log('📊 結果摘要:', response.data.data.summary);
      
      // 按股票分組顯示結果
      const resultsBySymbol = {};
      response.data.data.results.forEach(result => {
        const key = `${result.market}/${result.symbol}`;
        if (!resultsBySymbol[key]) {
          resultsBySymbol[key] = [];
        }
        resultsBySymbol[key].push(result);
      });
      
      Object.keys(resultsBySymbol).forEach(symbol => {
        console.log(`\n📈 ${symbol}:`);
        resultsBySymbol[symbol].forEach(result => {
          console.log(`  ${result.interval}: ${result.success ? '✅' : '❌'} ${result.recordsCount} 筆資料`);
        });
      });
    } else {
      console.log('❌ 批次收集失敗:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 批次收集錯誤:', error.response?.data?.message || error.message);
  }
}

async function testStatusCheck() {
  console.log('\n🧪 測試狀態檢查...');
  
  try {
    // 檢查所有已儲存的股票
    const response = await axios.get(`${BASE_URL}/historical/collect`);
    
    if (response.data.success) {
      console.log('✅ 狀態檢查成功');
      console.log('📊 已儲存股票總數:', response.data.data.totalSymbols);
      
      if (response.data.data.symbols.length > 0) {
        console.log('📋 前10個股票:');
        response.data.data.symbols.slice(0, 10).forEach(symbol => {
          console.log(`  ${symbol.market}/${symbol.symbol}: ${symbol.intervals.join(', ')}`);
        });
      }
    } else {
      console.log('❌ 狀態檢查失敗:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 狀態檢查錯誤:', error.response?.data?.message || error.message);
  }
}

async function testSpecificSymbolStatus() {
  console.log('\n🧪 測試特定股票狀態...');
  
  try {
    const response = await axios.get(`${BASE_URL}/historical/collect?market=TW&symbol=2330`);
    
    if (response.data.success) {
      console.log('✅ 特定股票狀態檢查成功');
      console.log('📊 台積電 (2330) 資料統計:');
      
      response.data.data.stats.forEach(stat => {
        console.log(`  ${stat.interval}: ${stat.records} 筆資料 (${stat.dateRange})`);
      });
    } else {
      console.log('❌ 特定股票狀態檢查失敗:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 特定股票狀態檢查錯誤:', error.response?.data?.message || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 開始歷史資料收集測試...\n');
  
  await testSingleStockCollection();
  await testBatchCollection();
  await testStatusCheck();
  await testSpecificSymbolStatus();
  
  console.log('\n✨ 測試完成！');
}

// 執行測試
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testSingleStockCollection,
  testBatchCollection,
  testStatusCheck,
  testSpecificSymbolStatus,
  runAllTests
};
