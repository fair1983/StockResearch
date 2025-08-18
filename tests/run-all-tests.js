// 批次執行所有測試程式
const fs = require('fs');
const path = require('path');

async function runAllTests() {
  console.log('=== 開始執行所有測試 ===\n');
  
  // 獲取當前目錄下的所有測試檔案
  const testFiles = fs.readdirSync(__dirname)
    .filter(file => file.startsWith('test-') && file.endsWith('.js'))
    .filter(file => file !== 'run-all-tests.js'); // 排除自己
  
  console.log(`找到 ${testFiles.length} 個測試檔案:\n`);
  testFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const testFile of testFiles) {
    try {
      console.log(`\n=== 執行 ${testFile} ===`);
      console.log('='.repeat(50));
      
      // 執行測試檔案
      const testPath = path.join(__dirname, testFile);
      const testModule = require(testPath);
      
      // 如果測試檔案有導出函數，則執行
      if (typeof testModule === 'function') {
        await testModule();
      }
      
      successCount++;
      console.log(`✅ ${testFile} 執行完成`);
      
    } catch (error) {
      failCount++;
      console.log(`❌ ${testFile} 執行失敗: ${error.message}`);
      console.error(error);
    }
    
    console.log('='.repeat(50));
  }

  // 總結
  console.log('\n=== 測試總結 ===');
  console.log(`✅ 成功: ${successCount} 個`);
  console.log(`❌ 失敗: ${failCount} 個`);
  console.log(`📊 總計: ${testFiles.length} 個`);
  
  if (failCount === 0) {
    console.log('\n🎉 所有測試都通過了！');
  } else {
    console.log(`\n⚠️  有 ${failCount} 個測試失敗，請檢查錯誤訊息`);
  }
}

// 檢查伺服器是否運行
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/ohlc?symbol=2330&market=TW&tf=1d&limit=1');
    if (response.ok) {
      console.log('✅ 伺服器正在運行');
      return true;
    }
  } catch (error) {
    console.log('❌ 伺服器未運行或無法連線');
    console.log('請先執行: npm run dev');
    return false;
  }
}

// 主執行函數
async function main() {
  console.log('檢查伺服器狀態...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('\n請先啟動伺服器再執行測試');
    process.exit(1);
  }
  
  // 等待 3 秒讓伺服器完全啟動
  console.log('等待伺服器完全啟動...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await runAllTests();
}

// 執行主函數
main().catch(error => {
  console.error('執行測試時發生錯誤:', error);
  process.exit(1);
});
