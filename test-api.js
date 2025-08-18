const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// 測試案例配置
const testCases = [
  // 美股測試
  { market: 'US', symbol: 'AAPL', name: 'Apple Inc.' },
  { market: 'US', symbol: 'MSFT', name: 'Microsoft Corp.' },
  { market: 'US', symbol: 'TSLA', name: 'Tesla Inc.' },
  { market: 'US', symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { market: 'US', symbol: 'NVDA', name: 'NVIDIA Corp.' },
  
  // 台股測試
  { market: 'TW', symbol: '2330', name: '台積電' },
  { market: 'TW', symbol: '2317', name: '鴻海' },
  { market: 'TW', symbol: '0050', name: '元大台灣50' },
  { market: 'TW', symbol: '2454', name: '聯發科' },
  { market: 'TW', symbol: '2412', name: '中華電' },
];

// 測試模式
const TEST_MODES = {
  QUICK: 'quick',      // 快速測試（只測試前3個）
  FULL: 'full',        // 完整測試（所有案例）
  SINGLE: 'single',    // 單一測試
  CUSTOM: 'custom',    // 自訂測試
  PERFORMANCE: 'performance' // 效能測試
};

async function testAPI(market, symbol, name, options = {}) {
  const { from, to, verbose = true } = options;
  
  try {
    if (verbose) {
      console.log(`\n🧪 測試 ${market} ${symbol} (${name})`);
      console.log('─'.repeat(50));
    }
    
    const startTime = Date.now();
    const params = new URLSearchParams({ market, symbol });
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await axios.get(`${BASE_URL}/api/ohlc?${params}`);
    const endTime = Date.now();
    
    const { data, headers } = response;
    
    // 基本驗證
    if (verbose) {
      console.log(`✅ 狀態碼: ${response.status}`);
      console.log(`✅ 回應時間: ${endTime - startTime}ms`);
      console.log(`✅ 資料來源: ${headers['x-data-source']}`);
      console.log(`✅ 資料筆數: ${headers['x-data-count']}`);
    }
    
    // 資料結構驗證
    if (data.market === market && data.symbol === symbol && data.tf === '1d') {
      if (verbose) console.log('✅ 回應格式正確');
    } else {
      if (verbose) console.log('❌ 回應格式錯誤');
      return false;
    }
    
    // 資料內容驗證
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      if (verbose) {
        console.log(`✅ 資料陣列正確，共 ${data.data.length} 筆`);
        
        // 檢查第一筆資料
        const firstRecord = data.data[0];
        const requiredFields = ['time', 'open', 'high', 'low', 'close'];
        const hasAllFields = requiredFields.every(field => firstRecord.hasOwnProperty(field));
        
        if (hasAllFields) {
          console.log('✅ 資料欄位完整');
          console.log(`📊 第一筆資料: ${firstRecord.time} | O:${firstRecord.open} H:${firstRecord.high} L:${firstRecord.low} C:${firstRecord.close}`);
        } else {
          console.log('❌ 資料欄位不完整');
          return false;
        }
        
        // 檢查最後一筆資料
        const lastRecord = data.data[data.data.length - 1];
        console.log(`📊 最後一筆資料: ${lastRecord.time} | O:${lastRecord.open} H:${lastRecord.high} L:${lastRecord.low} C:${lastRecord.close}`);
      }
      
      return {
        success: true,
        dataCount: data.data.length,
        responseTime: endTime - startTime,
        dataSource: headers['x-data-source'],
        firstDate: data.data[0].time,
        lastDate: data.data[data.data.length - 1].time
      };
      
    } else {
      if (verbose) console.log('❌ 資料陣列錯誤或為空');
      return false;
    }
    
  } catch (error) {
    if (verbose) {
      console.log(`❌ 測試失敗: ${error.message}`);
      if (error.response) {
        console.log(`❌ 錯誤狀態: ${error.response.status}`);
        console.log(`❌ 錯誤訊息: ${JSON.stringify(error.response.data)}`);
      }
    }
    return false;
  }
}

async function runQuickTest() {
  console.log('🚀 快速測試模式（前3個案例）');
  console.log('='.repeat(60));
  
  const quickCases = testCases.slice(0, 3);
  let passedTests = 0;
  
  for (const testCase of quickCases) {
    const result = await testAPI(testCase.market, testCase.symbol, testCase.name);
    if (result && result.success) {
      passedTests++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 快速測試結果: ${passedTests}/${quickCases.length} 通過`);
  return passedTests === quickCases.length;
}

async function runFullTest() {
  console.log('🚀 完整測試模式（所有案例）');
  console.log('='.repeat(60));
  
  let passedTests = 0;
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testAPI(testCase.market, testCase.symbol, testCase.name);
    if (result && result.success) {
      passedTests++;
      results.push({ ...testCase, ...result });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 完整測試結果: ${passedTests}/${testCases.length} 通過`);
  
  // 顯示統計資訊
  if (results.length > 0) {
    console.log('\n📈 統計資訊:');
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const avgDataCount = results.reduce((sum, r) => sum + r.dataCount, 0) / results.length;
    console.log(`平均回應時間: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`平均資料筆數: ${avgDataCount.toFixed(0)}筆`);
  }
  
  return passedTests === testCases.length;
}

async function runSingleTest(market, symbol) {
  const testCase = testCases.find(tc => tc.market === market && tc.symbol === symbol);
  if (!testCase) {
    console.log(`❌ 找不到測試案例: ${market} ${symbol}`);
    return false;
  }
  
  console.log(`🚀 單一測試: ${market} ${symbol}`);
  console.log('='.repeat(60));
  
  const result = await testAPI(market, symbol, testCase.name);
  return result && result.success;
}

async function runCustomTest() {
  console.log('🚀 自訂測試模式');
  console.log('='.repeat(60));
  
  // 測試不同的日期範圍
  const customTests = [
    { market: 'US', symbol: 'AAPL', from: '2025-08-01', to: '2025-08-15', name: 'Apple (最近2週)' },
    { market: 'TW', symbol: '2330', from: '2025-07-01', to: '2025-08-15', name: '台積電 (最近1.5個月)' },
  ];
  
  let passedTests = 0;
  
  for (const test of customTests) {
    console.log(`\n🧪 測試 ${test.name}`);
    const result = await testAPI(test.market, test.symbol, test.name, { 
      from: test.from, 
      to: test.to,
      verbose: true 
    });
    if (result && result.success) {
      passedTests++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 自訂測試結果: ${passedTests}/${customTests.length} 通過`);
  return passedTests === customTests.length;
}

async function runPerformanceTest() {
  console.log('🚀 效能測試模式');
  console.log('='.repeat(60));
  
  const performanceTests = [
    { market: 'US', symbol: 'AAPL', name: 'Apple' },
    { market: 'TW', symbol: '2330', name: '台積電' },
  ];
  
  const results = [];
  
  for (const test of performanceTests) {
    console.log(`\n🧪 效能測試 ${test.name}`);
    const result = await testAPI(test.market, test.symbol, test.name, { verbose: false });
    if (result && result.success) {
      results.push({ ...test, ...result });
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 效能測試結果:');
  console.log('─'.repeat(40));
  
  results.forEach(r => {
    console.log(`${r.name}: ${r.responseTime}ms | ${r.dataCount}筆 | ${r.dataSource}`);
  });
  
  if (results.length > 0) {
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    console.log(`\n平均回應時間: ${avgResponseTime.toFixed(0)}ms`);
  }
  
  return results.length === performanceTests.length;
}

// 主函數
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'quick';
  
  console.log('🎯 Yahoo Finance API 測試工具');
  console.log('='.repeat(60));
  
  let success = false;
  
  switch (mode) {
    case TEST_MODES.QUICK:
      success = await runQuickTest();
      break;
    case TEST_MODES.FULL:
      success = await runFullTest();
      break;
    case TEST_MODES.SINGLE:
      if (args.length < 3) {
        console.log('❌ 單一測試需要指定 market 和 symbol');
        console.log('使用方式: node test-api.js single US AAPL');
        return;
      }
      success = await runSingleTest(args[1], args[2]);
      break;
    case TEST_MODES.CUSTOM:
      success = await runCustomTest();
      break;
    case TEST_MODES.PERFORMANCE:
      success = await runPerformanceTest();
      break;
    default:
      console.log('❌ 無效的測試模式');
        console.log('可用的模式:');
  console.log('  quick       - 快速測試（前3個案例）');
  console.log('  full        - 完整測試（所有案例）');
  console.log('  single      - 單一測試（需要指定 market symbol）');
  console.log('  custom      - 自訂測試（不同日期範圍）');
  console.log('  performance - 效能測試');
  console.log('  注意：目前只支援日K線 (1d)');
      console.log('\n使用方式: node test-api.js [模式]');
      return;
  }
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎉 測試完成！所有功能正常！');
  } else {
    console.log('⚠️  測試完成，但發現問題，請檢查錯誤訊息');
  }
}

// 執行測試
main().catch(console.error);
