import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { stocks, market } = await request.json();

    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '請提供有效的股票列表' 
      }, { status: 400 });
    }

    // 載入測試資料
    const testDataPath = path.join(process.cwd(), 'test-data', 'test-stocks-data.json');
    
    if (!fs.existsSync(testDataPath)) {
      return NextResponse.json({ 
        success: false, 
        error: '找不到測試資料檔案' 
      }, { status: 404 });
    }

    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    
    // 獲取請求的股票資料
    const stockData = stocks.map((symbol: string) => {
      const stock = testData.find((s: any) => s.symbol === symbol);
      return stock;
    }).filter(Boolean);

    if (stockData.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '找不到指定的股票資料' 
      }, { status: 404 });
    }

    // 執行智能策略分析
    const strategySwitcher = new IntelligentStrategySwitcher();
    const results = [];

    // 為每支股票選擇最佳策略
    for (const stock of stockData) {
      const strategyResult = strategySwitcher.selectStrategy(stock.data, stock.symbol);
      results.push({
        symbol: stock.symbol,
        name: stock.name,
        ...strategyResult
      });
    }

    // 生成投資組合策略
    const portfolioAllocations = strategySwitcher.selectPortfolioStrategies(
      stockData.map(s => ({ symbol: s.symbol, data: s.data })),
      1000000 // 100萬美元初始資金
    );

    // 分析投資組合風險
    const riskAnalysis = strategySwitcher.analyzePortfolioRisk(portfolioAllocations);

    return NextResponse.json({
      success: true,
      individualResults: results,
      portfolioAllocations,
      riskAnalysis
    });

  } catch (error) {
    console.error('智能策略分析失敗:', error);
    return NextResponse.json({ 
      success: false, 
      error: '智能策略分析失敗' 
    }, { status: 500 });
  }
}

/**
 * 智能策略切換器類
 */
class IntelligentStrategySwitcher {
  private strategies: any;

  constructor() {
    this.strategies = this.initializeStrategies();
  }

  initializeStrategies() {
    return {
      'buy_and_hold': {
        name: '買入持有策略',
        description: '長期持有優質成長股，避免頻繁交易錯失複利效應'
      },
      'ai_analysis': {
        name: 'AI分析策略',
        description: '使用AI技術分析進行主動交易，適合波動較大的股票'
      },
      'dividend_focused': {
        name: '股息策略',
        description: '專注於股息收益的長期投資策略'
      },
      'momentum': {
        name: '動量策略',
        description: '跟隨市場趨勢的短期交易策略'
      },
      'mean_reversion': {
        name: '均值回歸策略',
        description: '基於價格偏離均值的回歸交易策略'
      }
    };
  }

  selectStrategy(data: any[], symbol: string) {
    // 分析股票特徵
    const characteristics = this.analyzeStockCharacteristics(data);
    const classification = this.classifyStock(characteristics, symbol);
    
    // 選擇策略
    let strategyName = 'ai_analysis'; // 默認策略
    let reasoning = '';

    if (classification.type === 'growth') {
      strategyName = 'buy_and_hold';
      reasoning = '成長股適合長期持有，避免頻繁交易錯失複利效應';
    } else if (classification.type === 'value') {
      strategyName = 'mean_reversion';
      reasoning = '價值股適合均值回歸策略';
    } else if (classification.type === 'cyclical') {
      strategyName = 'momentum';
      reasoning = '週期股適合動量策略';
    }

    // 計算預期收益和風險
    const expectedReturn = this.calculateExpectedReturn(characteristics, strategyName);
    const expectedRisk = this.calculateExpectedRisk(characteristics, strategyName);
    const recommendedAllocation = this.calculateAllocation(classification, expectedReturn, expectedRisk);

    return {
      strategy: this.strategies[strategyName].name,
      confidence: classification.confidence,
      reasoning: `${classification.reasoning} → ${reasoning}`,
      parameters: {},
      expectedReturn,
      expectedRisk,
      recommendedAllocation
    };
  }

  analyzeStockCharacteristics(data: any[]) {
    const prices = data.map((d: any) => d.close);
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const volatility = Math.sqrt(returns.reduce((sum: number, r: number) => sum + r * r, 0) / returns.length) * Math.sqrt(252);
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const years = data.length / 252;
    const growthRate = years > 0 ? Math.pow(endPrice / startPrice, 1 / years) - 1 : 0;
    const beta = 1 + (volatility - 0.2) * 2;

    return { volatility, growthRate, beta, years };
  }

  classifyStock(characteristics: any, symbol: string) {
    let type = 'unknown';
    let confidence = 0;
    let reasoning = '';

    if (characteristics.growthRate > 0.15 && characteristics.volatility > 0.3) {
      type = 'growth';
      confidence = Math.min(90, 60 + characteristics.growthRate * 100);
      reasoning = `高成長率(${(characteristics.growthRate * 100).toFixed(1)}%)和高波動率(${(characteristics.volatility * 100).toFixed(1)}%)`;
    } else if (characteristics.growthRate < 0.1 && characteristics.volatility < 0.25) {
      type = 'value';
      confidence = Math.min(85, 70 + (0.1 - characteristics.growthRate) * 200);
      reasoning = `低成長率(${(characteristics.growthRate * 100).toFixed(1)}%)和低波動率(${(characteristics.volatility * 100).toFixed(1)}%)`;
    } else if (characteristics.beta > 1.2 && characteristics.volatility > 0.25) {
      type = 'cyclical';
      confidence = Math.min(80, 60 + (characteristics.beta - 1) * 50);
      reasoning = `高Beta值(${characteristics.beta.toFixed(2)})和高波動率(${(characteristics.volatility * 100).toFixed(1)}%)`;
    } else {
      type = 'unknown';
      confidence = 50;
      reasoning = '特徵不明顯，需要更多數據';
    }

    return { type, confidence, reasoning, characteristics };
  }

  calculateExpectedReturn(characteristics: any, strategyName: string) {
    let baseReturn = characteristics.growthRate;
    
    switch (strategyName) {
      case 'buy_and_hold': return baseReturn * 0.9;
      case 'ai_analysis': return baseReturn * 0.7;
      case 'momentum': return baseReturn * 0.8;
      case 'mean_reversion': return baseReturn * 0.6;
      default: return baseReturn * 0.7;
    }
  }

  calculateExpectedRisk(characteristics: any, strategyName: string) {
    let baseRisk = characteristics.volatility;
    
    switch (strategyName) {
      case 'buy_and_hold': return baseRisk * 1.1;
      case 'ai_analysis': return baseRisk * 0.8;
      case 'momentum': return baseRisk * 1.2;
      case 'mean_reversion': return baseRisk * 0.9;
      default: return baseRisk * 0.8;
    }
  }

  calculateAllocation(classification: any, expectedReturn: number, expectedRisk: number) {
    const sharpeRatio = expectedReturn / expectedRisk;
    let allocation = Math.min(0.3, sharpeRatio * 0.1);
    allocation *= (classification.confidence / 100);
    return Math.max(0.05, Math.min(0.3, allocation));
  }

  selectPortfolioStrategies(stocks: any[], totalCapital: number) {
    const allocations = [];
    let totalAllocation = 0;

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

    if (totalAllocation > 0) {
      allocations.forEach(allocation => {
        allocation.allocation = allocation.allocation / totalAllocation;
      });
    }

    return allocations.sort((a, b) => b.expectedReturn - a.expectedReturn);
  }

  analyzePortfolioRisk(allocations: any[]) {
    let totalExpectedReturn = 0;
    let totalExpectedRisk = 0;
    const strategyCounts = new Map();

    for (const allocation of allocations) {
      totalExpectedReturn += allocation.expectedReturn * allocation.allocation;
      totalExpectedRisk += allocation.expectedRisk * allocation.allocation;
      
      strategyCounts.set(
        allocation.strategy,
        (strategyCounts.get(allocation.strategy) || 0) + 1
      );
    }

    const uniqueStrategies = strategyCounts.size;
    const totalStocks = allocations.length;
    const diversificationScore = (uniqueStrategies / totalStocks + 0.5) / 2;

    const recommendations = [];
    if (totalExpectedReturn > 0.15) {
      recommendations.push('🎯 預期收益較高，建議適當控制風險');
    }
    if (totalExpectedRisk > 0.3) {
      recommendations.push('⚠️ 投資組合風險較高，建議增加防禦性資產');
    }
    if (diversificationScore < 0.5) {
      recommendations.push('📊 分散化程度較低，建議增加不同策略的配置');
    }

    return {
      totalExpectedReturn,
      totalExpectedRisk,
      diversificationScore,
      recommendations
    };
  }
}
