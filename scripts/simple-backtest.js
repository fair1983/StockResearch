#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 簡單的回測分析腳本
 * 使用我們收集的歷史資料進行基本的買入持有策略回測
 */

// 載入測試資料
function loadTestData() {
  const testDataPath = path.join(process.cwd(), 'test-data', 'test-stocks-data.json');
  if (!fs.existsSync(testDataPath)) {
    throw new Error('找不到測試資料檔案，請先執行資料收集');
  }
  return JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
}

// 計算簡單移動平均線
function calculateMA(data, period) {
  const ma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
    ma.push(sum / period);
  }
  return ma;
}

// 計算RSI
function calculateRSI(data, period = 14) {
  const rsi = [];
  const changes = [];
  
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }
  
  for (let i = period; i < changes.length; i++) {
    const recentChanges = changes.slice(i - period, i);
    const gains = recentChanges.filter(change => change > 0);
    const losses = recentChanges.filter(change => change < 0).map(loss => Math.abs(loss));
    
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

// 簡單的AI策略模擬
function generateAISignal(candle, ma5, ma20, rsi, index) {
  const currentMA5 = ma5[index];
  const currentMA20 = ma20[index];
  const currentRSI = rsi[index];
  const price = candle.close;
  
  let signal = 'hold';
  let confidence = 50;
  let reasoning = '持有觀望';
  
  // 簡單的策略邏輯
  if (currentMA5 > currentMA20 && currentRSI < 70 && currentRSI > 30) {
    signal = 'buy';
    confidence = 70 + Math.min(30, (currentMA5 - currentMA20) / currentMA20 * 1000);
    reasoning = `MA5 > MA20 且 RSI 在合理範圍 (${currentRSI.toFixed(1)})`;
  } else if (currentMA5 < currentMA20 && currentRSI > 70) {
    signal = 'sell';
    confidence = 70 + Math.min(30, (currentMA20 - currentMA5) / currentMA5 * 1000);
    reasoning = `MA5 < MA20 且 RSI 超買 (${currentRSI.toFixed(1)})`;
  } else if (currentRSI > 80) {
    signal = 'sell';
    confidence = 60 + Math.min(30, (currentRSI - 80) * 3);
    reasoning = `RSI 嚴重超買 (${currentRSI.toFixed(1)})`;
  } else if (currentRSI < 20) {
    signal = 'buy';
    confidence = 60 + Math.min(30, (20 - currentRSI) * 3);
    reasoning = `RSI 嚴重超賣 (${currentRSI.toFixed(1)})`;
  }
  
  return { signal, confidence, reasoning };
}

// 執行回測
function runBacktest(stockData, initialCapital = 100000) {
  const data = stockData.data;
  const symbol = stockData.symbol;
  const name = stockData.name;
  
  console.log(`\n🔄 開始回測 ${name} (${symbol})...`);
  console.log(`📊 資料期間: ${data[0].time} 到 ${data[data.length - 1].time}`);
  console.log(`📈 總資料筆數: ${data.length} 筆`);
  
  if (data.length < 50) {
    console.log(`⚠️ 資料不足，跳過 ${symbol}`);
    return null;
  }
  
  // 計算技術指標
  const ma5 = calculateMA(data, 5);
  const ma20 = calculateMA(data, 20);
  const rsi = calculateRSI(data, 14);
  
  // 回測變量
  let cash = initialCapital;
  let shares = 0;
  let trades = [];
  let portfolio = [];
  
  // 開始回測（從第20天開始，確保有足夠的技術指標資料）
  for (let i = 20; i < data.length; i++) {
    const candle = data[i];
    const currentPrice = candle.close;
    
    // 獲取技術指標
    const ma5Index = i - 4; // MA5 的索引調整
    const ma20Index = i - 19; // MA20 的索引調整
    const rsiIndex = i - 20; // RSI 的索引調整
    
    if (ma5Index >= 0 && ma20Index >= 0 && rsiIndex >= 0) {
      // 生成AI信號
      const aiSignal = generateAISignal(
        candle,
        ma5,
        ma20,
        rsi,
        Math.min(ma5Index, ma20Index, rsiIndex)
      );
      
      // 執行交易邏輯
      if (aiSignal.signal === 'buy' && aiSignal.confidence > 65 && cash > currentPrice * 100) {
        // 買入（使用50%的現金）
        const investAmount = cash * 0.5;
        const sharesToBuy = Math.floor(investAmount / currentPrice);
        
        if (sharesToBuy > 0) {
          const totalCost = sharesToBuy * currentPrice;
          cash -= totalCost;
          shares += sharesToBuy;
          
          trades.push({
            date: candle.time,
            type: 'buy',
            price: currentPrice,
            shares: sharesToBuy,
            cost: totalCost,
            reason: aiSignal.reasoning,
            confidence: aiSignal.confidence
          });
        }
      } else if (aiSignal.signal === 'sell' && aiSignal.confidence > 65 && shares > 0) {
        // 賣出（賣出50%的持股）
        const sharesToSell = Math.floor(shares * 0.5);
        
        if (sharesToSell > 0) {
          const totalRevenue = sharesToSell * currentPrice;
          cash += totalRevenue;
          shares -= sharesToSell;
          
          trades.push({
            date: candle.time,
            type: 'sell',
            price: currentPrice,
            shares: sharesToSell,
            revenue: totalRevenue,
            reason: aiSignal.reasoning,
            confidence: aiSignal.confidence
          });
        }
      }
    }
    
    // 記錄每日投資組合價值
    const portfolioValue = cash + shares * currentPrice;
    portfolio.push({
      date: candle.time,
      cash,
      shares,
      price: currentPrice,
      portfolioValue,
      return: ((portfolioValue - initialCapital) / initialCapital) * 100
    });
  }
  
  // 計算最終結果
  const finalPrice = data[data.length - 1].close;
  const finalValue = cash + shares * finalPrice;
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
  
  // 計算年化收益率
  const startDate = new Date(data[0].time);
  const endDate = new Date(data[data.length - 1].time);
  const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
  const annualizedReturn = years > 0 ? (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100 : 0;
  
  // 計算買入持有策略的收益率
  const buyHoldReturn = ((finalPrice - data[0].close) / data[0].close) * 100;
  const buyHoldAnnualized = years > 0 ? (Math.pow(finalPrice / data[0].close, 1 / years) - 1) * 100 : 0;
  
  // 計算勝率
  const sellTrades = trades.filter(t => t.type === 'sell');
  const profitableTrades = sellTrades.filter(t => {
    // 找到對應的買入交易
    const buyTrade = trades.slice(0, trades.indexOf(t)).reverse().find(bt => bt.type === 'buy');
    return buyTrade && t.price > buyTrade.price;
  });
  const winRate = sellTrades.length > 0 ? (profitableTrades.length / sellTrades.length) * 100 : 0;
  
  console.log(`✅ ${name} 回測完成:`);
  console.log(`   💰 最終價值: $${finalValue.toLocaleString()}`);
  console.log(`   📈 總收益率: ${totalReturn.toFixed(2)}%`);
  console.log(`   📊 年化收益率: ${annualizedReturn.toFixed(2)}%`);
  console.log(`   🎯 交易次數: ${trades.length}`);
  console.log(`   🏆 勝率: ${winRate.toFixed(1)}%`);
  console.log(`   📋 買入持有收益率: ${buyHoldReturn.toFixed(2)}%`);
  console.log(`   📋 買入持有年化: ${buyHoldAnnualized.toFixed(2)}%`);
  console.log(`   🎲 策略 vs 買入持有: ${(totalReturn - buyHoldReturn).toFixed(2)}%`);
  
  return {
    symbol,
    name,
    initialCapital,
    finalValue,
    totalReturn,
    annualizedReturn,
    trades: trades.length,
    winRate,
    buyHoldReturn,
    buyHoldAnnualized,
    outperformance: totalReturn - buyHoldReturn,
    dataPoints: data.length,
    period: `${data[0].time} 到 ${data[data.length - 1].time}`,
    tradeDetails: trades
  };
}

// 主函數
async function main() {
  console.log('🚀 開始執行簡單回測分析...');
  console.log('='.repeat(80));
  
  try {
    // 載入資料
    const testData = loadTestData();
    console.log(`📊 載入了 ${testData.length} 支股票的資料`);
    
    // 選擇要回測的股票（選擇資料較多的股票）
    const selectedStocks = testData
      .filter(stock => stock.success && stock.data.length > 1000)
      .slice(0, 8); // 取前8支資料最豐富的股票
    
    console.log(`\n🎯 選擇 ${selectedStocks.length} 支股票進行回測:`);
    selectedStocks.forEach((stock, index) => {
      console.log(`${index + 1}. ${stock.name} (${stock.symbol}) - ${stock.data.length} 筆資料`);
    });
    
    // 執行回測
    const results = [];
    const startTime = Date.now();
    
    for (const stock of selectedStocks) {
      const result = runBacktest(stock);
      if (result) {
        results.push(result);
      }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n🎉 回測分析完成!');
    console.log(`⏱️ 總執行時間: ${duration.toFixed(2)} 秒`);
    
    // 生成摘要報告
    if (results.length > 0) {
      console.log('\n📊 回測結果摘要:');
      console.log('='.repeat(80));
      
      const avgReturn = results.reduce((sum, r) => sum + r.totalReturn, 0) / results.length;
      const avgAnnualized = results.reduce((sum, r) => sum + r.annualizedReturn, 0) / results.length;
      const avgOutperformance = results.reduce((sum, r) => sum + r.outperformance, 0) / results.length;
      const avgWinRate = results.reduce((sum, r) => sum + r.winRate, 0) / results.length;
      
      console.log(`平均總收益率: ${avgReturn.toFixed(2)}%`);
      console.log(`平均年化收益率: ${avgAnnualized.toFixed(2)}%`);
      console.log(`平均勝率: ${avgWinRate.toFixed(1)}%`);
      console.log(`平均超額收益: ${avgOutperformance.toFixed(2)}%`);
      
      // 排序並顯示排名
      results.sort((a, b) => b.totalReturn - a.totalReturn);
      
      console.log('\n🏆 表現排名:');
      results.forEach((result, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        console.log(`${medal} ${result.name} (${result.symbol}): ${result.totalReturn.toFixed(2)}% (年化: ${result.annualizedReturn.toFixed(2)}%)`);
      });
      
      // 保存結果
      const outputDir = path.join(process.cwd(), 'backtest-results');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputPath = path.join(outputDir, 'simple-backtest-results.json');
      const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
          totalStocks: results.length,
          avgReturn,
          avgAnnualized,
          avgOutperformance,
          avgWinRate,
          executionTime: duration
        },
        results
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
      console.log(`\n💾 詳細結果已保存到: ${outputPath}`);
      
      // 生成簡單的 Markdown 報告
      const reportPath = path.join(outputDir, 'simple-backtest-report.md');
      let markdownReport = `# 簡單回測分析報告\n\n`;
      markdownReport += `**生成時間**: ${new Date().toLocaleString('zh-TW')}\n\n`;
      markdownReport += `## 📊 整體摘要\n\n`;
      markdownReport += `- **回測股票數**: ${results.length} 支\n`;
      markdownReport += `- **平均總收益率**: ${avgReturn.toFixed(2)}%\n`;
      markdownReport += `- **平均年化收益率**: ${avgAnnualized.toFixed(2)}%\n`;
      markdownReport += `- **平均勝率**: ${avgWinRate.toFixed(1)}%\n`;
      markdownReport += `- **平均超額收益**: ${avgOutperformance.toFixed(2)}%\n`;
      markdownReport += `- **執行時間**: ${duration.toFixed(2)} 秒\n\n`;
      
      markdownReport += `## 🏆 詳細排名\n\n`;
      markdownReport += `| 排名 | 股票 | 總收益率 | 年化收益率 | 勝率 | 交易次數 | 超額收益 |\n`;
      markdownReport += `|------|------|----------|------------|------|----------|----------|\n`;
      
      results.forEach((result, index) => {
        markdownReport += `| ${index + 1} | ${result.name} (${result.symbol}) | ${result.totalReturn.toFixed(2)}% | ${result.annualizedReturn.toFixed(2)}% | ${result.winRate.toFixed(1)}% | ${result.trades} | ${result.outperformance.toFixed(2)}% |\n`;
      });
      
      fs.writeFileSync(reportPath, markdownReport);
      console.log(`📋 Markdown 報告已保存到: ${reportPath}`);
    }
    
  } catch (error) {
    console.error('❌ 回測執行失敗:', error.message);
    process.exit(1);
  }
}

// 執行主函數
main();
