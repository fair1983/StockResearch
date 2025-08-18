// 定義 Candle 類型
const Candle = {
  time: String,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number
};

// 移動平均線 (MA)
function calculateMA(data, period) {
  const ma = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      ma.push(sum / period);
    }
  }
  
  return ma;
}

// 指數移動平均線 (EMA)
function calculateEMA(data, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i].close);
    } else {
      const newEMA = (data[i].close * multiplier) + (ema[i - 1] * (1 - multiplier));
      ema.push(newEMA);
    }
  }
  
  return ema;
}

// MACD
function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const ema12 = calculateEMA(data, fastPeriod);
  const ema26 = calculateEMA(data, slowPeriod);
  
  const macdLine = ema12.map((fast, i) => fast - ema26[i]);
  const signalLine = calculateEMA(macdLine.map((value, i) => ({ close: value })), signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

// RSI
function calculateRSI(data, period = 14) {
  const rsi = [];
  const gains = [];
  const losses = [];
  
  // 計算價格變化
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // 計算RSI
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(NaN);
    } else {
      const avgGain = gains.slice(i - period, i).reduce((acc, gain) => acc + gain, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((acc, loss) => acc + loss, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return rsi;
}

// 主函數：計算所有技術指標
function calculateAllIndicators(data) {
  return {
    ma5: calculateMA(data, 5),
    ma10: calculateMA(data, 10),
    ma20: calculateMA(data, 20),
    ema12: calculateEMA(data, 12),
    ema26: calculateEMA(data, 26),
    macd: calculateMACD(data),
    rsi: calculateRSI(data),
    volume: data.map(candle => candle.volume)
  };
}

// 模擬測試資料
const testData = [
  { time: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  { time: '2024-01-02', open: 103, high: 108, low: 101, close: 106, volume: 1200 },
  { time: '2024-01-03', open: 106, high: 110, low: 104, close: 109, volume: 1100 },
  { time: '2024-01-04', open: 109, high: 112, low: 107, close: 111, volume: 1300 },
  { time: '2024-01-05', open: 111, high: 115, low: 109, close: 114, volume: 1400 },
  { time: '2024-01-08', open: 114, high: 118, low: 112, close: 116, volume: 1500 },
  { time: '2024-01-09', open: 116, high: 120, low: 114, close: 118, volume: 1600 },
  { time: '2024-01-10', open: 118, high: 122, low: 116, close: 120, volume: 1700 },
  { time: '2024-01-11', open: 120, high: 124, low: 118, close: 122, volume: 1800 },
  { time: '2024-01-12', open: 122, high: 126, low: 120, close: 124, volume: 1900 },
  { time: '2024-01-15', open: 124, high: 128, low: 122, close: 126, volume: 2000 },
  { time: '2024-01-16', open: 126, high: 130, low: 124, close: 128, volume: 2100 },
  { time: '2024-01-17', open: 128, high: 132, low: 126, close: 130, volume: 2200 },
  { time: '2024-01-18', open: 130, high: 134, low: 128, close: 132, volume: 2300 },
  { time: '2024-01-19', open: 132, high: 136, low: 130, close: 134, volume: 2400 },
  { time: '2024-01-22', open: 134, high: 138, low: 132, close: 136, volume: 2500 },
  { time: '2024-01-23', open: 136, high: 140, low: 134, close: 138, volume: 2600 },
  { time: '2024-01-24', open: 138, high: 142, low: 136, close: 140, volume: 2700 },
  { time: '2024-01-25', open: 140, high: 144, low: 138, close: 142, volume: 2800 },
  { time: '2024-01-26', open: 142, high: 146, low: 140, close: 144, volume: 2900 },
  { time: '2024-01-29', open: 144, high: 148, low: 142, close: 146, volume: 3000 },
  { time: '2024-01-30', open: 146, high: 150, low: 144, close: 148, volume: 3100 },
  { time: '2024-01-31', open: 148, high: 152, low: 146, close: 150, volume: 3200 },
  { time: '2024-02-01', open: 150, high: 154, low: 148, close: 152, volume: 3300 },
  { time: '2024-02-02', open: 152, high: 156, low: 150, close: 154, volume: 3400 },
  { time: '2024-02-05', open: 154, high: 158, low: 152, close: 156, volume: 3500 },
  { time: '2024-02-06', open: 156, high: 160, low: 154, close: 158, volume: 3600 },
  { time: '2024-02-07', open: 158, high: 162, low: 156, close: 160, volume: 3700 },
  { time: '2024-02-08', open: 160, high: 164, low: 158, close: 162, volume: 3800 },
  { time: '2024-02-09', open: 162, high: 166, low: 160, close: 164, volume: 3900 },
  { time: '2024-02-12', open: 164, high: 168, low: 162, close: 166, volume: 4000 },
  { time: '2024-02-13', open: 166, high: 170, low: 164, close: 168, volume: 4100 },
  { time: '2024-02-14', open: 168, high: 172, low: 166, close: 170, volume: 4200 },
  { time: '2024-02-15', open: 170, high: 174, low: 168, close: 172, volume: 4300 },
  { time: '2024-02-16', open: 172, high: 176, low: 170, close: 174, volume: 4400 },
  { time: '2024-02-19', open: 174, high: 178, low: 172, close: 176, volume: 4500 },
  { time: '2024-02-20', open: 176, high: 180, low: 174, close: 178, volume: 4600 },
  { time: '2024-02-21', open: 178, high: 182, low: 176, close: 180, volume: 4700 },
  { time: '2024-02-22', open: 180, high: 184, low: 178, close: 182, volume: 4800 },
  { time: '2024-02-23', open: 182, high: 186, low: 180, close: 184, volume: 4900 },
  { time: '2024-02-26', open: 184, high: 188, low: 182, close: 186, volume: 5000 },
  { time: '2024-02-27', open: 186, high: 190, low: 184, close: 188, volume: 5100 },
  { time: '2024-02-28', open: 188, high: 192, low: 186, close: 190, volume: 5200 },
  { time: '2024-02-29', open: 190, high: 194, low: 188, close: 192, volume: 5300 },
];

console.log('測試 MACD 和 RSI 指標計算...');

try {
  const indicators = calculateAllIndicators(testData);
  
  console.log('\n=== MACD 指標 ===');
  console.log('最後 5 筆 MACD 值:');
  for (let i = Math.max(0, indicators.macd.macd.length - 5); i < indicators.macd.macd.length; i++) {
    console.log(`  第 ${i + 1} 筆: MACD=${indicators.macd.macd[i]?.toFixed(4) || 'NaN'}, Signal=${indicators.macd.signal[i]?.toFixed(4) || 'NaN'}, Histogram=${indicators.macd.histogram[i]?.toFixed(4) || 'NaN'}`);
  }
  
  console.log('\n=== RSI 指標 ===');
  console.log('最後 5 筆 RSI 值:');
  for (let i = Math.max(0, indicators.rsi.length - 5); i < indicators.rsi.length; i++) {
    console.log(`  第 ${i + 1} 筆: RSI=${indicators.rsi[i]?.toFixed(2) || 'NaN'}`);
  }
  
  console.log('\n=== 測試結果 ===');
  const hasValidMACD = indicators.macd.macd.some(v => !isNaN(v));
  const hasValidRSI = indicators.rsi.some(v => !isNaN(v));
  
  console.log(`MACD 計算: ${hasValidMACD ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`RSI 計算: ${hasValidRSI ? '✅ 成功' : '❌ 失敗'}`);
  
  if (hasValidMACD && hasValidRSI) {
    console.log('\n🎉 所有指標計算正常！');
  } else {
    console.log('\n⚠️  部分指標計算有問題，請檢查實作。');
  }
  
} catch (error) {
  console.error('❌ 測試執行失敗:', error);
}
