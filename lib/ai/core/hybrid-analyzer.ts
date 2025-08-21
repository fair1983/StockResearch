import { AnalysisInput, AnalysisOutput, Scores } from '../interfaces/analyzer';
import { techRuleScore } from '../modules/tech-rules';
import { fundamentalScore } from '../modules/fundamental-score';
import { inferML } from '../modules/ml-predictor';
import { calculateRiskLevel, calculateConfidence, calculateRelativeMomentum } from '../modules/risk-confidence';
import { buildSummary } from '../modules/summary-generator';
import { annualizedVolatility, maxDrawdown, liquidityScore } from '../modules/technical-indicators';

/**
 * 混合分析器 - 整合規則和機器學習
 */
export class HybridAnalyzer {
  /**
   * 分析單支股票
   */
  static async analyzeStock(input: AnalysisInput): Promise<AnalysisOutput> {
    try {
      console.log(`開始混合分析股票: ${input.symbol}`);
      
      const { candles, fundamentals, benchmark, regime } = input;
      
      if (candles.length < 50) {
        throw new Error('歷史數據不足，至少需要50個交易日數據');
      }

      // 1. 技術規則分析
      console.log('執行技術規則分析...');
      const techResult = techRuleScore(candles);
      
      // 2. 基本面分析
      console.log('執行基本面分析...');
      const fundResult = fundamentalScore(fundamentals);
      
      // 3. 相對動量分析
      console.log('執行相對動量分析...');
      const relMomentum = calculateRelativeMomentum(candles, benchmark?.candles);
      
      // 4. ML 預測
      console.log('執行 ML 預測...');
      const mlResult = await inferML(candles, fundamentals, regime);
      
      // 5. 風險分析
      console.log('執行風險分析...');
      const riskVol = annualizedVolatility(candles.map(c => c.close));
      const riskDD = maxDrawdown(candles.map(c => c.close), 120);
      const liqScore = liquidityScore(candles);
      const riskLevel = calculateRiskLevel(candles, riskVol, riskDD, liqScore);
      
      // 6. 信心度計算
      console.log('計算信心度...');
      const confidence = calculateConfidence(
        mlResult.uncertainty,
        0.9, // featureCoverage
        regime?.marketTrend === 'neutral', // regimeStable
        0.8 // dataQuality
      );
      
      // 7. 綜合打分
      console.log('計算綜合分數...');
      const overall = Math.round(
        0.40 * (mlResult.pAlpha20 * 100) +
        0.30 * techResult.score +
        0.20 * fundResult.score +
        0.10 * relMomentum
      );
      
      // 8. 決策建議
      console.log('生成決策建議...');
      const decision = this.generateDecision(overall, riskLevel, liqScore);
      
      // 9. 構建調試信息
      const debug: Scores = {
        techRule: techResult.score,
        fundamental: fundResult.score,
        relMomentum,
        pAlpha20: mlResult.pAlpha20,
        expectedRet20: mlResult.ret20,
        expectedRet60: mlResult.ret60,
        riskVolatility: riskVol * 100,
        riskDrawdown: riskDD * 100,
        liquidityScore: liqScore
      };
      
      // 10. 生成摘要
      console.log('生成摘要...');
      
      const output: AnalysisOutput = {
        symbol: input.symbol,
        name: input.symbol, // 可後續從 quote data 獲取
        market: input.market,
        overall,
        confidence,
        expectedReturn: mlResult.ret20,
        riskLevel,
        supportResistance: {
          support: techResult.support,
          resistance: techResult.resistance
        },
        decision,
        reasons: [...techResult.notes, ...fundResult.notes].slice(0, 6),
        debug,
        technicalSignals: {
          trend: techResult.trend,
          momentum: techResult.momentum,
          volatility: techResult.volatility,
          support: techResult.support,
          resistance: techResult.resistance
        },
        summary: '', // 臨時佔位符
        lastUpdate: new Date().toISOString()
      };
      
      // 生成摘要
      output.summary = buildSummary(output);
      
      console.log(`混合分析完成: ${input.symbol}`);
      return output;
      
    } catch (error) {
      console.error(`混合分析失敗: ${input.symbol}`, error);
      throw error;
    }
  }
  
  /**
   * 批量分析股票
   */
  static async analyzeStocks(inputs: AnalysisInput[]): Promise<AnalysisOutput[]> {
    console.log(`開始批量分析 ${inputs.length} 支股票...`);
    
    const results: AnalysisOutput[] = [];
    
    for (const input of inputs) {
      try {
        const result = await this.analyzeStock(input);
        results.push(result);
      } catch (error) {
        console.error(`分析股票 ${input.symbol} 失敗:`, error);
        // 創建錯誤結果
        results.push(this.createErrorResult(input.symbol, input.market));
      }
    }
    
    console.log(`批量分析完成，成功 ${results.length} 支股票`);
    return results;
  }
  
  /**
   * 生成決策建議
   */
  private static generateDecision(
    overall: number,
    riskLevel: '低風險' | '中風險' | '高風險',
    liquidityScore: number
  ): 'Buy' | 'Accumulate' | 'Hold' | 'Avoid' | 'Reduce' {
    
    // 基於綜合分數和風險等級的決策矩陣
    if (overall >= 70 && riskLevel !== '高風險' && liquidityScore >= 60) {
      return 'Buy';
    } else if (overall >= 60 && riskLevel !== '高風險') {
      return 'Accumulate';
    } else if (overall >= 45) {
      return 'Hold';
    } else if (liquidityScore < 40) {
      return 'Avoid';
    } else {
      return 'Reduce';
    }
  }
  
  /**
   * 創建錯誤結果
   */
  private static createErrorResult(symbol: string, market: string): AnalysisOutput {
    return {
      symbol,
      name: symbol,
      market,
      overall: 0,
      confidence: 0,
      expectedReturn: 0,
      riskLevel: '中風險',
      supportResistance: { support: 0, resistance: 0 },
      decision: 'Avoid',
      reasons: ['分析失敗，數據不足'],
      debug: {
        techRule: 0,
        fundamental: 0,
        relMomentum: 0,
        pAlpha20: 0.5,
        expectedRet20: 0,
        expectedRet60: 0,
        riskVolatility: 0,
        riskDrawdown: 0,
        liquidityScore: 0
      },
      technicalSignals: {
        trend: 'neutral',
        momentum: 0,
        volatility: 0,
        support: 0,
        resistance: 0
      },
      lastUpdate: new Date().toISOString(),
      summary: `${symbol} ｜ 建議：避免 ｜ 分析失敗，數據不足`
    };
  }
}
