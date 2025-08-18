import stocksData from '@/data/stocks.json';

export interface StockInfo {
  symbol: string;
  name: string;
  category: string;
  market: string;
}

export function getStockName(market: string, symbol: string): string {
  try {
    const marketData = stocksData.stocks[market as keyof typeof stocksData.stocks];
    if (!marketData) return `${symbol} (${market} | unknown | ${symbol})`;

    // 搜尋股票
    const stock = marketData.stocks?.find(s => s.symbol === symbol);
    if (stock) return `${stock.name} (${market} | ${stock.category} | ${symbol})`;

    // 搜尋 ETF
    const etf = marketData.etfs?.find(e => e.symbol === symbol);
    if (etf) return `${etf.name} (${market} | ${etf.category} | ${symbol})`;

    return `${symbol} (${market} | unknown | ${symbol})`;
  } catch (error) {
    console.error('Error getting stock name:', error);
    return `${symbol} (${market} | error | ${symbol})`;
  }
}

export function getStockInfo(market: string, symbol: string): StockInfo | null {
  try {
    const marketData = stocksData.stocks[market as keyof typeof stocksData.stocks];
    if (!marketData) return null;

    // 搜尋股票
    const stock = marketData.stocks?.find(s => s.symbol === symbol);
    if (stock) return stock;

    // 搜尋 ETF
    const etf = marketData.etfs?.find(e => e.symbol === symbol);
    if (etf) return etf;

    return null;
  } catch (error) {
    console.error('Error getting stock info:', error);
    return null;
  }
}
