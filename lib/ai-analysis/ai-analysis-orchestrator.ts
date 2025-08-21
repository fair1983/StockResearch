import { BaseAnalyzer, AnalysisContext, AnalysisResult } from './modules/base-analyzer';
import { TrendAnalyzer } from './modules/trend-analyzer';
import { MomentumAnalyzer } from './modules/momentum-analyzer';
import { VolumeAnalyzer } from './modules/volume-analyzer';
import { TechnicalIndicatorsCache } from '../technical-indicators-cache';
import { logger } from '../logger';

export interface ComprehensiveAnalysisResult {
  symbol: string;
  market: string;
  interval: string;
  timestamp: string;
  overallScore: number;
  overallSignal: 'buy' | 'sell' | 'hold';
  overallConfidence: number;
  summary: string;
  recommendations: TradingRecommendation[];
  moduleResults: {
    [moduleName: string]: AnalysisResult;
  };
  metadata: {
    totalModules: number;
    activeModules: number;
    analysisTime: number;
  };
}

export interface TradingRecommendation {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export class AIAnalysisOrchestrator {
  private analyzers: BaseAnalyzer[] = [];
  private indicatorsCache: TechnicalIndicatorsCache;

  constructor() {
    this.indicatorsCache = new TechnicalIndicatorsCache();
    this.initializeAnalyzers();
  }

  /**
   * 初始化分析器
   */
  private initializeAnalyzers() {
    this.analyzers = [
      new TrendAnalyzer(),
      new MomentumAnalyzer(),
      new VolumeAnalyzer()
    ];
  }

  /**
   * 執行綜合分析
   */
  async analyzeStock(
    market: string,
    symbol: string,
    interval: string = '1d',
    data?: any
  ): Promise<ComprehensiveAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.ai.analysis(`Starting comprehensive analysis for ${market}/${symbol}/${interval}`);

      // 取得技術指標資料
      let indicators;
      if (data) {
        indicators = await this.indicatorsCache.calculateAndCacheIndicators(market, symbol, interval, data);
      } else {
        indicators = await this.indicatorsCache.getCachedIndicators(market, symbol, interval, []);
        if (!indicators) {
          throw new Error('No indicators data available');
        }
      }

      // 建立分析上下文
      const context: AnalysisContext = {
        market,
        symbol,
        interval,
        data: data || [],
        indicators,
        timestamp: new Date().toISOString()
      };

      // 執行所有分析器
      const moduleResults: { [moduleName: string]: AnalysisResult } = {};
      const activeModules = [];

      for (const analyzer of this.analyzers) {
        try {
          const result = await analyzer.analyze(context);
          if (this.validateResult(result)) {
            moduleResults[analyzer.getInfo().name] = result;
            activeModules.push(analyzer.getInfo().name);
          }
        } catch (error) {
          logger.ai.error(`Module ${analyzer.getInfo().name} failed`, error);
        }
      }

      // 計算綜合評分
      const overallScore = this.calculateOverallScore(moduleResults);
      const overallSignal = this.determineOverallSignal(overallScore);
      const overallConfidence = this.calculateOverallConfidence(moduleResults);

      // 生成建議
      const recommendations = this.generateRecommendations(moduleResults, overallScore, overallConfidence);

      // 生成摘要
      const summary = this.generateSummary(moduleResults, overallScore, overallSignal);

      const analysisTime = Date.now() - startTime;

      const result: ComprehensiveAnalysisResult = {
        symbol,
        market,
        interval,
        timestamp: new Date().toISOString(),
        overallScore,
        overallSignal,
        overallConfidence,
        summary,
        recommendations,
        moduleResults,
        metadata: {
          totalModules: this.analyzers.length,
          activeModules: activeModules.length,
          analysisTime
        }
      };

      logger.ai.analysis(`Comprehensive analysis completed for ${market}/${symbol}/${interval} in ${analysisTime}ms`);
      return result;

    } catch (error) {
      logger.ai.error(`Comprehensive analysis failed for ${market}/${symbol}/${interval}`, error);
      throw error;
    }
  }

  /**
   * 計算綜合評分
   */
  private calculateOverallScore(moduleResults: { [moduleName: string]: AnalysisResult }): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const [moduleName, result] of Object.entries(moduleResults)) {
      const analyzer = this.analyzers.find(a => a.getInfo().name === moduleName);
      if (analyzer) {
        const weightedScore = analyzer.getWeightedScore(result);
        totalWeightedScore += weightedScore;
        totalWeight += analyzer.getInfo().weight;
      }
    }

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 50;
  }

  /**
   * 確定整體信號
   */
  private determineOverallSignal(score: number): 'buy' | 'sell' | 'hold' {
    if (score >= 70) return 'buy';
    if (score <= 30) return 'sell';
    return 'hold';
  }

  /**
   * 計算整體信心度
   */
  private calculateOverallConfidence(moduleResults: { [moduleName: string]: AnalysisResult }): number {
    if (Object.keys(moduleResults).length === 0) return 0;

    const confidences = Object.values(moduleResults).map(r => r.confidence);
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    
    // 根據一致性調整信心度
    const signals = Object.values(moduleResults).map(r => r.signal);
    const buyCount = signals.filter(s => s === 'buy').length;
    const sellCount = signals.filter(s => s === 'sell').length;
    const totalCount = signals.length;
    
    let consistencyBonus = 0;
    if (buyCount / totalCount >= 0.7 || sellCount / totalCount >= 0.7) {
      consistencyBonus = 15;
    } else if (buyCount / totalCount >= 0.5 || sellCount / totalCount >= 0.5) {
      consistencyBonus = 10;
    }

    return Math.min(100, avgConfidence + consistencyBonus);
  }

  /**
   * 生成交易建議
   */
  private generateRecommendations(
    moduleResults: { [moduleName: string]: AnalysisResult },
    overallScore: number,
    overallConfidence: number
  ): TradingRecommendation[] {
    const recommendations: TradingRecommendation[] = [];

    // 主要建議
    const mainRecommendation: TradingRecommendation = {
      action: this.determineOverallSignal(overallScore),
      confidence: overallConfidence,
      reasoning: this.generateMainReasoning(moduleResults, overallScore),
      riskLevel: this.determineRiskLevel(overallScore, overallConfidence),
      timeframe: this.determineTimeframe(moduleResults)
    };

    // 計算止損和目標價
    if (mainRecommendation.action !== 'hold') {
      const riskRewardRatio = mainRecommendation.action === 'buy' ? 2 : 1.5;
      mainRecommendation.stopLoss = mainRecommendation.action === 'buy' ? -3 : 3;
      mainRecommendation.takeProfit = mainRecommendation.action === 'buy' ? 
        Math.abs(mainRecommendation.stopLoss) * riskRewardRatio : 
        Math.abs(mainRecommendation.stopLoss) * riskRewardRatio;
    }

    recommendations.push(mainRecommendation);

    // 模組特定建議
    for (const [moduleName, result] of Object.entries(moduleResults)) {
      if (result.signal !== 'hold' && result.confidence > 70) {
        recommendations.push({
          action: result.signal,
          confidence: result.confidence,
          reasoning: `${moduleName}: ${result.reasoning}`,
          riskLevel: this.determineRiskLevel(result.score, result.confidence),
          timeframe: '短期 (1-3天)'
        });
      }
    }

    return recommendations;
  }

  /**
   * 生成主要推理
   */
  private generateMainReasoning(moduleResults: { [moduleName: string]: AnalysisResult }, overallScore: number): string {
    const strongSignals = Object.entries(moduleResults)
      .filter(([_, result]) => result.confidence > 70)
      .map(([name, result]) => `${name}(${result.signal})`);

    const signalText = overallScore >= 70 ? '強烈買入' : 
                      overallScore <= 30 ? '強烈賣出' : '觀望';

    return `綜合評分 ${overallScore.toFixed(1)} 分，建議${signalText}。${strongSignals.length > 0 ? `主要信號：${strongSignals.join('、')}` : ''}`;
  }

  /**
   * 確定風險等級
   */
  private determineRiskLevel(score: number, confidence: number): 'low' | 'medium' | 'high' {
    if (confidence > 80 && Math.abs(score - 50) > 30) return 'low';
    if (confidence > 60 && Math.abs(score - 50) > 20) return 'medium';
    return 'high';
  }

  /**
   * 確定時間框架
   */
  private determineTimeframe(moduleResults: { [moduleName: string]: AnalysisResult }): string {
    const hasTrend = '趨勢分析器' in moduleResults;
    const hasMomentum = '動量分析器' in moduleResults;
    
    if (hasTrend && hasMomentum) return '中期 (1-2週)';
    if (hasTrend) return '長期 (2-4週)';
    if (hasMomentum) return '短期 (1-3天)';
    return '短期 (1週)';
  }

  /**
   * 生成摘要
   */
  private generateSummary(moduleResults: { [moduleName: string]: AnalysisResult }, overallScore: number, overallSignal: string): string {
    const moduleCount = Object.keys(moduleResults).length;
    const buySignals = Object.values(moduleResults).filter(r => r.signal === 'buy').length;
    const sellSignals = Object.values(moduleResults).filter(r => r.signal === 'sell').length;
    
    const signalText = overallSignal === 'buy' ? '看漲' : 
                      overallSignal === 'sell' ? '看跌' : '中性';
    
    return `${moduleCount} 個分析模組參與分析，綜合評分 ${overallScore.toFixed(1)} 分，整體趨勢${signalText}。買入信號 ${buySignals} 個，賣出信號 ${sellSignals} 個。`;
  }

  /**
   * 驗證分析結果
   */
  private validateResult(result: AnalysisResult): boolean {
    return (
      result.score >= 0 && result.score <= 100 &&
      result.confidence >= 0 && result.confidence <= 100 &&
      ['buy', 'sell', 'hold'].includes(result.signal) &&
      typeof result.reasoning === 'string'
    );
  }

  /**
   * 取得分析器資訊
   */
  getAnalyzersInfo() {
    return this.analyzers.map(analyzer => analyzer.getInfo());
  }

  /**
   * 添加自定義分析器
   */
  addAnalyzer(analyzer: BaseAnalyzer) {
    this.analyzers.push(analyzer);
  }

  /**
   * 移除分析器
   */
  removeAnalyzer(analyzerName: string) {
    this.analyzers = this.analyzers.filter(analyzer => analyzer.getInfo().name !== analyzerName);
  }

  /**
   * 批量分析
   */
  async batchAnalyze(
    stocks: Array<{ market: string; symbol: string; interval?: string }>
  ): Promise<ComprehensiveAnalysisResult[]> {
    const results: ComprehensiveAnalysisResult[] = [];

    for (const stock of stocks) {
      try {
        const result = await this.analyzeStock(
          stock.market,
          stock.symbol,
          stock.interval || '1d'
        );
        results.push(result);
        
        // 避免過於頻繁的請求
        await this.delay(200);
      } catch (error) {
        logger.ai.error(`Batch analysis failed for ${stock.market}/${stock.symbol}`, error);
      }
    }

    return results;
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
