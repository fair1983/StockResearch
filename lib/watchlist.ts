export interface WatchlistItem {
  symbol: string;
  name: string;
  market: string;
  category: string;
  addedAt: string;
}

export class WatchlistManager {
  private static STORAGE_KEY = 'stock_watchlist';

  // 獲取所有關注股票
  static getWatchlist(): WatchlistItem[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load watchlist:', error);
      return [];
    }
  }

  // 添加股票到關注列表
  static addToWatchlist(item: Omit<WatchlistItem, 'addedAt'>): boolean {
    try {
      const watchlist = this.getWatchlist();
      const existingIndex = watchlist.findIndex(
        w => w.symbol === item.symbol && w.market === item.market
      );
      
      if (existingIndex >= 0) {
        return false; // 已經存在
      }
      
      const newItem: WatchlistItem = {
        ...item,
        addedAt: new Date().toISOString()
      };
      
      watchlist.push(newItem);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(watchlist));
      return true;
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
      return false;
    }
  }

  // 從關注列表移除股票
  static removeFromWatchlist(symbol: string, market: string): boolean {
    try {
      const watchlist = this.getWatchlist();
      const filtered = watchlist.filter(
        w => !(w.symbol === symbol && w.market === market)
      );
      
      if (filtered.length === watchlist.length) {
        return false; // 沒有找到要移除的項目
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
      return false;
    }
  }

  // 檢查股票是否在關注列表中
  static isInWatchlist(symbol: string, market: string): boolean {
    const watchlist = this.getWatchlist();
    return watchlist.some(w => w.symbol === symbol && w.market === market);
  }

  // 清空關注列表
  static clearWatchlist(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear watchlist:', error);
      return false;
    }
  }

  // 獲取關注列表統計
  static getWatchlistStats() {
    const watchlist = this.getWatchlist();
    const marketStats = watchlist.reduce((acc, item) => {
      acc[item.market] = (acc[item.market] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const categoryStats = watchlist.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: watchlist.length,
      byMarket: marketStats,
      byCategory: categoryStats
    };
  }
}
