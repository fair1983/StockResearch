#!/usr/bin/env node

const { dataManager } = require('./lib/data-manager.ts');

console.log('🧪 測試資料管理功能');
console.log('=' .repeat(50));

// 1. 取得資料統計
console.log('\n📊 資料統計:');
const stats = dataManager.getDataStats();
console.log(JSON.stringify(stats, null, 2));

// 2. 取得檔案列表
console.log('\n📁 檔案列表:');
const files = dataManager.getStockDataFiles();
files.forEach(file => {
  console.log(`  ${file.name} (${(file.size / 1024).toFixed(1)} KB) - ${file.date}`);
});

// 3. 驗證最新檔案
console.log('\n✅ 驗證最新檔案:');
const latestFile = dataManager.getLatestStockDataFile();
if (latestFile) {
  const validation = dataManager.validateDataFile(latestFile);
  console.log(`檔案: ${latestFile}`);
  console.log(`有效: ${validation.valid}`);
  console.log(`總數: ${validation.stats.total}`);
  console.log(`有效: ${validation.stats.valid}`);
  console.log(`無效: ${validation.stats.invalid}`);
  
  if (validation.errors.length > 0) {
    console.log('\n❌ 錯誤:');
    validation.errors.slice(0, 5).forEach(error => console.log(`  ${error}`));
    if (validation.errors.length > 5) {
      console.log(`  ... 還有 ${validation.errors.length - 5} 個錯誤`);
    }
  }
} else {
  console.log('❌ 找不到股票資料檔案');
}

console.log('\n✅ 測試完成');
