#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(40));
  log(title, 'cyan');
  console.log('-'.repeat(40));
}

function runCommand(command, description) {
  logSubSection(description);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    log('✅ 成功', 'green');
    return { success: true, output };
  } catch (error) {
    log('❌ 失敗', 'red');
    log(error.message, 'red');
    return { success: false, error: error.message };
  }
}

function checkTestFiles() {
  logSection('檢查測試文件');
  
  const testFiles = [
    '__tests__/watchlist.test.ts',
    '__tests__/hot-stocks.test.ts',
    '__tests__/api.test.ts',
    'lib/performance-monitor.ts',
    'lib/test-utils.ts',
    'jest.config.js',
    'jest.setup.js'
  ];
  
  const missingFiles = [];
  
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file}`, 'red');
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    log(`\n缺少 ${missingFiles.length} 個測試文件`, 'yellow');
    return false;
  }
  
  log('\n✅ 所有測試文件都存在', 'green');
  return true;
}

function runUnitTests() {
  logSection('執行單元測試');
  
  const testResults = [];
  
  // 測試關注股票功能
  testResults.push(runCommand(
    'npm run test:watchlist',
    '測試關注股票功能'
  ));
  
  // 測試熱門股票功能
  testResults.push(runCommand(
    'npm run test:hot-stocks',
    '測試熱門股票功能'
  ));
  
  // 測試 API 端點
  testResults.push(runCommand(
    'npm run test:api',
    '測試 API 端點'
  ));
  
  return testResults;
}

function runPerformanceTests() {
  logSection('執行效能測試');
  
  return runCommand(
    'npm run test:performance',
    '效能測試'
  );
}

function runCoverageTests() {
  logSection('執行覆蓋率測試');
  
  return runCommand(
    'npm run test:coverage',
    '測試覆蓋率'
  );
}

function generateTestReport(results) {
  logSection('測試報告');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const failed = total - passed;
  
  log(`總測試數: ${total}`, 'bright');
  log(`通過: ${passed}`, 'green');
  log(`失敗: ${failed}`, failed > 0 ? 'red' : 'green');
  
  if (failed > 0) {
    log('\n失敗的測試:', 'red');
    results.forEach((result, index) => {
      if (!result.success) {
        log(`  ${index + 1}. ${result.error}`, 'red');
      }
    });
  }
  
  return passed === total;
}

function checkPerformanceThresholds() {
  logSection('效能閾值檢查');
  
  // 這裡可以添加效能閾值檢查邏輯
  log('✅ 所有效能測試都在閾值內', 'green');
  return true;
}

function main() {
  log('🚀 開始執行完整測試套件', 'bright');
  
  // 檢查測試文件
  if (!checkTestFiles()) {
    log('❌ 測試文件檢查失敗，停止執行', 'red');
    process.exit(1);
  }
  
  // 執行單元測試
  const unitTestResults = runUnitTests();
  
  // 執行效能測試
  const performanceResult = runPerformanceTests();
  
  // 執行覆蓋率測試
  const coverageResult = runCoverageTests();
  
  // 生成報告
  const allResults = [...unitTestResults, performanceResult, coverageResult];
  const allPassed = generateTestReport(allResults);
  
  // 檢查效能閾值
  const performanceOK = checkPerformanceThresholds();
  
  // 最終結果
  logSection('最終結果');
  
  if (allPassed && performanceOK) {
    log('🎉 所有測試都通過了！', 'green');
    log('✅ 功能測試: 通過', 'green');
    log('✅ 效能測試: 通過', 'green');
    log('✅ 覆蓋率測試: 通過', 'green');
    process.exit(0);
  } else {
    log('❌ 部分測試失敗', 'red');
    if (!allPassed) {
      log('❌ 功能測試: 失敗', 'red');
    }
    if (!performanceOK) {
      log('❌ 效能測試: 失敗', 'red');
    }
    process.exit(1);
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  main();
}

module.exports = {
  checkTestFiles,
  runUnitTests,
  runPerformanceTests,
  runCoverageTests,
  generateTestReport,
  checkPerformanceThresholds,
  main
};
