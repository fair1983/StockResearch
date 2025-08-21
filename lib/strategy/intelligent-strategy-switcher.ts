import { Candle } from '../../types';
import { StockClassifier, StockClassification } from './stock-classifier';

export interface StrategyConfig {
  name: string;
  type: 'buy_and_hold' | 'ai_analysis' | 'dividend_focused' | 'momentum' | 'mean_reversion';
  parameters: {
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    rsiThreshold: number;
    maPeriod: number;
    confidenceThreshold: number;
    rebalanceFrequency: number; // 重新平衡頻率（天）
  };
  description: string;
  suitableFor: string[];
}

export interface StrategyResult {
  strategy: string;
  confidence: number;
  reasoning: string;
  parameters: any;
  expectedReturn: number;
  expectedRisk: number;
  recommendedAllocation: number; // 建議配置比例
}

export interface PortfolioAllocation {
  stock: string;
  strategy: string;
  allocation: number;
  reasoning: string;
  expectedReturn: number;
  expectedRisk: number;
}

export class IntelligentStrategySwitcher {
  private classifier: StockClassifier;
  private strategies: Map<string, StrategyConfig>;

  constructor() {
    this.classifier = new StockClassifier();
    this.strategies = new Map();
    this.initializeStrategies();
  }

  /**
   * 初始化策略配置
   */
  private initializeStrategies() {
    this.strategies = new Map();

    // 買入持有策略（適合成長股）
    this.strategies.set('buy_and_hold', {
      name: '買入持有策略',
      type: 'buy_and_hold',
      parameters: {
        maxPositionSize: 0.3,
        stopLoss: 0.25,
        takeProfit: 0.5,
        rsiThreshold: 85,
        maPeriod: 50,
        confidenceThreshold: 70,
        rebalanceFrequency: 252 // 一年重新平衡一次
      },
      description: '長期持有優質成長股，避免頻繁交易錯失複利效應',
      suitableFor: ['growth', 'dividend']
    });

    // AI分析策略（適合價值股和週期股）
    this.strategies.set('ai_analysis', {
      name: 'AI分析策略',
      type: 'ai_analysis',
      parameters: {
        maxPositionSize: 0.2,
        stopLoss: 0.15,
        takeProfit: 0.3,
        rsiThreshold: 70,
        maPeriod: 20,
        confidenceThreshold: 65,
        rebalanceFrequency: 30 // 每月重新平衡
      },
      description: '使用AI技術分析進行主動交易，適合波動較大的股票',
      suitableFor: ['value', 'cyclical']
    });

    // 股息策略（適合股息股）
    this.strategies.set('dividend_focused', {
      name: '股息策略',
      type: 'dividend_focused',
      parameters: {
        maxPositionSize: 0.25,
        stopLoss: 0.2,
        takeProfit: 0.4,
        rsiThreshold: 80,
        maPeriod: 30,
        confidenceThreshold: 75,
        rebalanceFrequency: 90 // 每季度重新平衡
      },
      description: '專注於股息收益的長期投資策略',
      suitableFor: ['dividend', 'value']
    });

    // 動量策略（適合高波動股票）
    this.strategies.set('momentum', {
      name: '動量策略',
      type: 'momentum',
      parameters: {
        maxPositionSize: 0.15,
        stopLoss: 0.1,
        takeProfit: 0.25,
        rsiThreshold: 65,
        maPeriod: 10,
        confidenceThreshold: 60,
        rebalanceFrequency: 7 // 每週重新平衡
      },
      description: '跟隨市場趨勢的短期交易策略',
      suitableFor: ['cyclical', 'growth']
    });

    // 均值回歸策略（適合價值股）
    this.strategies.set('mean_reversion', {
      name: '均值回歸策略',
      type: 'mean_reversion',
      parameters: {
        maxPositionSize: 0.2,
        stopLoss: 0.12,
        takeProfit: 0.28,
        rsiThreshold: 75,
        maPeriod: 40,
        confidenceThreshold: 70,
        rebalanceFrequency: 14 // 每兩週重新平衡
      },
      description: '基於價格偏離均值的回歸交易策略',
      suitableFor: ['value', 'cyclical']
    });
  }

  /**
   * 為單支股票選擇最佳策略
   */
  selectStrategy(data: Candle[], symbol: string): StrategyResult {
    // 分析股票特徵
    const classification = this.classifier.classifyStock(data, symbol);
    
    // 獲取推薦策略
    const recommendation = this.classifier.recommendStrategy(classification);
    
    // 根據股票特徵調整策略參數
    const adjustedStrategy = this.adjustStrategyParameters(
      recommendation.strategy,
      classification,
      data
    );

    // 計算預期收益和風險
    const { expectedReturn, expectedRisk } = this.calculateExpectedMetrics(
      classification,
      adjustedStrategy
    );

    // 計算建議配置比例
    const recommendedAllocation = this.calculateRecommendedAllocation(
      classification,
      expectedReturn,
      expectedRisk
    );

    return {
      strategy: adjustedStrategy.name,
      confidence: classification.confidence,
      reasoning: `${classification.reasoning} → ${adjustedStrategy.description}`,
      parameters: adjustedStrategy.parameters,
      expectedReturn,
      expectedRisk,
      recommendedAllocation
    };
  }

  /**
   * 調整策略參數
   */
  private adjustStrategyParameters(
    strategyName: string,
    classification: StockClassification,
    data: Candle[]
  ): StrategyConfig {
    const baseStrategy = this.strategies.get(strategyName);
    if (!baseStrategy) {
      throw new Error(`未知策略: ${strategyName}`);
    }

    const adjustedStrategy = { ...baseStrategy };
    const { characteristics } = classification;

    // 根據波動率調整參數
    if (characteristics.volatility > 0.4) {
      // 高波動股票：降低持倉比例，提高止損
      adjustedStrategy.parameters.maxPositionSize *= 0.8;
      adjustedStrategy.parameters.stopLoss *= 1.2;
      adjustedStrategy.parameters.rebalanceFrequency = Math.min(
        adjustedStrategy.parameters.rebalanceFrequency,
        14
      );
    } else if (characteristics.volatility < 0.2) {
      // 低波動股票：提高持倉比例，降低止損
      adjustedStrategy.parameters.maxPositionSize *= 1.2;
      adjustedStrategy.parameters.stopLoss *= 0.8;
      adjustedStrategy.parameters.rebalanceFrequency = Math.max(
        adjustedStrategy.parameters.rebalanceFrequency,
        60
      );
    }

    // 根據成長率調整參數
    if (characteristics.growthRate > 0.2) {
      // 高成長股票：提高止盈，降低交易頻率
      adjustedStrategy.parameters.takeProfit *= 1.3;
      adjustedStrategy.parameters.rsiThreshold = Math.min(
        adjustedStrategy.parameters.rsiThreshold + 5,
        90
      );
      adjustedStrategy.parameters.rebalanceFrequency = Math.max(
        adjustedStrategy.parameters.rebalanceFrequency,
        90
      );
    }

    // 根據Beta值調整參數
    if (characteristics.beta > 1.3) {
      // 高Beta股票：降低持倉比例，提高止損
      adjustedStrategy.parameters.maxPositionSize *= 0.9;
      adjustedStrategy.parameters.stopLoss *= 1.1;
    }

    return adjustedStrategy;
  }

  /**
   * 計算預期收益和風險
   */
  private calculateExpectedMetrics(
    classification: StockClassification,
    strategy: StrategyConfig
  ): { expectedReturn: number; expectedRisk: number } {
    const { characteristics } = classification;
    
    // 基於歷史特徵估算預期收益
    let expectedReturn = characteristics.growthRate;
    
    // 根據策略類型調整預期收益
    switch (strategy.type) {
      case 'buy_and_hold':
        expectedReturn *= 0.9; // 買入持有可能略低於歷史成長率
        break;
      case 'ai_analysis':
        expectedReturn *= 0.7; // 主動交易可能降低收益
        break;
      case 'momentum':
        expectedReturn *= 0.8; // 動量策略中等收益
        break;
      case 'mean_reversion':
        expectedReturn *= 0.6; // 均值回歸策略較低收益
        break;
    }

    // 估算預期風險（基於波動率）
    let expectedRisk = characteristics.volatility;
    
    // 根據策略類型調整風險
    switch (strategy.type) {
      case 'buy_and_hold':
        expectedRisk *= 1.1; // 買入持有風險較高
        break;
      case 'ai_analysis':
        expectedRisk *= 0.8; // AI策略風險控制較好
        break;
      case 'momentum':
        expectedRisk *= 1.2; // 動量策略風險較高
        break;
      case 'mean_reversion':
        expectedRisk *= 0.9; // 均值回歸風險中等
        break;
    }

    return { expectedReturn, expectedRisk };
  }

  /**
   * 計算建議配置比例
   */
  private calculateRecommendedAllocation(
    classification: StockClassification,
    expectedReturn: number,
    expectedRisk: number
  ): number {
    // 基於夏普比率計算配置比例
    const sharpeRatio = expectedReturn / expectedRisk;
    
    // 根據信心度和夏普比率調整配置
    let allocation = Math.min(0.3, sharpeRatio * 0.1);
    allocation *= (classification.confidence / 100);
    
    // 確保配置在合理範圍內
    allocation = Math.max(0.05, Math.min(0.3, allocation));
    
    return allocation;
  }

  /**
   * 為投資組合選擇最佳策略組合
   */
  selectPortfolioStrategies(
    stocks: Array<{ symbol: string; data: Candle[] }>,
    totalCapital: number
  ): PortfolioAllocation[] {
    const allocations: PortfolioAllocation[] = [];
    let totalAllocation = 0;

    // 為每支股票選擇策略
    for (const stock of stocks) {
      const strategyResult = this.selectStrategy(stock.data, stock.symbol);
      
      allocations.push({
        stock: stock.symbol,
        strategy: strategyResult.strategy,
        allocation: strategyResult.recommendedAllocation,
        reasoning: strategyResult.reasoning,
        expectedReturn: strategyResult.expectedReturn,
        expectedRisk: strategyResult.expectedRisk
      });

      totalAllocation += strategyResult.recommendedAllocation;
    }

    // 標準化配置比例
    if (totalAllocation > 0) {
      allocations.forEach(allocation => {
        allocation.allocation = allocation.allocation / totalAllocation;
      });
    }

    // 按預期收益排序
    allocations.sort((a, b) => b.expectedReturn - a.expectedReturn);

    return allocations;
  }

  /**
   * 獲取策略配置
   */
  getStrategyConfig(strategyName: string): StrategyConfig | undefined {
    return this.strategies.get(strategyName);
  }

  /**
   * 獲取所有可用策略
   */
  getAllStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values());
  }

  /**
   * 分析投資組合風險
   */
  analyzePortfolioRisk(allocations: PortfolioAllocation[]): {
    totalExpectedReturn: number;
    totalExpectedRisk: number;
    diversificationScore: number;
    recommendations: string[];
  } {
    let totalExpectedReturn = 0;
    let totalExpectedRisk = 0;
    const strategyCounts = new Map<string, number>();

    // 計算加權預期收益和風險
    for (const allocation of allocations) {
      totalExpectedReturn += allocation.expectedReturn * allocation.allocation;
      totalExpectedRisk += allocation.expectedRisk * allocation.allocation;
      
      strategyCounts.set(
        allocation.strategy,
        (strategyCounts.get(allocation.strategy) || 0) + 1
      );
    }

    // 計算分散化分數
    const diversificationScore = this.calculateDiversificationScore(
      allocations,
      strategyCounts
    );

    // 生成建議
    const recommendations = this.generateRecommendations(
      allocations,
      totalExpectedReturn,
      totalExpectedRisk,
      diversificationScore
    );

    return {
      totalExpectedReturn,
      totalExpectedRisk,
      diversificationScore,
      recommendations
    };
  }

  /**
   * 計算分散化分數
   */
  private calculateDiversificationScore(
    allocations: PortfolioAllocation[],
    strategyCounts: Map<string, number>
  ): number {
    const totalStocks = allocations.length;
    const uniqueStrategies = strategyCounts.size;
    
    // 策略多樣性分數
    const strategyDiversity = uniqueStrategies / totalStocks;
    
    // 配置平衡分數
    const allocationVariance = this.calculateAllocationVariance(allocations);
    const allocationBalance = 1 / (1 + allocationVariance);
    
    return (strategyDiversity + allocationBalance) / 2;
  }

  /**
   * 計算配置方差
   */
  private calculateAllocationVariance(allocations: PortfolioAllocation[]): number {
    const mean = allocations.reduce((sum, a) => sum + a.allocation, 0) / allocations.length;
    const variance = allocations.reduce((sum, a) => sum + Math.pow(a.allocation - mean, 2), 0) / allocations.length;
    return variance;
  }

  /**
   * 生成投資建議
   */
  private generateRecommendations(
    allocations: PortfolioAllocation[],
    totalExpectedReturn: number,
    totalExpectedRisk: number,
    diversificationScore: number
  ): string[] {
    const recommendations: string[] = [];

    // 基於預期收益的建議
    if (totalExpectedReturn > 0.15) {
      recommendations.push('🎯 預期收益較高，建議適當控制風險');
    } else if (totalExpectedReturn < 0.05) {
      recommendations.push('⚠️ 預期收益較低，建議考慮調整配置');
    }

    // 基於風險的建議
    if (totalExpectedRisk > 0.3) {
      recommendations.push('⚠️ 投資組合風險較高，建議增加防禦性資產');
    } else if (totalExpectedRisk < 0.1) {
      recommendations.push('🛡️ 投資組合風險較低，可以考慮增加成長性資產');
    }

    // 基於分散化的建議
    if (diversificationScore < 0.5) {
      recommendations.push('📊 分散化程度較低，建議增加不同策略的配置');
    } else if (diversificationScore > 0.8) {
      recommendations.push('✅ 分散化程度良好，投資組合結構合理');
    }

    // 基於策略分布的建議
    const strategyCounts = new Map<string, number>();
    allocations.forEach(a => {
      strategyCounts.set(a.strategy, (strategyCounts.get(a.strategy) || 0) + 1);
    });

    if (strategyCounts.size < 3) {
      recommendations.push('🔄 策略類型較少，建議增加策略多樣性');
    }

    return recommendations;
  }
}
