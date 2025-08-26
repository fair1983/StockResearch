import path from 'path';

export interface StockConfig {
  dataDir: string;
  primaryFilePattern: string;
  fallbackFiles: string[];
  maxSearchResults: number;
  supportedMarkets: string[];
  supportedCategories: string[];
}

export class StockConfigManager {
  private static instance: StockConfigManager;
  private config: StockConfig;

  private constructor() {
    this.config = this.loadDefaultConfig();
  }

  static getInstance(): StockConfigManager {
    if (!StockConfigManager.instance) {
      StockConfigManager.instance = new StockConfigManager();
    }
    return StockConfigManager.instance;
  }

  getConfig(): StockConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<StockConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  private loadDefaultConfig(): StockConfig {
    return {
      dataDir: path.join(process.cwd(), 'data'),
      primaryFilePattern: 'stocks_data_',
      fallbackFiles: ['tw_all_stocks.jsonl', 'us_all_stocks.jsonl', 'stocks.json'],
      maxSearchResults: 50,
      supportedMarkets: ['上市', '上櫃', 'NASDAQ', 'NYSE', 'NYSEARCA'],
      supportedCategories: ['stock', 'etf', 'option']
    };
  }
}
