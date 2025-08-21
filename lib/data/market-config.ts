import { DataStorageConfig, MarketType } from './yahoo-finance-collector';

/**
 * 市場配置
 */
export const marketConfig: DataStorageConfig = {
  baseDir: './data/yahoo-finance',
  markets: {
    US: {
      name: '美國股市',
      currency: 'USD',
      timezone: 'America/New_York',
      symbols: [
        // 科技股
        'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'ADBE',
        'CRM', 'ORCL', 'INTC', 'AMD', 'QCOM', 'AVGO', 'TXN', 'MU', 'AMAT', 'KLAC',
        'LRCX', 'ASML', 'TSM', 'SMCI', 'PLTR', 'SNOW', 'CRWD', 'ZS', 'OKTA', 'TEAM',
        
        // 金融股
        'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'COF',
        'AXP', 'BLK', 'SCHW', 'ICE', 'CME', 'SPGI', 'MCO', 'FICO', 'V', 'MA',
        
        // 醫療保健
        'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN',
        'GILD', 'CVS', 'ANTM', 'CI', 'HUM', 'ELV', 'ISRG', 'REGN', 'VRTX', 'BIIB',
        
        // 消費品
        'PG', 'KO', 'PEP', 'WMT', 'HD', 'MCD', 'SBUX', 'NKE', 'DIS', 'CMCSA',
        'VZ', 'T', 'TMUS', 'CHTR', 'CMG', 'YUM', 'TGT', 'COST', 'LOW', 'TJX',
        
        // 能源和工業
        'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'BA', 'CAT', 'GE', 'MMM', 'HON',
        'UPS', 'FDX', 'RTX', 'LMT', 'NOC', 'GD', 'DE', 'EMR', 'ETN', 'ITW'
      ]
    },
    TW: {
      name: '台灣股市',
      currency: 'TWD',
      timezone: 'Asia/Taipei',
      symbols: [
        // 半導體
        '2330.TW', '2317.TW', '2454.TW', '2308.TW', '2379.TW', '2449.TW', '3034.TW', '3008.TW',
        '2303.TW', '2408.TW', '2481.TW', '2458.TW', '2439.TW', '2441.TW', '2451.TW', '2376.TW',
        
        // 電子零組件
        '2327.TW', '2354.TW', '2357.TW', '2382.TW', '2392.TW', '2409.TW', '2412.TW', '2421.TW',
        '2436.TW', '2442.TW', '2450.TW', '2474.TW', '2480.TW', '2498.TW', '3005.TW', '3019.TW',
        
        // 金融業
        '2881.TW', '2882.TW', '2884.TW', '2885.TW', '2886.TW', '2887.TW', '2888.TW', '2889.TW',
        '2890.TW', '2891.TW', '2892.TW', '5871.TW', '5880.TW', '2880.TW', '2883.TW', '2801.TW',
        
        // 傳產
        '1301.TW', '1303.TW', '1326.TW', '1402.TW', '1419.TW', '1434.TW', '1440.TW', '1455.TW',
        '1476.TW', '1504.TW', '1513.TW', '1522.TW', '1536.TW', '1605.TW', '1702.TW', '1710.TW',
        
        // 其他科技
        '2002.TW', '2207.TW', '2301.TW', '2302.TW', '2313.TW', '2324.TW', '2337.TW', '2347.TW',
        '2353.TW', '2356.TW', '2360.TW', '2377.TW', '2383.TW', '2393.TW', '2404.TW', '2417.TW'
      ]
    },
    HK: {
      name: '香港股市',
      currency: 'HKD',
      timezone: 'Asia/Hong_Kong',
      symbols: [
        '0700.HK', '0941.HK', '0005.HK', '1299.HK', '0388.HK', '0939.HK', '1398.HK', '3988.HK',
        '2318.HK', '2628.HK', '3328.HK', '3968.HK', '6862.HK', '9618.HK', '9988.HK', '3690.HK'
      ]
    },
    JP: {
      name: '日本股市',
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      symbols: [
        '7203.T', '6758.T', '6861.T', '9984.T', '7974.T', '6954.T', '8306.T', '9433.T',
        '9432.T', '9434.T', '4502.T', '4519.T', '4523.T', '4568.T', '4578.T', '6501.T'
      ]
    },
    CN: {
      name: '中國股市',
      currency: 'CNY',
      timezone: 'Asia/Shanghai',
      symbols: [
        '000001.SZ', '000002.SZ', '000858.SZ', '002415.SZ', '002594.SZ', '300059.SZ',
        '600000.SS', '600036.SS', '600519.SS', '600887.SS', '601318.SS', '601398.SS'
      ]
    }
  }
};

/**
 * 獲取市場配置
 */
export function getMarketConfig(): DataStorageConfig {
  return marketConfig;
}

/**
 * 獲取特定市場的股票列表
 */
export function getMarketSymbols(market: MarketType): string[] {
  return marketConfig.markets[market]?.symbols || [];
}

/**
 * 獲取所有市場列表
 */
export function getAllMarkets(): MarketType[] {
  return Object.keys(marketConfig.markets) as MarketType[];
}

/**
 * 獲取市場信息
 */
export function getMarketInfo(market: MarketType) {
  return marketConfig.markets[market];
}
