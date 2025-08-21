#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 測試股票分類器
 */
async function testStockClassifier() {
  console.log('🧪 開始測試股票分類器...');
  console.log('='.repeat(60));

  try {
    // 載入測試資料
    const testDataPath = path.join(process.cwd(), 'test-data', 'test-stocks-data.json');
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

    // 選擇要測試的股票
    const testStocks = testData
      .filter(stock => stock.success && stock.data.length > 1000)
      .slice(0, 8);

    console.log(`📊 測試 ${testStocks.length} 支股票的分類效果:`);

    const results = [];

    for (const stock of testStocks) {
      console.log(`\n🔍 分析 ${stock.name} (${stock.symbol})...`);
      
      // 模擬股票分類器的分析
      const analysis = analyzeStockCharacteristics(stock.data);
      const classification = classifyStock(analysis, stock.symbol);
      const recommendation = recommendStrategy(classification);
      
      console.log(`   類型: ${classification.type} (信心度: ${classification.confidence.toFixed(1)}%)`);
      console.log(`   理由: ${classification.reasoning}`);
      console.log(`   推薦策略: ${recommendation.strategy}`);
      console.log(`   策略理由: ${recommendation.reasoning}`);
      
      results.push({
        symbol: stock.symbol,
        name: stock.name,
        classification,
        recommendation,
        dataPoints: stock.data.length
      });
    }

    // 生成分析報告
    console.log('\n📋 分類結果摘要:');
    console.log('='.repeat(60));
    
    const typeCounts = {};
    results.forEach(result => {
      const type = result.classification.type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`${type}: ${count} 支股票`);
    });

    // 驗證分類結果
    console.log('\n✅ 分類驗證:');
    console.log('-'.repeat(40));
    
    results.forEach(result => {
      const { symbol, name, classification } = result;
      const expectedType = getExpectedType(symbol, name);
      
      console.log(`${symbol}: 預期 ${expectedType}, 實際 ${classification.type}`);
      if (expectedType === classification.type) {
        console.log(`  ✅ 分類正確!`);
      } else {
        console.log(`  ⚠️ 分類可能不準確`);
      }
    });

    // 保存結果
    const outputPath = path.join(process.cwd(), 'backtest-results', 'stock-classification-results.json');
    const outputData = {
      timestamp: new Date().toISOString(),
      results,
      summary: {
        totalStocks: results.length,
        typeDistribution: typeCounts
      }
    };

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 分類結果已保存到: ${outputPath}`);

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    process.exit(1);
  }
}

/**
 * 分析股票特徵（簡化版）
 */
function analyzeStockCharacteristics(data) {
  const prices = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  
  // 計算波動率
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252);

  // 計算成長率
  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];
  const years = data.length / 252;
  const growthRate = years > 0 ? Math.pow(endPrice / startPrice, 1 / years) - 1 : 0;

  // 計算Beta（簡化）
  const beta = 1 + (volatility - 0.2) * 2; // 簡化計算

  return {
    volatility,
    growthRate,
    dividendYield: 0,
    marketCap: 0,
    beta,
    sector: 'unknown',
    age: years
  };
}

/**
 * 分類股票
 */
function classifyStock(characteristics, symbol) {
  let type = 'unknown';
  let confidence = 0;
  let reasoning = '';

  if (characteristics.growthRate > 0.15 && characteristics.volatility > 0.3) {
    type = 'growth';
    confidence = Math.min(90, 60 + characteristics.growthRate * 100);
    reasoning = `高成長率(${(characteristics.growthRate * 100).toFixed(1)}%)和高波動率(${(characteristics.volatility * 100).toFixed(1)}%)`;
  } else if (characteristics.growthRate < 0.1 && characteristics.volatility < 0.25) {
    type = 'value';
    confidence = Math.min(85, 70 + (0.1 - characteristics.growthRate) * 200);
    reasoning = `低成長率(${(characteristics.growthRate * 100).toFixed(1)}%)和低波動率(${(characteristics.volatility * 100).toFixed(1)}%)`;
  } else if (characteristics.beta > 1.2 && characteristics.volatility > 0.25) {
    type = 'cyclical';
    confidence = Math.min(80, 60 + (characteristics.beta - 1) * 50);
    reasoning = `高Beta值(${characteristics.beta.toFixed(2)})和高波動率(${(characteristics.volatility * 100).toFixed(1)}%)`;
  } else {
    type = 'unknown';
    confidence = 50;
    reasoning = '特徵不明顯，需要更多數據';
  }

  return {
    type,
    confidence,
    characteristics,
    reasoning
  };
}

/**
 * 推薦策略
 */
function recommendStrategy(classification) {
  const { type, confidence } = classification;
  
  switch (type) {
    case 'growth':
      return {
        strategy: 'buy_and_hold',
        confidence,
        reasoning: '成長股適合長期持有，避免頻繁交易錯失複利效應',
        parameters: {
          maxPositionSize: 0.3,
          stopLoss: 0.25,
          takeProfit: 0.5,
          rsiThreshold: 85,
          maPeriod: 50
        }
      };
    case 'value':
      return {
        strategy: 'ai_analysis',
        confidence,
        reasoning: '價值股適合我們的AI策略，技術指標較為有效',
        parameters: {
          maxPositionSize: 0.2,
          stopLoss: 0.15,
          takeProfit: 0.3,
          rsiThreshold: 70,
          maPeriod: 20
        }
      };
    case 'cyclical':
      return {
        strategy: 'ai_analysis',
        confidence,
        reasoning: '週期股波動較大，適合主動交易策略',
        parameters: {
          maxPositionSize: 0.15,
          stopLoss: 0.1,
          takeProfit: 0.25,
          rsiThreshold: 65,
          maPeriod: 10
        }
      };
    default:
      return {
        strategy: 'ai_analysis',
        confidence: 50,
        reasoning: '使用默認策略，建議進一步分析',
        parameters: {
          maxPositionSize: 0.2,
          stopLoss: 0.15,
          takeProfit: 0.3,
          rsiThreshold: 70,
          maPeriod: 20
        }
      };
  }
}

/**
 * 獲取預期股票類型（基於常識）
 */
function getExpectedType(symbol, name) {
  // 基於股票名稱和代碼的常識判斷
  const growthStocks = ['NVDA', 'AAPL', 'MSFT', 'TSLA'];
  const valueStocks = ['IBM', 'INTC', 'BAC'];
  const cyclicalStocks = ['CAT', 'GE'];
  
  if (growthStocks.includes(symbol)) return 'growth';
  if (valueStocks.includes(symbol)) return 'value';
  if (cyclicalStocks.includes(symbol)) return 'cyclical';
  
  // 基於名稱判斷
  if (name.includes('Bank') || name.includes('Corporation')) return 'value';
  if (name.includes('Technology') || name.includes('Software')) return 'growth';
  
  return 'unknown';
}

// 執行測試
testStockClassifier();
