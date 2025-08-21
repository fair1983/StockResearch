import { Fundamentals } from '../interfaces/analyzer';

export interface FundamentalResult {
  score: number;
  notes: string[];
}

export function fundamentalScore(f?: Fundamentals): FundamentalResult {
  if (!f) {
    return { 
      score: 50, 
      notes: ['缺基本面資料，給中性分'] 
    };
  }

  let score = 50;
  const notes: string[] = [];

  // 營收成長 (20分)
  if (f.yoy && f.yoy > 0) {
    if (f.yoy > 20) {
      score += 20;
      notes.push(`營收YoY強勁成長(${f.yoy.toFixed(1)}%)`);
    } else if (f.yoy > 10) {
      score += 15;
      notes.push(`營收YoY穩定成長(${f.yoy.toFixed(1)}%)`);
    } else if (f.yoy > 5) {
      score += 10;
      notes.push(`營收YoY正向成長(${f.yoy.toFixed(1)}%)`);
    } else {
      score += 5;
      notes.push(`營收YoY微幅成長(${f.yoy.toFixed(1)}%)`);
    }
  } else if (f.yoy && f.yoy < 0) {
    if (f.yoy < -20) {
      score -= 15;
      notes.push(`營收YoY大幅下滑(${f.yoy.toFixed(1)}%)`);
    } else {
      score -= 10;
      notes.push(`營收YoY下滑(${f.yoy.toFixed(1)}%)`);
    }
  }

  // 毛利率 (15分)
  if (f.margin) {
    if (f.margin > 70) {
      score += 15;
      notes.push('毛利率極高(>70%)');
    } else if (f.margin > 50) {
      score += 12;
      notes.push('毛利率優秀(>50%)');
    } else if (f.margin > 30) {
      score += 8;
      notes.push('毛利率良好(>30%)');
    } else if (f.margin > 20) {
      score += 5;
      notes.push('毛利率一般(>20%)');
    } else {
      score -= 5;
      notes.push('毛利率偏低(<20%)');
    }
  }

  // 自由現金流 (15分)
  if (f.fcfMargin) {
    if (f.fcfMargin > 20) {
      score += 15;
      notes.push('自由現金流充沛(>20%)');
    } else if (f.fcfMargin > 10) {
      score += 10;
      notes.push('自由現金流良好(>10%)');
    } else if (f.fcfMargin > 5) {
      score += 5;
      notes.push('自由現金流穩定(>5%)');
    } else if (f.fcfMargin < 0) {
      score -= 10;
      notes.push('自由現金流為負');
    }
  }

  // 淨利率 (10分)
  if (f.netIncome && f.revenue) {
    const netMargin = (f.netIncome / f.revenue) * 100;
    if (netMargin > 20) {
      score += 10;
      notes.push('淨利率優秀(>20%)');
    } else if (netMargin > 10) {
      score += 8;
      notes.push('淨利率良好(>10%)');
    } else if (netMargin > 5) {
      score += 5;
      notes.push('淨利率穩定(>5%)');
    } else if (netMargin < 0) {
      score -= 10;
      notes.push('淨利率為負');
    }
  }

  // 股東權益報酬率 (10分)
  if (f.returnOnEquity) {
    if (f.returnOnEquity > 20) {
      score += 10;
      notes.push('ROE優秀(>20%)');
    } else if (f.returnOnEquity > 15) {
      score += 8;
      notes.push('ROE良好(>15%)');
    } else if (f.returnOnEquity > 10) {
      score += 5;
      notes.push('ROE穩定(>10%)');
    } else if (f.returnOnEquity < 5) {
      score -= 5;
      notes.push('ROE偏低(<5%)');
    }
  }

  // 估值指標 (15分)
  if (f.peg && f.peg < 1) {
    score += 8;
    notes.push('PEG<1 具成長性且估值合理');
  } else if (f.peg && f.peg < 1.5) {
    score += 5;
    notes.push('PEG<1.5 估值合理');
  } else if (f.peg && f.peg > 2) {
    score -= 5;
    notes.push('PEG>2 估值偏高');
  }

  if (f.pe && f.pe > 0 && f.pe < 15) {
    score += 5;
    notes.push('PE<15 估值偏低');
  } else if (f.pe && f.pe > 30) {
    score -= 5;
    notes.push('PE>30 估值偏高');
  }

  if (f.ps && f.ps > 15) {
    score -= 3;
    notes.push('PS偏高');
  }

  // 股息率 (5分)
  if (f.dividendYield && f.dividendYield > 3) {
    score += 5;
    notes.push('股息率吸引人(>3%)');
  } else if (f.dividendYield && f.dividendYield > 1) {
    score += 3;
    notes.push('股息率穩定(>1%)');
  }

  // 財務槓桿 (5分)
  if (f.debtToEquity && f.debtToEquity < 0.5) {
    score += 5;
    notes.push('財務槓桿低(<0.5)');
  } else if (f.debtToEquity && f.debtToEquity > 1) {
    score -= 5;
    notes.push('財務槓桿高(>1)');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    notes: notes.slice(0, 6) // 最多顯示6個理由
  };
}
