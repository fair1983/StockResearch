export interface HotStock {
  symbol: string;
  name: string;
  market: string;
  category: string;
  reason: string;
}

// 台股熱門股票
const TW_HOT_STOCKS: HotStock[] = [
  // 半導體
  { symbol: '2330', name: '台積電', market: 'TW', category: '半導體', reason: '全球晶圓代工龍頭' },
  { symbol: '2317', name: '鴻海', market: 'TW', category: '電子代工', reason: '全球最大電子代工廠' },
  { symbol: '2454', name: '聯發科', market: 'TW', category: '半導體', reason: '手機晶片設計大廠' },
  { symbol: '2308', name: '台達電', market: 'TW', category: '電子', reason: '電源管理領導廠商' },
  { symbol: '2412', name: '中華電', market: 'TW', category: '電信', reason: '電信業龍頭' },
  { symbol: '1301', name: '台塑', market: 'TW', category: '塑膠', reason: '塑膠業龍頭' },
  { symbol: '1303', name: '南亞', market: 'TW', category: '塑膠', reason: '塑膠業領導廠商' },
  { symbol: '2002', name: '中鋼', market: 'TW', category: '鋼鐵', reason: '鋼鐵業龍頭' },
  { symbol: '1216', name: '統一', market: 'TW', category: '食品', reason: '食品業龍頭' },
  { symbol: '2207', name: '和泰車', market: 'TW', category: '汽車', reason: '汽車業領導廠商' },
  { symbol: '2881', name: '富邦金', market: 'TW', category: '金融', reason: '金融業領導集團' },
  { symbol: '2882', name: '國泰金', market: 'TW', category: '金融', reason: '金融業領導集團' },
  { symbol: '3008', name: '大立光', market: 'TW', category: '光學', reason: '光學鏡頭領導廠商' },
  { symbol: '1476', name: '儒鴻', market: 'TW', category: '紡織', reason: '紡織業領導廠商' },
  { symbol: '1802', name: '台玻', market: 'TW', category: '其他', reason: '玻璃業領導廠商' },
  { symbol: '2542', name: '興富發', market: 'TW', category: '營建', reason: '營建業領導廠商' },
  
  // 熱門 ETF
  { symbol: '0050', name: '元大台灣50', market: 'TW', category: 'ETF', reason: '台灣50指數ETF' },
  { symbol: '0056', name: '元大高股息', market: 'TW', category: 'ETF', reason: '高股息ETF' },
  { symbol: '00878', name: '國泰永續高股息', market: 'TW', category: 'ETF', reason: 'ESG高股息ETF' },
  { symbol: '00892', name: '富邦台灣半導體', market: 'TW', category: 'ETF', reason: '半導體ETF' },
  { symbol: '0061', name: '元大寶滬深', market: 'TW', category: 'ETF', reason: '中國A股ETF' },
  { symbol: '00692', name: '富邦公司治理', market: 'TW', category: 'ETF', reason: '公司治理ETF' },
];

// 美股熱門股票
const US_HOT_STOCKS: HotStock[] = [
  // 科技股
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'US', category: '科技', reason: '全球科技巨頭' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US', category: '科技', reason: '軟體業龍頭' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US', category: '科技', reason: '搜尋引擎龍頭' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'US', category: '科技', reason: '電商巨頭' },
  { symbol: 'TSLA', name: 'Tesla Inc.', market: 'US', category: '科技', reason: '電動車領導廠商' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'US', category: '科技', reason: 'AI晶片領導廠商' },
  { symbol: 'META', name: 'Meta Platforms Inc.', market: 'US', category: '科技', reason: '社群媒體巨頭' },
  { symbol: 'NFLX', name: 'Netflix Inc.', market: 'US', category: '科技', reason: '串流媒體領導廠商' },
  
  // 金融股
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', market: 'US', category: '金融', reason: '美國最大銀行' },
  { symbol: 'BAC', name: 'Bank of America Corp.', market: 'US', category: '金融', reason: '美國大型銀行' },
  { symbol: 'WFC', name: 'Wells Fargo & Company', market: 'US', category: '金融', reason: '美國大型銀行' },
  
  // 消費品
  { symbol: 'KO', name: 'The Coca-Cola Company', market: 'US', category: '消費品', reason: '飲料業龍頭' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', market: 'US', category: '消費品', reason: '飲料食品巨頭' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', market: 'US', category: '消費品', reason: '日用品龍頭' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', market: 'US', category: '醫療', reason: '醫療保健巨頭' },
  
  // 能源
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', market: 'US', category: '能源', reason: '石油巨頭' },
  { symbol: 'CVX', name: 'Chevron Corporation', market: 'US', category: '能源', reason: '石油巨頭' },
  
  // 工業
  { symbol: 'BA', name: 'Boeing Co.', market: 'US', category: '工業', reason: '航空業龍頭' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', market: 'US', category: '工業', reason: '重工業設備龍頭' },
  
  // 熱門 ETF
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', market: 'US', category: 'ETF', reason: 'S&P 500指數ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', market: 'US', category: 'ETF', reason: 'NASDAQ-100指數ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', market: 'US', category: 'ETF', reason: '全市場ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', market: 'US', category: 'ETF', reason: 'S&P 500指數ETF' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', market: 'US', category: 'ETF', reason: '小型股指數ETF' },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', market: 'US', category: 'ETF', reason: '已開發市場ETF' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', market: 'US', category: 'ETF', reason: '新興市場ETF' },
];

export const ALL_HOT_STOCKS = [...TW_HOT_STOCKS, ...US_HOT_STOCKS];

export function getHotStocks(market?: string): HotStock[] {
  if (!market || market === 'ALL') {
    return ALL_HOT_STOCKS;
  }
  return ALL_HOT_STOCKS.filter(stock => stock.market === market);
}

export function isHotStock(symbol: string, market: string): boolean {
  return ALL_HOT_STOCKS.some(stock => stock.symbol === symbol && stock.market === market);
}

export function getHotStockReason(symbol: string, market: string): string | null {
  const stock = ALL_HOT_STOCKS.find(s => s.symbol === symbol && s.market === market);
  return stock ? stock.reason : null;
}
