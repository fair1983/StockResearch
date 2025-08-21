import { AnalysisOutput } from '../interfaces/analyzer';

/**
 * 生成人類可讀的摘要
 */
export function buildSummary(output: AnalysisOutput): string {
  const {
    symbol,
    decision,
    overall,
    confidence,
    expectedReturn,
    riskLevel,
    supportResistance,
    reasons,
    debug
  } = output;

  // 決策建議映射
  const decisionMap = {
    'Buy': '買入',
    'Accumulate': '加碼',
    'Hold': '持有',
    'Avoid': '避免',
    'Reduce': '減碼'
  };

  // 風險等級映射
  const riskMap = {
    '低風險': '低',
    '中風險': '中',
    '高風險': '高'
  };

  // 構建主要理由
  const mainReasons = reasons.slice(0, 3).join('、');
  
  // 構建技術面描述
  let techDescription = '';
  if (debug?.techRule) {
    if (debug.techRule >= 70) techDescription = '技術面強勢';
    else if (debug.techRule >= 50) techDescription = '技術面中性';
    else techDescription = '技術面弱勢';
  }

  // 構建基本面描述
  let fundDescription = '';
  if (debug?.fundamental) {
    if (debug.fundamental >= 70) fundDescription = '基本面優秀';
    else if (debug.fundamental >= 50) fundDescription = '基本面穩定';
    else fundDescription = '基本面偏弱';
  }

  // 構建支撐阻力描述
  let srDescription = '';
  if (supportResistance) {
    srDescription = `關鍵區間 ${supportResistance.support.toFixed(2)} / ${supportResistance.resistance.toFixed(2)}`;
  }

  // 構建預期收益描述
  let returnDescription = '';
  if (expectedReturn > 0.15) {
    returnDescription = `預估20日報酬約 ${(expectedReturn * 100).toFixed(1)}%，具備強勁上漲潛力`;
  } else if (expectedReturn > 0.05) {
    returnDescription = `預估20日報酬約 ${(expectedReturn * 100).toFixed(1)}%，具備上漲空間`;
  } else if (expectedReturn > -0.05) {
    returnDescription = `預估20日報酬約 ${(expectedReturn * 100).toFixed(1)}%，震盪整理為主`;
  } else {
    returnDescription = `預估20日報酬約 ${(expectedReturn * 100).toFixed(1)}%，需注意下跌風險`;
  }

  // 構建風險描述
  let riskDescription = '';
  if (riskLevel === '低風險') {
    riskDescription = '風險等級低，適合穩健投資';
  } else if (riskLevel === '中風險') {
    riskDescription = '風險等級中等，需適度控制倉位';
  } else {
    riskDescription = '風險等級高，建議謹慎操作';
  }

  // 構建操作建議
  let operationAdvice = '';
  if (supportResistance) {
    operationAdvice = `若跌破支撐 ${supportResistance.support.toFixed(2)} 應評估風險控管；若放量突破壓力 ${supportResistance.resistance.toFixed(2)}，續抱勝率提升。`;
  }

  // 組合完整摘要
  const summary = `${symbol} ｜ 建議：${decisionMap[decision]} ｜ 綜合分：${overall}，信心度：${confidence}%。
${techDescription}，${fundDescription}。${srDescription}。
${returnDescription}，${riskDescription}。
主要理由：${mainReasons}。
${operationAdvice}`;

  return summary;
}

/**
 * 生成簡短摘要（用於卡片顯示）
 */
export function buildShortSummary(output: AnalysisOutput): string {
  const {
    symbol,
    decision,
    overall,
    confidence,
    expectedReturn,
    riskLevel,
    supportResistance,
    reasons
  } = output;

  const decisionMap = {
    'Buy': '買入',
    'Accumulate': '加碼',
    'Hold': '持有',
    'Avoid': '避免',
    'Reduce': '減碼'
  };

  const riskMap = {
    '低風險': '低',
    '中風險': '中',
    '高風險': '高'
  };

  const topReason = reasons.length > 0 ? reasons[0] : '基於綜合分析';
  const sr = supportResistance ? `${supportResistance.support.toFixed(2)} / ${supportResistance.resistance.toFixed(2)}` : '--';

  return `【${symbol}】建議：${decisionMap[decision]}（綜合 ${overall}/100，信心 ${confidence}%）
‣ 預估20日：${(expectedReturn * 100).toFixed(1)}% ｜ 風險：${riskMap[riskLevel]}
‣ S/R：${sr}
‣ 理由：${topReason}`;
}
