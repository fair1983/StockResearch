import { Result } from '@/lib/core/result';

export interface StockData {
  代號: string;
  名稱: string;
  市場: string;
  交易所?: string;
  yahoo_symbol: string;
  ISIN?: string;
  上市日期?: string;
  產業?: string;
  ETF?: boolean;
  CIK?: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  market: string;
  category: string;
  exchange: string;
  exchangeName: string;
  yahoo_symbol?: string;
  source: 'local' | 'yahoo';
}

export interface StockRepository {
  /**
   * 搜尋股票
   */
  searchStocks(query: string, market?: string): Promise<Result<StockSearchResult[]>>;
  
  /**
   * 根據代號取得股票
   */
  getStockBySymbol(symbol: string, market?: string): Promise<Result<StockData | null>>;
  
  /**
   * 取得所有股票
   */
  getAllStocks(market?: string): Promise<Result<StockData[]>>;
  
  /**
   * 取得市場統計
   */
  getMarketStats(): Promise<Result<Record<string, number>>>;
  
  /**
   * 檢查股票是否存在
   */
  stockExists(symbol: string, market?: string): Promise<Result<boolean>>;
  
  /**
   * 重新載入資料
   */
  reload(): Promise<Result<void>>;
}
