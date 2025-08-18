import { NextRequest, NextResponse } from 'next/server';
import { Market } from '@/types';
import { logger } from '@/lib/logger';

// 台灣主要股票列表
const TW_STOCKS = [
  // 台積電相關
  { symbol: '2330', name: '台積電', category: '半導體' },
  { symbol: '2317', name: '鴻海', category: '電子代工' },
  { symbol: '2454', name: '聯發科', category: '半導體' },
  { symbol: '2412', name: '中華電', category: '電信' },
  { symbol: '1301', name: '台塑', category: '塑膠' },
  { symbol: '1303', name: '南亞', category: '塑膠' },
  { symbol: '2002', name: '中鋼', category: '鋼鐵' },
  { symbol: '1216', name: '統一', category: '食品' },
  { symbol: '2207', name: '和泰車', category: '汽車' },
  { symbol: '2881', name: '富邦金', category: '金融' },
  { symbol: '2882', name: '國泰金', category: '金融' },
  { symbol: '2884', name: '玉山金', category: '金融' },
  { symbol: '2885', name: '元大金', category: '金融' },
  { symbol: '2891', name: '中信金', category: '金融' },
  { symbol: '2308', name: '台達電', category: '電子' },
  { symbol: '2303', name: '聯電', category: '半導體' },
  { symbol: '2377', name: '微星', category: '電子' },
  { symbol: '2354', name: '鴻準', category: '電子' },
  { symbol: '2357', name: '華碩', category: '電子' },
  { symbol: '2382', name: '廣達', category: '電子' },
  { symbol: '2408', name: '南亞科', category: '半導體' },
  { symbol: '2417', name: '圓剛', category: '電子' },
  { symbol: '2439', name: '美律', category: '電子' },
  { symbol: '2449', name: '京元電子', category: '半導體' },
  { symbol: '2458', name: '義隆', category: '半導體' },
  { symbol: '2481', name: '強茂', category: '半導體' },
  { symbol: '2498', name: '宏達電', category: '電子' },
  { symbol: '3008', name: '大立光', category: '光學' },
  { symbol: '3034', name: '聯詠', category: '半導體' },
  { symbol: '3045', name: '台灣大', category: '電信' },
  { symbol: '3231', name: '緯創', category: '電子' },
  { symbol: '3711', name: '日月光投控', category: '半導體' },
  { symbol: '4938', name: '和碩', category: '電子' },
  { symbol: '5871', name: '中租-KY', category: '金融' },
  { symbol: '5880', name: '合庫金', category: '金融' },
  { symbol: '6505', name: '台塑化', category: '塑膠' },
  { symbol: '9904', name: '寶成', category: '紡織' },
  { symbol: '9910', name: '豐泰', category: '紡織' },
  { symbol: '9921', name: '巨大', category: '其他' },
  { symbol: '9945', name: '潤泰新', category: '營建' },
  { symbol: '9958', name: '世紀鋼', category: '鋼鐵' },
];

// 台灣主要 ETF 列表
const TW_ETFS = [
  { symbol: '0050', name: '元大台灣50', category: 'ETF' },
  { symbol: '0056', name: '元大高股息', category: 'ETF' },
  { symbol: '00878', name: '國泰永續高股息', category: 'ETF' },
  { symbol: '00881', name: '國泰台灣5G+', category: 'ETF' },
  { symbol: '00892', name: '富邦台灣半導體', category: 'ETF' },
  { symbol: '00929', name: '復華台灣科技', category: 'ETF' },
  { symbol: '00930', name: '永豐台灣ESG', category: 'ETF' },
  { symbol: '00935', name: '野村台灣創新科技', category: 'ETF' },
  { symbol: '00939', name: '統一台灣高息動能', category: 'ETF' },
  { symbol: '00940', name: '元大台灣價值高息', category: 'ETF' },
  { symbol: '00941', name: '中信上游半導體', category: 'ETF' },
  { symbol: '00942', name: '中信小資高價30', category: 'ETF' },
  { symbol: '00943', name: '兆豐台灣晶圓製造', category: 'ETF' },
  { symbol: '00944', name: '野村趨勢動能高息', category: 'ETF' },
  { symbol: '00945', name: '野村台灣創新科技50', category: 'ETF' },
  { symbol: '00946', name: '群益台灣精選高息', category: 'ETF' },
  { symbol: '00947', name: '統一台灣高息動能', category: 'ETF' },
  { symbol: '00948', name: '元大台灣高息低波', category: 'ETF' },
  { symbol: '00949', name: '富邦台灣半導體', category: 'ETF' },
  { symbol: '00950', name: '元大台灣高息低波', category: 'ETF' },
];

// 美國主要股票列表
const US_STOCKS = [
  // 科技股
  { symbol: 'AAPL', name: 'Apple Inc.', category: '科技' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: '科技' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: '科技' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: '科技' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: '汽車' },
  { symbol: 'META', name: 'Meta Platforms Inc.', category: '科技' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: '科技' },
  { symbol: 'NFLX', name: 'Netflix Inc.', category: '科技' },
  { symbol: 'ADBE', name: 'Adobe Inc.', category: '科技' },
  { symbol: 'CRM', name: 'Salesforce Inc.', category: '科技' },
  { symbol: 'ORCL', name: 'Oracle Corporation', category: '科技' },
  { symbol: 'INTC', name: 'Intel Corporation', category: '科技' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: '科技' },
  { symbol: 'QCOM', name: 'Qualcomm Incorporated', category: '科技' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', category: '科技' },
  { symbol: 'TXN', name: 'Texas Instruments', category: '科技' },
  { symbol: 'MU', name: 'Micron Technology', category: '科技' },
  { symbol: 'IBM', name: 'International Business Machines', category: '科技' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', category: '科技' },
  
  // 金融股
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', category: '金融' },
  { symbol: 'BAC', name: 'Bank of America Corp.', category: '金融' },
  { symbol: 'WFC', name: 'Wells Fargo & Company', category: '金融' },
  { symbol: 'GS', name: 'Goldman Sachs Group Inc.', category: '金融' },
  { symbol: 'MS', name: 'Morgan Stanley', category: '金融' },
  { symbol: 'C', name: 'Citigroup Inc.', category: '金融' },
  { symbol: 'AXP', name: 'American Express Company', category: '金融' },
  { symbol: 'BLK', name: 'BlackRock Inc.', category: '金融' },
  { symbol: 'SCHW', name: 'Charles Schwab Corporation', category: '金融' },
  
  // 醫療保健
  { symbol: 'JNJ', name: 'Johnson & Johnson', category: '醫療' },
  { symbol: 'PFE', name: 'Pfizer Inc.', category: '醫療' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', category: '醫療' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', category: '醫療' },
  { symbol: 'MRK', name: 'Merck & Co. Inc.', category: '醫療' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific', category: '醫療' },
  { symbol: 'ABT', name: 'Abbott Laboratories', category: '醫療' },
  { symbol: 'DHR', name: 'Danaher Corporation', category: '醫療' },
  { symbol: 'BMY', name: 'Bristol-Myers Squibb', category: '醫療' },
  { symbol: 'AMGN', name: 'Amgen Inc.', category: '醫療' },
  
  // 消費品
  { symbol: 'PG', name: 'Procter & Gamble Co.', category: '消費品' },
  { symbol: 'KO', name: 'Coca-Cola Company', category: '消費品' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', category: '消費品' },
  { symbol: 'WMT', name: 'Walmart Inc.', category: '零售' },
  { symbol: 'HD', name: 'Home Depot Inc.', category: '零售' },
  { symbol: 'MCD', name: 'McDonald\'s Corporation', category: '餐飲' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', category: '餐飲' },
  { symbol: 'NKE', name: 'NIKE Inc.', category: '消費品' },
  { symbol: 'DIS', name: 'Walt Disney Company', category: '媒體' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', category: '媒體' },
  
  // 能源
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', category: '能源' },
  { symbol: 'CVX', name: 'Chevron Corporation', category: '能源' },
  { symbol: 'COP', name: 'ConocoPhillips', category: '能源' },
  { symbol: 'EOG', name: 'EOG Resources Inc.', category: '能源' },
  { symbol: 'SLB', name: 'Schlumberger Limited', category: '能源' },
  
  // 工業
  { symbol: 'BA', name: 'Boeing Company', category: '工業' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', category: '工業' },
  { symbol: 'GE', name: 'General Electric Company', category: '工業' },
  { symbol: 'HON', name: 'Honeywell International', category: '工業' },
  { symbol: 'MMM', name: '3M Company', category: '工業' },
  { symbol: 'UPS', name: 'United Parcel Service', category: '運輸' },
  { symbol: 'FDX', name: 'FedEx Corporation', category: '運輸' },
  
  // 通訊
  { symbol: 'VZ', name: 'Verizon Communications', category: '通訊' },
  { symbol: 'T', name: 'AT&T Inc.', category: '通訊' },
  { symbol: 'TMUS', name: 'T-Mobile US Inc.', category: '通訊' },
  
  // 其他
  { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', category: '投資' },
  { symbol: 'V', name: 'Visa Inc.', category: '金融' },
  { symbol: 'MA', name: 'Mastercard Incorporated', category: '金融' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', category: '科技' },
  { symbol: 'SQ', name: 'Block Inc.', category: '科技' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', category: '科技' },
  { symbol: 'LYFT', name: 'Lyft Inc.', category: '科技' },
  { symbol: 'SPOT', name: 'Spotify Technology S.A.', category: '科技' },
  { symbol: 'ZM', name: 'Zoom Video Communications', category: '科技' },
  { symbol: 'SHOP', name: 'Shopify Inc.', category: '科技' },
  { symbol: 'ROKU', name: 'Roku Inc.', category: '科技' },
  { symbol: 'SNAP', name: 'Snap Inc.', category: '科技' },
  { symbol: 'TWTR', name: 'Twitter Inc.', category: '科技' },
];

// 美國主要 ETF 列表
const US_ETFS = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'ETF' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', category: 'ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'ETF' },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', category: 'ETF' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', category: 'ETF' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', category: 'ETF' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', category: 'ETF' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', category: 'ETF' },
  { symbol: 'SLV', name: 'iShares Silver Trust', category: 'ETF' },
  { symbol: 'USO', name: 'United States Oil Fund LP', category: 'ETF' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund', category: 'ETF' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', category: 'ETF' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund', category: 'ETF' },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR Fund', category: 'ETF' },
  { symbol: 'XLI', name: 'Industrial Select Sector SPDR Fund', category: 'ETF' },
  { symbol: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund', category: 'ETF' },
  { symbol: 'XLY', name: 'Consumer Discretionary Select Sector SPDR Fund', category: 'ETF' },
  { symbol: 'XLU', name: 'Utilities Select Sector SPDR Fund', category: 'ETF' },
  { symbol: 'XLB', name: 'Materials Select Sector SPDR Fund', category: 'ETF' },
  { symbol: 'XLRE', name: 'Real Estate Select Sector SPDR Fund', category: 'ETF' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') as Market;
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();
    
    logger.api.request('Symbols API Request', { market, category, search });
    
    let symbols: any[] = [];
    
    if (market === 'TW') {
      symbols = [...TW_STOCKS, ...TW_ETFS];
    } else if (market === 'US') {
      symbols = [...US_STOCKS, ...US_ETFS];
    } else {
      // 如果沒有指定市場，返回所有股票
      symbols = [
        ...TW_STOCKS.map(s => ({ ...s, market: 'TW' as Market })),
        ...TW_ETFS.map(s => ({ ...s, market: 'TW' as Market })),
        ...US_STOCKS.map(s => ({ ...s, market: 'US' as Market })),
        ...US_ETFS.map(s => ({ ...s, market: 'US' as Market })),
      ];
    }
    
    // 按類別篩選
    if (category) {
      symbols = symbols.filter(s => s.category === category);
    }
    
    // 按搜尋關鍵字篩選
    if (search) {
      symbols = symbols.filter(s => 
        s.symbol.toLowerCase().includes(search) ||
        s.name.toLowerCase().includes(search)
      );
    }
    
    // 按代碼排序
    symbols.sort((a, b) => a.symbol.localeCompare(b.symbol));
    
    logger.api.response('Symbols API Response', { 
      totalSymbols: symbols.length,
      market,
      category,
      search 
    });
    
    return NextResponse.json({
      market,
      symbols,
      total: symbols.length,
      categories: market ? 
        [...new Set(symbols.map(s => s.category))].sort() :
        ['TW', 'US']
    });
    
  } catch (error) {
    logger.api.error('Symbols API error', error);
    return NextResponse.json(
      { error: '內部伺服器錯誤' },
      { status: 500 }
    );
  }
}
