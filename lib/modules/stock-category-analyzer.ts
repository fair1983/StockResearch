import { StockData } from '@/lib/interfaces/stock-repository';

export interface CategoryAnalysisResult {
  category: string;
  confidence: number;
  reasons: string[];
}

export class StockCategoryAnalyzer {
  private static readonly ETF_KEYWORDS = [
    'etf', 'fund', 'trust', 'index', 'portfolio', 'exchange traded fund',
    'spdr', 'ishares', 'vanguard', 'invesco', 'wisdomtree', 'proshares',
    'direxion', 'leveraged', 'inverse'
  ];

  private static readonly OPTION_PATTERNS = [
    /^[A-Z][A-Z0-9.]{0,6}\d{6}[CP]\d{8}$/i
  ];

  /**
   * 分析股票分類
   */
  analyzeCategory(stock: StockData): CategoryAnalysisResult {
    const reasons: string[] = [];
    let confidence = 0;

    // 檢查明確的 ETF 標記
    if (stock.ETF === true) {
      reasons.push('明確標記為 ETF');
      confidence += 50;
    }

    // 檢查名稱中的 ETF 關鍵字
    const name = stock.名稱.toLowerCase();
    const hasEtfKeywords = StockCategoryAnalyzer.ETF_KEYWORDS.some(keyword => 
      name.includes(keyword)
    );

    if (hasEtfKeywords) {
      reasons.push('名稱包含 ETF 相關關鍵字');
      confidence += 30;
    }

    // 檢查期權模式
    const isOption = StockCategoryAnalyzer.OPTION_PATTERNS.some(pattern => 
      pattern.test(stock.代號)
    );

    if (isOption) {
      reasons.push('代號符合期權格式');
      confidence += 40;
    }

    // 根據市場和代號格式判斷
    if (stock.市場 === '上市') {
      reasons.push('台股上市股票');
      confidence += 20;
    } else if (stock.市場 === 'NASDAQ' || stock.市場 === 'NYSE') {
      reasons.push('美股主要交易所');
      confidence += 15;
    }

    // 確定最終分類
    let category = 'stock';
    if (confidence >= 40 && (stock.ETF === true || hasEtfKeywords)) {
      category = 'etf';
    } else if (isOption) {
      category = 'option';
    }

    return {
      category,
      confidence: Math.min(confidence, 100),
      reasons
    };
  }

  /**
   * 取得所有可能的分類
   */
  getAllCategories(): string[] {
    return ['stock', 'etf', 'option'];
  }

  /**
   * 驗證分類是否有效
   */
  isValidCategory(category: string): boolean {
    return this.getAllCategories().includes(category);
  }
}
