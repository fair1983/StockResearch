# 模組化 AI 分析系統

這是一個專門設計用於提高股票買賣點勝率的模組化 AI 分析系統。系統通過多個專業分析模組，綜合評估技術指標，提供高精度的交易建議。

## 🎯 系統目標

- **提高勝率**: 通過多模組綜合分析，提高買賣點的準確性
- **模組化設計**: 易於維護、擴展和新增分析功能
- **實時分析**: 基於快取的技術指標資料，提供即時分析
- **風險控制**: 提供止損建議和風險評估

## 🏗️ 系統架構

```
lib/ai-analysis/
├── modules/                    # 分析模組目錄
│   ├── base-analyzer.ts       # 基礎分析器抽象類
│   ├── trend-analyzer.ts      # 趨勢分析器
│   ├── momentum-analyzer.ts   # 動量分析器
│   └── volume-analyzer.ts     # 成交量分析器
├── ai-analysis-orchestrator.ts # 分析協調器
└── README.md                  # 模組說明
```

## 📊 分析模組

### 1. 趨勢分析器 (TrendAnalyzer)
**權重**: 1.2 | **目標**: 識別趨勢方向和強度

#### 分析內容
- **移動平均線分析**: MA5、MA10、MA20 排列關係
- **價格趨勢分析**: 線性回歸斜率計算
- **趨勢強度分析**: ATR 波動率評估

#### 信號生成
- **買入信號**: 多頭排列 + 價格趨勢向上
- **賣出信號**: 空頭排列 + 價格趨勢向下
- **觀望信號**: 混合排列或趨勢不明確

### 2. 動量分析器 (MomentumAnalyzer)
**權重**: 1.0 | **目標**: 識別超買超賣和動量轉折

#### 分析內容
- **RSI 分析**: 超買超賣區域判斷
- **MACD 分析**: 金叉死叉和柱狀圖變化
- **KDJ 分析**: 隨機指標交叉信號
- **隨機指標分析**: Stochastic 動量確認

#### 信號生成
- **買入信號**: RSI 超賣 + MACD 金叉 + KDJ 金叉
- **賣出信號**: RSI 超買 + MACD 死叉 + KDJ 死叉
- **觀望信號**: 指標信號不一致

### 3. 成交量分析器 (VolumeAnalyzer)
**權重**: 0.8 | **目標**: 識別資金流向和市場情緒

#### 分析內容
- **成交量趨勢**: 成交量變化率和移動平均
- **價量關係**: 價格與成交量的配合度
- **OBV 分析**: 能量潮指標趨勢
- **成交量異常**: 統計異常檢測

#### 信號生成
- **買入信號**: 成交量放大 + 價量配合 + OBV 上升
- **賣出信號**: 成交量萎縮 + 價量背離 + OBV 下降
- **觀望信號**: 成交量變化不明確

## 🔧 核心功能

### 綜合評分系統
```typescript
// 加權綜合評分
overallScore = Σ(moduleScore × moduleWeight) / Σ(moduleWeight)
```

### 信心度計算
- **基礎信心度**: 各模組信心度的平均值
- **一致性獎勵**: 多模組信號一致時增加信心度
- **最終信心度**: 基礎信心度 + 一致性獎勵

### 風險評估
- **低風險**: 信心度 > 80% 且評分偏離中性 > 30%
- **中風險**: 信心度 > 60% 且評分偏離中性 > 20%
- **高風險**: 其他情況

## 🚀 API 使用

### 單一股票分析
```typescript
POST /api/ai-analysis-v2
{
  "market": "TW",
  "symbol": "2330",
  "interval": "1d"
}
```

### 批量分析
```typescript
POST /api/ai-analysis-v2
{
  "batchMode": true,
  "stocks": [
    { "market": "TW", "symbol": "2330" },
    { "market": "TW", "symbol": "0050" },
    { "market": "US", "symbol": "AAPL" }
  ]
}
```

### 分析器資訊
```typescript
GET /api/ai-analysis-v2?action=analyzers
```

## 📈 分析結果格式

```typescript
{
  "symbol": "2330",
  "market": "TW",
  "interval": "1d",
  "timestamp": "2025-08-20T10:30:00.000Z",
  "overallScore": 75.5,        // 綜合評分 (0-100)
  "overallSignal": "buy",      // 整體信號
  "overallConfidence": 82,     // 整體信心度 (0-100)
  "summary": "3 個分析模組參與分析...",
  "recommendations": [
    {
      "action": "buy",
      "confidence": 82,
      "reasoning": "綜合評分 75.5 分，建議強烈買入...",
      "riskLevel": "medium",
      "timeframe": "中期 (1-2週)",
      "stopLoss": -3,          // 止損百分比
      "takeProfit": 6          // 目標獲利百分比
    }
  ],
  "moduleResults": {
    "趨勢分析器": {
      "score": 78,
      "confidence": 85,
      "signal": "buy",
      "reasoning": "趨勢分析：移動平均線呈多頭排列..."
    }
  },
  "metadata": {
    "totalModules": 3,
    "activeModules": 3,
    "analysisTime": 245        // 分析耗時 (ms)
  }
}
```

## 🎛️ 模組擴展

### 新增分析模組
```typescript
import { BaseAnalyzer, AnalysisContext, AnalysisResult } from './modules/base-analyzer';

export class CustomAnalyzer extends BaseAnalyzer {
  constructor() {
    super('自定義分析器', '分析描述', 1.0);
  }

  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    // 實作分析邏輯
    return {
      score: 75,
      confidence: 80,
      signal: 'buy',
      reasoning: '分析結果說明'
    };
  }
}
```

### 註冊新模組
```typescript
const orchestrator = new AIAnalysisOrchestrator();
orchestrator.addAnalyzer(new CustomAnalyzer());
```

## 📊 勝率提升策略

### 1. 多模組驗證
- 至少 2 個模組信號一致才產生交易建議
- 高信心度模組權重更高

### 2. 風險控制
- 自動計算止損和目標價
- 根據風險等級調整倉位大小

### 3. 時間框架匹配
- 短期信號用於日內交易
- 中期信號用於波段操作
- 長期信號用於趨勢跟隨

### 4. 市場環境適應
- 根據市場波動調整參數
- 不同市場使用不同權重

## 🔍 監控與優化

### 績效追蹤
- 記錄每次分析的準確性
- 統計各模組的勝率
- 追蹤建議的盈虧比

### 參數優化
- 根據歷史表現調整模組權重
- 優化信號閾值
- 改進風險評估模型

### 回測驗證
- 使用歷史資料驗證策略
- 計算夏普比率和最大回撤
- 優化參數設定

## ⚠️ 風險提醒

1. **技術分析局限性**: 技術分析具有滯後性，不能預測所有市場變化
2. **市場風險**: 股市有風險，投資需謹慎
3. **系統風險**: 系統故障可能導致分析延遲或錯誤
4. **過度依賴**: 不應完全依賴 AI 分析，應結合基本面分析

## 🚀 未來發展

### 短期目標
- [ ] 新增更多技術指標分析
- [ ] 實作機器學習模型
- [ ] 增加市場情緒分析

### 中期目標
- [ ] 實作回測系統
- [ ] 增加期權分析功能
- [ ] 開發移動端應用

### 長期目標
- [ ] 實作深度學習模型
- [ ] 增加全球市場支援
- [ ] 開發自動交易系統

---

*更新日期: 2025-08-20*  
*版本: v2.0.0*
