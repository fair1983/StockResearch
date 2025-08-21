#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 測試智能策略切換系統
 */
async function testIntelligentStrategySwitcher() {
  console.log('🧠 開始測試智能策略切換系統...');
  console.log('='.repeat(80));

  try {
    // 載入測試資料
    const testDataPath = path.join(process.cwd(), 'test-data', 'test-stocks-data.json');
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

    // 選擇要測試的股票
    const testStocks = testData
      .filter(stock => stock.success && stock.data.length > 1000)
      .slice(0, 8);

    console.log(`📊 測試 ${testStocks.length} 支股票的智能策略選擇:`);

    // 模擬智能策略切換器
    const strategySwitcher = new IntelligentStrategySwitcher();
    const results = [];

    // 為每支股票選擇最佳策略
    for (const stock of testStocks) {
      console.log(`\n🔍 分析 ${stock.name} (${stock.symbol})...`);
      
      const strategyResult = strategySwitcher.selectStrategy(stock.data, stock.symbol);
      
      console.log(`   推薦策略: ${strategyResult.strategy}`);
      console.log(`   信心度: ${strategyResult.confidence.toFixed(1)}%`);
      console.log(`   推理: ${strategyResult.reasoning}`);
      console.log(`   預期收益: ${(strategyResult.expectedReturn * 100).toFixed(2)}%`);
      console.log(`   預期風險: ${(strategyResult.expectedRisk * 100).toFixed(2)}%`);
      console.log(`   建議配置: ${(strategyResult.recommendedAllocation * 100).toFixed(1)}%`);
      
      results.push({
        symbol: stock.symbol,
        name: stock.name,
        strategyResult,
        dataPoints: stock.data.length
      });
    }

    // 生成投資組合策略
    console.log('\n📈 生成投資組合策略...');
    const portfolioAllocations = strategySwitcher.selectPortfolioStrategies(
      testStocks.map(s => ({ symbol: s.symbol, data: s.data })),
      1000000 // 100萬美元初始資金
    );

    console.log('\n🏗️ 投資組合配置:');
    console.log('-'.repeat(60));
    
    let totalAllocation = 0;
    portfolioAllocations.forEach((allocation, index) => {
      const stockData = testStocks.find(s => s.symbol === allocation.stock);
      console.log(`${index + 1}. ${stockData.name} (${allocation.stock})`);
      console.log(`   策略: ${allocation.strategy}`);
      console.log(`   配置: ${(allocation.allocation * 100).toFixed(1)}%`);
      console.log(`   預期收益: ${(allocation.expectedReturn * 100).toFixed(2)}%`);
      console.log(`   預期風險: ${(allocation.expectedRisk * 100).toFixed(2)}%`);
      console.log(`   推理: ${allocation.reasoning}`);
      console.log('');
      
      totalAllocation += allocation.allocation;
    });

    console.log(`總配置比例: ${(totalAllocation * 100).toFixed(1)}%`);

    // 分析投資組合風險
    console.log('\n📊 投資組合風險分析:');
    console.log('-'.repeat(60));
    
    const riskAnalysis = strategySwitcher.analyzePortfolioRisk(portfolioAllocations);
    
    console.log(`總預期收益: ${(riskAnalysis.totalExpectedReturn * 100).toFixed(2)}%`);
    console.log(`總預期風險: ${(riskAnalysis.totalExpectedRisk * 100).toFixed(2)}%`);
    console.log(`分散化分數: ${(riskAnalysis.diversificationScore * 100).toFixed(1)}%`);
    
    console.log('\n💡 投資建議:');
    riskAnalysis.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // 策略分布分析
    console.log('\n📋 策略分布分析:');
    console.log('-'.repeat(60));
    
    const strategyDistribution = {};
    portfolioAllocations.forEach(allocation => {
      strategyDistribution[allocation.strategy] = (strategyDistribution[allocation.strategy] || 0) + 1;
    });

    Object.entries(strategyDistribution).forEach(([strategy, count]) => {
      console.log(`${strategy}: ${count} 支股票`);
    });

    // 保存結果
    const outputPath = path.join(process.cwd(), 'backtest-results', 'intelligent-strategy-results.json');
    const outputData = {
      timestamp: new Date().toISOString(),
      individualResults: results,
      portfolioAllocations,
      riskAnalysis,
      strategyDistribution
    };

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 智能策略結果已保存到: ${outputPath}`);

    // 生成對比分析
    console.log('\n🔄 與原始策略對比:');
    console.log('-'.repeat(60));
    
    const comparison = compareWithOriginalStrategy(results);
    console.log(`策略改進預期: ${comparison.improvement}%`);
    console.log(`風險降低預期: ${comparison.riskReduction}%`);
    console.log(`主要改進: ${comparison.mainImprovements.join(', ')}`);

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    process.exit(1);
  }
}

/**
 * 模擬智能策略切換器類
 */
class IntelligentStrategySwitcher {
  constructor() {
    this.strategies = this.initializeStrategies();
  }

  initializeStrategies() {
    return {
      'buy_and_hold': {
        name: '買入持有策略',
        description: '長期持有優質成長股，避免頻繁交易錯失複利效應'
      },
      'ai_analysis': {
        name: 'AI分析策略',
        description: '使用AI技術分析進行主動交易，適合波動較大的股票'
      },
      'dividend_focused': {
        name: '股息策略',
        description: '專注於股息收益的長期投資策略'
      },
      'momentum': {
        name: '動量策略',
        description: '跟隨市場趨勢的短期交易策略'
      },
      'mean_reversion': {
        name: '均值回歸策略',
        description: '基於價格偏離均值的回歸交易策略'
      }
    };
  }

  selectStrategy(data, symbol) {
    // 分析股票特徵
    const characteristics = this.analyzeStockCharacteristics(data);
    const classification = this.classifyStock(characteristics, symbol);
    
    // 選擇策略
    let strategyName = 'ai_analysis'; // 默認策略
    let reasoning = '';

    if (classification.type === 'growth') {
      strategyName = 'buy_and_hold';
      reasoning = '成長股適合長期持有，避免頻繁交易錯失複利效應';
    } else if (classification.type === 'value') {
      strategyName = 'mean_reversion';
      reasoning = '價值股適合均值回歸策略';
    } else if (classification.type === 'cyclical') {
      strategyName = 'momentum';
      reasoning = '週期股適合動量策略';
    }

    // 計算預期收益和風險
    const expectedReturn = this.calculateExpectedReturn(characteristics, strategyName);
    const expectedRisk = this.calculateExpectedRisk(characteristics, strategyName);
    const recommendedAllocation = this.calculateAllocation(classification, expectedReturn, expectedRisk);

    return {
      strategy: this.strategies[strategyName].name,
      confidence: classification.confidence,
      reasoning: `${classification.reasoning} → ${reasoning}`,
      parameters: {},
      expectedReturn,
      expectedRisk,
      recommendedAllocation
    };
  }

  analyzeStockCharacteristics(data) {
    const prices = data.map(d => d.close);
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252);
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const years = data.length / 252;
    const growthRate = years > 0 ? Math.pow(endPrice / startPrice, 1 / years) - 1 : 0;
    const beta = 1 + (volatility - 0.2) * 2;

    return { volatility, growthRate, beta, years };
  }

  classifyStock(characteristics, symbol) {
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

    return { type, confidence, reasoning, characteristics };
  }

  calculateExpectedReturn(characteristics, strategyName) {
    let baseReturn = characteristics.growthRate;
    
    switch (strategyName) {
      case 'buy_and_hold': return baseReturn * 0.9;
      case 'ai_analysis': return baseReturn * 0.7;
      case 'momentum': return baseReturn * 0.8;
      case 'mean_reversion': return baseReturn * 0.6;
      default: return baseReturn * 0.7;
    }
  }

  calculateExpectedRisk(characteristics, strategyName) {
    let baseRisk = characteristics.volatility;
    
    switch (strategyName) {
      case 'buy_and_hold': return baseRisk * 1.1;
      case 'ai_analysis': return baseRisk * 0.8;
      case 'momentum': return baseRisk * 1.2;
      case 'mean_reversion': return baseRisk * 0.9;
      default: return baseRisk * 0.8;
    }
  }

  calculateAllocation(classification, expectedReturn, expectedRisk) {
    const sharpeRatio = expectedReturn / expectedRisk;
    let allocation = Math.min(0.3, sharpeRatio * 0.1);
    allocation *= (classification.confidence / 100);
    return Math.max(0.05, Math.min(0.3, allocation));
  }

  selectPortfolioStrategies(stocks, totalCapital) {
    const allocations = [];
    let totalAllocation = 0;

    for (const stock of stocks) {
      const strategyResult = this.selectStrategy(stock.data, stock.symbol);
      
      allocations.push({
        stock: stock.symbol,
        strategy: strategyResult.strategy,
        allocation: strategyResult.recommendedAllocation,
        reasoning: strategyResult.reasoning,
        expectedReturn: strategyResult.expectedReturn,
        expectedRisk: strategyResult.expectedRisk
      });

      totalAllocation += strategyResult.recommendedAllocation;
    }

    if (totalAllocation > 0) {
      allocations.forEach(allocation => {
        allocation.allocation = allocation.allocation / totalAllocation;
      });
    }

    return allocations.sort((a, b) => b.expectedReturn - a.expectedReturn);
  }

  analyzePortfolioRisk(allocations) {
    let totalExpectedReturn = 0;
    let totalExpectedRisk = 0;
    const strategyCounts = new Map();

    for (const allocation of allocations) {
      totalExpectedReturn += allocation.expectedReturn * allocation.allocation;
      totalExpectedRisk += allocation.expectedRisk * allocation.allocation;
      
      strategyCounts.set(
        allocation.strategy,
        (strategyCounts.get(allocation.strategy) || 0) + 1
      );
    }

    const uniqueStrategies = strategyCounts.size;
    const totalStocks = allocations.length;
    const diversificationScore = (uniqueStrategies / totalStocks + 0.5) / 2;

    const recommendations = [];
    if (totalExpectedReturn > 0.15) {
      recommendations.push('🎯 預期收益較高，建議適當控制風險');
    }
    if (totalExpectedRisk > 0.3) {
      recommendations.push('⚠️ 投資組合風險較高，建議增加防禦性資產');
    }
    if (diversificationScore < 0.5) {
      recommendations.push('📊 分散化程度較低，建議增加不同策略的配置');
    }

    return {
      totalExpectedReturn,
      totalExpectedRisk,
      diversificationScore,
      recommendations
    };
  }
}

/**
 * 與原始策略對比
 */
function compareWithOriginalStrategy(results) {
  // 模擬原始策略的結果（基於之前的回測）
  const originalReturns = [0.0767, 0.0583, 0.0284, 0.0225, 0.0052, 0.0035, 0.0023, 0.0013];
  const originalRisks = [0.42, 0.60, 0.31, 0.36, 0.37, 0.41, 0.41, 0.36];
  
  const newReturns = results.map(r => r.strategyResult.expectedReturn);
  const newRisks = results.map(r => r.strategyResult.expectedRisk);
  
  const avgOriginalReturn = originalReturns.reduce((a, b) => a + b, 0) / originalReturns.length;
  const avgNewReturn = newReturns.reduce((a, b) => a + b, 0) / newReturns.length;
  const avgOriginalRisk = originalRisks.reduce((a, b) => a + b, 0) / originalRisks.length;
  const avgNewRisk = newRisks.reduce((a, b) => a + b, 0) / newRisks.length;
  
  const improvement = ((avgNewReturn - avgOriginalReturn) / avgOriginalReturn) * 100;
  const riskReduction = ((avgOriginalRisk - avgNewRisk) / avgOriginalRisk) * 100;
  
  const mainImprovements = [];
  if (improvement > 0) mainImprovements.push('預期收益提升');
  if (riskReduction > 0) mainImprovements.push('風險控制改善');
  if (mainImprovements.length === 0) mainImprovements.push('策略優化');
  
  return {
    improvement: improvement.toFixed(1),
    riskReduction: riskReduction.toFixed(1),
    mainImprovements
  };
}

// 執行測試
testIntelligentStrategySwitcher();
