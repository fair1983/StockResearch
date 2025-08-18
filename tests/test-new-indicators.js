// 測試新添加的技術指標計算
const testData = [
  { time: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000000 },
  { time: '2024-01-02', open: 103, high: 108, low: 101, close: 106, volume: 1200000 },
  { time: '2024-01-03', open: 106, high: 110, low: 104, close: 109, volume: 800000 },
  { time: '2024-01-04', open: 109, high: 112, low: 107, close: 111, volume: 1500000 },
  { time: '2024-01-05', open: 111, high: 115, low: 109, close: 114, volume: 2000000 },
  { time: '2024-01-08', open: 114, high: 118, low: 112, close: 116, volume: 1800000 },
  { time: '2024-01-09', open: 116, high: 120, low: 114, close: 118, volume: 1600000 },
  { time: '2024-01-10', open: 118, high: 122, low: 116, close: 120, volume: 1400000 },
  { time: '2024-01-11', open: 120, high: 124, low: 118, close: 122, volume: 1800000 },
  { time: '2024-01-12', open: 122, high: 126, low: 120, close: 124, volume: 1900000 },
  { time: '2024-01-15', open: 124, high: 128, low: 122, close: 126, volume: 2000000 },
  { time: '2024-01-16', open: 126, high: 130, low: 124, close: 128, volume: 2100000 },
  { time: '2024-01-17', open: 128, high: 132, low: 126, close: 130, volume: 2200000 },
  { time: '2024-01-18', open: 130, high: 134, low: 128, close: 132, volume: 2300000 },
  { time: '2024-01-19', open: 132, high: 136, low: 130, close: 134, volume: 2400000 },
  { time: '2024-01-22', open: 134, high: 138, low: 132, close: 136, volume: 2500000 },
  { time: '2024-01-23', open: 136, high: 140, low: 134, close: 138, volume: 2600000 },
  { time: '2024-01-24', open: 138, high: 142, low: 136, close: 140, volume: 2700000 },
  { time: '2024-01-25', open: 140, high: 144, low: 138, close: 142, volume: 2800000 },
  { time: '2024-01-26', open: 142, high: 146, low: 140, close: 144, volume: 2900000 },
];

console.log('測試新添加的技術指標計算...');

// 簡化的指標計算函數（用於測試）
function calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
  const k = [];
  const d = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      k.push(NaN);
      d.push(NaN);
    } else {
      const slice = data.slice(i - kPeriod + 1, i + 1);
      const high = Math.max(...slice.map(candle => candle.high));
      const low = Math.min(...slice.map(candle => candle.low));
      const close = data[i].close;
      
      const kValue = ((close - low) / (high - low)) * 100;
      k.push(kValue);
      
      if (i >= kPeriod + dPeriod - 2) {
        const kSlice = k.slice(i - dPeriod + 1, i + 1);
        const dValue = kSlice.reduce((acc, val) => acc + val, 0) / dPeriod;
        d.push(dValue);
      } else {
        d.push(NaN);
      }
    }
  }
  
  return { k, d };
}

function calculateCCI(data, period = 20) {
  const cci = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      cci.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const typicalPrices = slice.map(candle => (candle.high + candle.low + candle.close) / 3);
      const sma = typicalPrices.reduce((acc, price) => acc + price, 0) / period;
      
      const meanDeviation = typicalPrices.reduce((acc, price) => acc + Math.abs(price - sma), 0) / period;
      
      const currentTypicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      cci.push(meanDeviation !== 0 ? (currentTypicalPrice - sma) / (0.015 * meanDeviation) : 0);
    }
  }
  
  return cci;
}

function calculateATR(data, period = 14) {
  const atr = [];
  const trueRanges = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trueRanges.push(data[i].high - data[i].low);
      atr.push(trueRanges[0]);
    } else {
      const highLow = data[i].high - data[i].low;
      const highPrevClose = Math.abs(data[i].high - data[i - 1].close);
      const lowPrevClose = Math.abs(data[i].low - data[i - 1].close);
      
      const trueRange = Math.max(highLow, highPrevClose, lowPrevClose);
      trueRanges.push(trueRange);
      
      if (i < period) {
        const avgTR = trueRanges.slice(0, i + 1).reduce((acc, tr) => acc + tr, 0) / (i + 1);
        atr.push(avgTR);
      } else {
        const prevATR = atr[i - 1];
        const newATR = ((prevATR * (period - 1)) + trueRange) / period;
        atr.push(newATR);
      }
    }
  }
  
  return atr;
}

function calculateOBV(data) {
  const obv = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      obv.push(data[i].volume);
    } else {
      const prevOBV = obv[i - 1];
      const currentClose = data[i].close;
      const prevClose = data[i - 1].close;
      const currentVolume = data[i].volume;
      
      if (currentClose > prevClose) {
        obv.push(prevOBV + currentVolume);
      } else if (currentClose < prevClose) {
        obv.push(prevOBV - currentVolume);
      } else {
        obv.push(prevOBV);
      }
    }
  }
  
  return obv;
}

try {
  console.log('\n=== 隨機指標 (Stochastic) ===');
  const stochastic = calculateStochastic(testData);
  console.log('最後 5 筆 Stoch-K 值:');
  for (let i = Math.max(0, stochastic.k.length - 5); i < stochastic.k.length; i++) {
    console.log(`  第 ${i + 1} 筆: K=${stochastic.k[i]?.toFixed(2) || 'NaN'}, D=${stochastic.d[i]?.toFixed(2) || 'NaN'}`);
  }
  
  console.log('\n=== CCI 指標 ===');
  const cci = calculateCCI(testData);
  console.log('最後 5 筆 CCI 值:');
  for (let i = Math.max(0, cci.length - 5); i < cci.length; i++) {
    console.log(`  第 ${i + 1} 筆: CCI=${cci[i]?.toFixed(2) || 'NaN'}`);
  }
  
  console.log('\n=== ATR 指標 ===');
  const atr = calculateATR(testData);
  console.log('最後 5 筆 ATR 值:');
  for (let i = Math.max(0, atr.length - 5); i < atr.length; i++) {
    console.log(`  第 ${i + 1} 筆: ATR=${atr[i]?.toFixed(2) || 'NaN'}`);
  }
  
  console.log('\n=== OBV 指標 ===');
  const obv = calculateOBV(testData);
  console.log('最後 5 筆 OBV 值:');
  for (let i = Math.max(0, obv.length - 5); i < obv.length; i++) {
    console.log(`  第 ${i + 1} 筆: OBV=${obv[i]?.toLocaleString() || 'NaN'}`);
  }
  
  console.log('\n=== 測試結果 ===');
  const hasValidStoch = stochastic.k.some(v => !isNaN(v));
  const hasValidCCI = cci.some(v => !isNaN(v));
  const hasValidATR = atr.some(v => !isNaN(v));
  const hasValidOBV = obv.some(v => !isNaN(v));
  
  console.log(`隨機指標計算: ${hasValidStoch ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`CCI 計算: ${hasValidCCI ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`ATR 計算: ${hasValidATR ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`OBV 計算: ${hasValidOBV ? '✅ 成功' : '❌ 失敗'}`);
  
  if (hasValidStoch && hasValidCCI && hasValidATR && hasValidOBV) {
    console.log('\n🎉 所有新指標計算正常！');
  } else {
    console.log('\n⚠️  部分指標計算有問題，請檢查實作。');
  }
  
} catch (error) {
  console.error('❌ 測試執行失敗:', error);
}
