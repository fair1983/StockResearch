// 測試產業代碼顯示功能
function getSectorDisplayName(sector) {
  if (!sector || sector === 'Unknown' || sector === '不能評定') {
    return '不能評定';
  }

  // 台股產業代碼映射
  const twSectorMap = {
    '01': '水泥工業',
    '02': '食品工業',
    '03': '塑膠工業',
    '04': '紡織纖維',
    '05': '電機機械',
    '06': '電器電纜',
    '07': '化學生技醫療',
    '08': '玻璃陶瓷',
    '09': '造紙工業',
    '10': '鋼鐵工業',
    '11': '橡膠工業',
    '12': '汽車工業',
    '13': '電子工業',
    '14': '建材營造',
    '15': '航運業',
    '16': '觀光事業',
    '17': '金融保險',
    '18': '貿易百貨',
    '19': '綜合',
    '20': '其他',
    '21': '油電燃氣業',
    '22': '半導體業',
    '23': '電腦及週邊設備業',
    '24': '光電業',
    '25': '通信網路業',
    '26': '電子零組件業',
    '27': '電子通路業',
    '28': '資訊服務業',
    '29': '其他電子業',
    '30': '文化創意業',
    '31': '農業科技業',
    '32': '電子商務業',
    '33': '居家生活業',
    '34': '數位雲端業',
    '35': '運動休閒業',
    '36': '綠能環保業',
    '37': '生技醫療業',
    '38': '汽車業',
    '39': '半導體業',
    '40': '電腦及週邊設備業',
    '41': '光電業',
    '42': '通信網路業',
    '43': '電子零組件業',
    '44': '電子通路業',
    '45': '資訊服務業',
    '46': '其他電子業',
    '47': '文化創意業',
    '48': '農業科技業',
    '49': '電子商務業',
    '50': '居家生活業'
  };

  // 如果是數字代碼，查找對應的產業名稱
  if (twSectorMap[sector]) {
    return twSectorMap[sector];
  }

  // 如果是英文產業名稱，直接返回
  return sector;
}

// 測試案例
const testCases = [
  { symbol: '1104', sector: '01', expected: '水泥工業' },
  { symbol: '1201', sector: '02', expected: '食品工業' },
  { symbol: '2330', sector: '22', expected: '半導體業' },
  { symbol: 'AAPL', sector: 'Technology', expected: 'Technology' },
  { symbol: 'MSFT', sector: 'Technology', expected: 'Technology' },
  { symbol: 'JPM', sector: 'Financial Services', expected: 'Financial Services' },
  { symbol: 'UNKNOWN', sector: 'Unknown', expected: '不能評定' },
  { symbol: 'EMPTY', sector: '', expected: '不能評定' },
  { symbol: 'NULL', sector: null, expected: '不能評定' },
  { symbol: 'INVALID', sector: '99', expected: '99' }
];

console.log('🔍 測試產業代碼顯示功能...\n');

testCases.forEach((testCase, index) => {
  const result = getSectorDisplayName(testCase.sector);
  const status = result === testCase.expected ? '✅' : '❌';
  console.log(`${status} 測試 ${index + 1}: ${testCase.symbol} (${testCase.sector})`);
  console.log(`   期望: ${testCase.expected}`);
  console.log(`   實際: ${result}`);
  console.log('');
});

console.log('🎯 產業代碼顯示測試完成！');
