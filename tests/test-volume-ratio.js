// 測試成交量比例計算
const testData = [
  { time: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000000 },
  { time: '2024-01-02', open: 103, high: 108, low: 101, close: 106, volume: 1200000 },
  { time: '2024-01-03', open: 106, high: 110, low: 104, close: 109, volume: 800000 },
  { time: '2024-01-04', open: 109, high: 112, low: 107, close: 111, volume: 1500000 },
  { time: '2024-01-05', open: 111, high: 115, low: 109, close: 114, volume: 2000000 },
  { time: '2024-01-08', open: 114, high: 118, low: 112, close: 116, volume: 1800000 },
  { time: '2024-01-09', open: 116, high: 120, low: 114, close: 118, volume: 1600000 },
  { time: '2024-01-10', open: 118, high: 122, low: 116, close: 120, volume: 1400000 },
];

console.log('測試成交量比例計算...');

// 計算成交量的最大值，用於比例計算
const volumes = testData.map(d => d.volume);
const validVolumes = volumes.filter(v => typeof v === 'number' && v > 0);
const maxVolume = validVolumes.length > 0 ? Math.max(...validVolumes) : 1;

console.log('\n=== 原始成交量 ===');
volumes.forEach((volume, i) => {
  console.log(`第 ${i + 1} 筆: ${volume.toLocaleString()}`);
});

console.log(`\n最大成交量: ${maxVolume.toLocaleString()}`);

console.log('\n=== 比例計算結果 ===');
volumes.forEach((volume, i) => {
  const volumeRatio = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
  console.log(`第 ${i + 1} 筆: ${volume.toLocaleString()} → ${volumeRatio.toFixed(2)}%`);
});

console.log('\n=== 格式化顯示測試 ===');
volumes.forEach((volume, i) => {
  const formatted = volume >= 1000 ? (volume / 1000).toFixed(1) + 'K' : Math.round(volume);
  console.log(`第 ${i + 1} 筆: ${volume.toLocaleString()} → ${formatted}`);
});

console.log('\n✅ 成交量比例計算測試完成！');
