#!/usr/bin/env node

const yahooFinance = require('yahoo-finance2').default;

// 簡化的 logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`)
};

async function checkHistoricalData() {
  logger.info('=== 檢查歷史價格資料內容 ===\n');
  
  try {
    // 測試獲取 AAPL 的歷史資料
    logger.info('1. 獲取 AAPL 歷史資料...');
    const historical = await yahooFinance.historical('AAPL', {
      period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
      period2: new Date(),
      interval: '1d'
    });
    
    logger.success(`✓ 成功獲取 AAPL 歷史資料，共 ${historical.length} 天`);
    
    // 檢查資料結構
    if (historical.length > 0) {
      const sample = historical[0];
      logger.info('\n2. 資料欄位檢查:');
      logger.info(`   - 日期: ${sample.date}`);
      logger.info(`   - 開盤價: ${sample.open}`);
      logger.info(`   - 收盤價: ${sample.close}`);
      logger.info(`   - 最高價: ${sample.high}`);
      logger.info(`   - 最低價: ${sample.low}`);
      logger.info(`   - 成交量: ${sample.volume}`);
      logger.info(`   - 調整收盤價: ${sample.adjClose}`);
      
      logger.info('\n3. 所有可用欄位:');
      Object.keys(sample).forEach(key => {
        logger.info(`   - ${key}: ${sample[key]}`);
      });
      
      // 顯示前5天的資料
      logger.info('\n4. 前5天資料範例:');
      historical.slice(0, 5).forEach((day, index) => {
        logger.info(`   第${index + 1}天: ${day.date.toDateString()} - 開盤:$${day.open}, 收盤:$${day.close}, 成交量:${day.volume}`);
      });
      
      // 計算基本技術指標
      logger.info('\n5. 基本技術指標計算:');
      const closes = historical.map(d => d.close);
      const volumes = historical.map(d => d.volume);
      
      // 計算移動平均線
      const ma5 = closes.slice(-5).reduce((sum, price) => sum + price, 0) / 5;
      const ma10 = closes.slice(-10).reduce((sum, price) => sum + price, 0) / 10;
      
      // 計算波動率
      const returns = [];
      for (let i = 1; i < closes.length; i++) {
        returns.push((closes[i] - closes[i-1]) / closes[i-1]);
      }
      const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length);
      
      // 計算RSI
      let gains = 0, losses = 0;
      for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i-1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      const avgGain = gains / (closes.length - 1);
      const avgLoss = losses / (closes.length - 1);
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      logger.info(`   - 5日移動平均: $${ma5.toFixed(2)}`);
      logger.info(`   - 10日移動平均: $${ma10.toFixed(2)}`);
      logger.info(`   - 波動率: ${(volatility * 100).toFixed(2)}%`);
      logger.info(`   - RSI: ${rsi.toFixed(2)}`);
      logger.info(`   - 平均成交量: ${Math.round(volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length)}`);
      
      // 檢查是否有其他技術指標
      logger.info('\n6. 檢查是否有其他技術指標資料:');
      const hasTechnicalData = historical.some(day => 
        day.rsi !== undefined || 
        day.macd !== undefined || 
        day.bollingerBands !== undefined ||
        day.movingAverage !== undefined
      );
      
      if (hasTechnicalData) {
        logger.success('✓ 發現額外技術指標資料');
        const techDay = historical.find(day => 
          day.rsi !== undefined || 
          day.macd !== undefined || 
          day.bollingerBands !== undefined
        );
        if (techDay) {
          Object.keys(techDay).forEach(key => {
            if (['rsi', 'macd', 'bollingerBands', 'movingAverage'].includes(key)) {
              logger.info(`   - ${key}: ${JSON.stringify(techDay[key])}`);
            }
          });
        }
      } else {
        logger.warn('✗ 沒有發現額外的技術指標資料，只有基本OHLCV資料');
      }
      
    } else {
      logger.error('✗ 沒有獲取到歷史資料');
    }
    
    // 測試台股歷史資料
    logger.info('\n7. 測試台股歷史資料...');
    try {
      const twHistorical = await yahooFinance.historical('1101.TW', {
        period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        period2: new Date(),
        interval: '1d'
      });
      
      logger.success(`✓ 成功獲取 1101.TW 歷史資料，共 ${twHistorical.length} 天`);
      if (twHistorical.length > 0) {
        const twSample = twHistorical[0];
        logger.info(`   範例: ${twSample.date.toDateString()} - 開盤:${twSample.open}, 收盤:${twSample.close}`);
      }
    } catch (error) {
      logger.error(`✗ 台股歷史資料獲取失敗: ${error.message}`);
    }
    
    // 總結
    logger.info('\n=== 歷史資料檢查總結 ===');
    logger.info('✓ 基本OHLCV資料: 完整');
    logger.info('  - 開盤價 (Open)');
    logger.info('  - 最高價 (High)');
    logger.info('  - 最低價 (Low)');
    logger.info('  - 收盤價 (Close)');
    logger.info('  - 成交量 (Volume)');
    logger.info('  - 調整收盤價 (Adj Close)');
    
    logger.info('\n✓ 可計算的技術指標:');
    logger.info('  - 移動平均線 (MA)');
    logger.info('  - 相對強弱指數 (RSI)');
    logger.info('  - 波動率 (Volatility)');
    logger.info('  - 價格變化率');
    logger.info('  - 成交量分析');
    
    logger.info('\n⚠️ 需要自行計算的指標:');
    logger.info('  - MACD');
    logger.info('  - 布林通道');
    logger.info('  - KD指標');
    logger.info('  - 其他進階技術指標');
    
  } catch (error) {
    logger.error(`檢查歷史資料失敗: ${error.message}`);
  }
}

// 執行檢查
checkHistoricalData().catch(error => {
  logger.error(`程式執行失敗: ${error.message}`);
  process.exit(1);
});
