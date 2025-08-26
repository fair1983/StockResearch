import fs from 'fs/promises';
import path from 'path';

export interface StockScore {
  symbol: string;
  market: string;
  name?: string;
  overallScore: number;
  fundamentalScore: number;
  technicalScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedStrategy: 'Buy' | 'Hold' | 'Avoid';
  confidence: number;
  sector?: string;
  industry?: string;
  lastUpdated: string;
  quote?: {
    price: number;
    change: number;
    changePct: number;
    volume?: number;
    marketCap?: number;
  };
}

export interface DailyScoreStorage {
  date: string;
  market: string;
  totalStocks: number;
  scores: StockScore[];
  summary: {
    buy: number;
    hold: number;
    avoid: number;
    avgScore: number;
    avgConfidence: number;
  };
}

export class ScoreStorageManager {
  private baseDir: string;

  constructor(baseDir: string = 'data/scores') {
    this.baseDir = baseDir;
  }

  /**
   * 儲存每日評分結果
   */
  async saveDailyScores(market: string, scores: StockScore[]): Promise<void> {
    try {
      // 確保目錄存在
      await this.ensureDirectoryExists();

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `${market}-scores-${today}.json`;
      const filepath = path.join(this.baseDir, filename);

      // 計算統計摘要
      const summary = this.calculateSummary(scores);

      const storage: DailyScoreStorage = {
        date: today,
        market,
        totalStocks: scores.length,
        scores,
        summary
      };

      // 儲存到檔案
      await fs.writeFile(filepath, JSON.stringify(storage, null, 2), 'utf-8');
      console.log(`✅ 評分結果已儲存: ${filepath} (${scores.length} 支股票)`);

      // 更新最新評分檔案
      await this.updateLatestScores(market, scores, summary);

    } catch (error) {
      console.error('❌ 儲存評分結果失敗:', error);
      throw error;
    }
  }

  /**
   * 讀取指定日期的評分結果
   */
  async loadDailyScores(market: string, date: string): Promise<DailyScoreStorage | null> {
    try {
      const filename = `${market}-scores-${date}.json`;
      const filepath = path.join(this.baseDir, filename);

      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content) as DailyScoreStorage;
    } catch (error) {
      console.warn(`⚠️  無法讀取 ${date} 的評分結果:`, error);
      return null;
    }
  }

  /**
   * 讀取最新的評分結果
   */
  async loadLatestScores(market: string): Promise<StockScore[]> {
    try {
      const filename = `${market}-scores-latest.json`;
      const filepath = path.join(this.baseDir, filename);

      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);
      return data.scores || [];
    } catch (error) {
      console.warn(`⚠️  無法讀取 ${market} 最新評分結果:`, error);
      return [];
    }
  }

  /**
   * 檢查今日是否已有評分結果
   */
  async hasTodayScores(market: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const scores = await this.loadDailyScores(market, today);
      return scores !== null && scores.scores.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 取得評分歷史記錄
   */
  async getScoreHistory(market: string, days: number = 7): Promise<DailyScoreStorage[]> {
    try {
      const history: DailyScoreStorage[] = [];
      const today = new Date();

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const scores = await this.loadDailyScores(market, dateStr);
        if (scores) {
          history.push(scores);
        }
      }

      return history;
    } catch (error) {
      console.error('❌ 取得評分歷史失敗:', error);
      return [];
    }
  }

  /**
   * 取得股票評分趨勢
   */
  async getStockScoreTrend(symbol: string, market: string, days: number = 7): Promise<{
    symbol: string;
    market: string;
    trends: Array<{
      date: string;
      overallScore: number;
      fundamentalScore: number;
      technicalScore: number;
      confidence: number;
    }>;
  }> {
    try {
      const history = await this.getScoreHistory(market, days);
      const trends: any[] = [];

      for (const dailyScore of history) {
        const stockScore = dailyScore.scores.find(s => s.symbol === symbol);
        if (stockScore) {
          trends.push({
            date: dailyScore.date,
            overallScore: stockScore.overallScore,
            fundamentalScore: stockScore.fundamentalScore,
            technicalScore: stockScore.technicalScore,
            confidence: stockScore.confidence
          });
        }
      }

      return {
        symbol,
        market,
        trends: trends.sort((a, b) => a.date.localeCompare(b.date))
      };
    } catch (error) {
      console.error('❌ 取得股票評分趨勢失敗:', error);
      return { symbol, market, trends: [] };
    }
  }

  /**
   * 清理舊的評分檔案（保留最近30天）
   */
  async cleanupOldScores(daysToKeep: number = 30): Promise<void> {
    try {
      const files = await fs.readdir(this.baseDir);
      const today = new Date();
      const cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const file of files) {
        if (file.endsWith('.json') && file.includes('-scores-')) {
          const dateMatch = file.match(/-scores-(\d{4}-\d{2}-\d{2})\.json$/);
          if (dateMatch) {
            const fileDate = new Date(dateMatch[1]);
            if (fileDate < cutoffDate) {
              const filepath = path.join(this.baseDir, file);
              await fs.unlink(filepath);
              console.log(`🗑️  已刪除舊評分檔案: ${file}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ 清理舊評分檔案失敗:', error);
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.baseDir);
    } catch {
      await fs.mkdir(this.baseDir, { recursive: true });
    }
  }

  private async updateLatestScores(market: string, scores: StockScore[], summary: any): Promise<void> {
    try {
      const filename = `${market}-scores-latest.json`;
      const filepath = path.join(this.baseDir, filename);

      const latestData = {
        date: new Date().toISOString().split('T')[0],
        market,
        totalStocks: scores.length,
        scores,
        summary
      };

      await fs.writeFile(filepath, JSON.stringify(latestData, null, 2), 'utf-8');
    } catch (error) {
      console.error('❌ 更新最新評分檔案失敗:', error);
    }
  }

  private calculateSummary(scores: StockScore[]): any {
    const buy = scores.filter(s => s.recommendedStrategy === 'Buy').length;
    const hold = scores.filter(s => s.recommendedStrategy === 'Hold').length;
    const avoid = scores.filter(s => s.recommendedStrategy === 'Avoid').length;

    const avgScore = scores.length > 0 
      ? scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length 
      : 0;

    const avgConfidence = scores.length > 0 
      ? scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length 
      : 0;

    return {
      buy,
      hold,
      avoid,
      avgScore: Math.round(avgScore * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  }
}

// 建立全域實例
export const scoreStorageManager = new ScoreStorageManager();
