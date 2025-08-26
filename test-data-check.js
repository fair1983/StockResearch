#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// 簡化的 logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`)
};

async function checkDataFiles() {
  logger.info('=== 檢查資料檔案 ===');
  
  try {
    // 檢查原始股票列表
    const usStocksPath = path.join(__dirname, 'data', 'us_all_stocks.jsonl');
    const twStocksPath = path.join(__dirname, 'data', 'tw_all_stocks.jsonl');
    
    logger.info(`檢查美股列表: ${usStocksPath}`);
    const usContent = await fs.readFile(usStocksPath, 'utf8');
    const usLines = usContent.trim().split('\n').filter(line => line.trim());
    logger.info(`美股列表: ${usLines.length} 支股票`);
    
    logger.info(`檢查台股列表: ${twStocksPath}`);
    const twContent = await fs.readFile(twStocksPath, 'utf8');
    const twLines = twContent.trim().split('\n').filter(line => line.trim());
    logger.info(`台股列表: ${twLines.length} 支股票`);
    
    // 檢查收集的資料
    const fullMarketDir = path.join(__dirname, 'data', 'full-market');
    const files = await fs.readdir(fullMarketDir);
    
    logger.info(`\n=== 檢查收集的資料檔案 ===`);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(fullMarketDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // 檢查資料結構
        if (Array.isArray(data)) {
          logger.info(`${file}: ${data.length} 支股票`);
          if (data.length > 0) {
            logger.info(`  範例: ${data[0].symbol} - ${data[0].name}`);
          }
        } else if (data.collectedStocks && Array.isArray(data.collectedStocks)) {
          logger.info(`${file}: ${data.collectedStocks.length} 支股票 (總計: ${data.totalStocks})`);
          if (data.collectedStocks.length > 0) {
            logger.info(`  範例: ${data.collectedStocks[0].symbol} - ${data.collectedStocks[0].name}`);
          }
        } else {
          logger.warn(`${file}: 未知的資料結構`);
        }
      }
    }
    
    return { usCount: usLines.length, twCount: twLines.length, files };
    
  } catch (error) {
    logger.error(`檢查資料檔案失敗: ${error.message}`);
    return null;
  }
}

async function testScannerAPI() {
  logger.info('\n=== 測試掃描器 API ===');
  
  try {
    const response = await fetch('http://localhost:3000/api/full-market-screener', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'conservative',
        limit: 10
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logger.info(`API 回應成功`);
    logger.info(`掃描結果: ${data.stocks?.length || 0} 支股票`);
    
    if (data.stocks && data.stocks.length > 0) {
      logger.info('前3支股票範例:');
      data.stocks.slice(0, 3).forEach((stock, index) => {
        logger.info(`  ${index + 1}. ${stock.symbol} - 評分: ${stock.overallScore}/100, 產業: ${stock.sector}`);
      });
    }
    
    return data;
    
  } catch (error) {
    logger.error(`API 測試失敗: ${error.message}`);
    return null;
  }
}

async function testMarketScreenerAPI() {
  logger.info('\n=== 測試市場分析 API ===');
  
  try {
    const response = await fetch('http://localhost:3000/api/screener', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'conservative',
        limit: 10
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logger.info(`市場分析 API 回應成功`);
    logger.info(`分析結果: ${data.stocks?.length || 0} 支股票`);
    
    if (data.stocks && data.stocks.length > 0) {
      logger.info('前3支股票範例:');
      data.stocks.slice(0, 3).forEach((stock, index) => {
        logger.info(`  ${index + 1}. ${stock.symbol} - 評分: ${stock.overallScore}/100, 產業: ${stock.sector}`);
      });
    }
    
    return data;
    
  } catch (error) {
    logger.error(`市場分析 API 測試失敗: ${error.message}`);
    return null;
  }
}

async function main() {
  logger.info('開始資料檢查測試...\n');
  
  // 檢查資料檔案
  const dataCheck = await checkDataFiles();
  
  // 等待伺服器啟動
  logger.info('\n等待伺服器啟動...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 測試 API
  const scannerResult = await testScannerAPI();
  const marketResult = await testMarketScreenerAPI();
  
  // 總結
  logger.info('\n=== 測試總結 ===');
  if (dataCheck) {
    logger.info(`✓ 資料檔案檢查完成`);
    logger.info(`  - 美股列表: ${dataCheck.usCount} 支`);
    logger.info(`  - 台股列表: ${dataCheck.twCount} 支`);
  } else {
    logger.error(`✗ 資料檔案檢查失敗`);
  }
  
  if (scannerResult) {
    logger.info(`✓ 全市場掃描器 API 正常`);
    logger.info(`  - 掃描結果: ${scannerResult.stocks?.length || 0} 支股票`);
  } else {
    logger.error(`✗ 全市場掃描器 API 失敗`);
  }
  
  if (marketResult) {
    logger.info(`✓ 市場分析 API 正常`);
    logger.info(`  - 分析結果: ${marketResult.stocks?.length || 0} 支股票`);
  } else {
    logger.error(`✗ 市場分析 API 失敗`);
  }
}

// 執行測試
main().catch(error => {
  logger.error(`測試執行失敗: ${error.message}`);
  process.exit(1);
});
