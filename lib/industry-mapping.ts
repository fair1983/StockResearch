// 產業名稱中英文映射表
export interface IndustryMapping {
  [key: string]: {
    zh: string;
    en: string;
  };
}

// 美股產業映射
export const US_INDUSTRY_MAPPING: IndustryMapping = {
  'Technology': {
    zh: '科技',
    en: 'Technology'
  },
  'Consumer Electronics': {
    zh: '消費電子',
    en: 'Consumer Electronics'
  },
  'Semiconductors': {
    zh: '半導體',
    en: 'Semiconductors'
  },
  'Software - Infrastructure': {
    zh: '軟體基礎設施',
    en: 'Software - Infrastructure'
  },
  'Software - Application': {
    zh: '應用軟體',
    en: 'Software - Application'
  },
  'Internet Content & Information': {
    zh: '網路內容與資訊',
    en: 'Internet Content & Information'
  },
  'Internet Retail': {
    zh: '網路零售',
    en: 'Internet Retail'
  },
  'Auto Manufacturers': {
    zh: '汽車製造',
    en: 'Auto Manufacturers'
  },
  'Entertainment': {
    zh: '娛樂',
    en: 'Entertainment'
  },
  'Financial Services': {
    zh: '金融服務',
    en: 'Financial Services'
  },
  'Banks - Global': {
    zh: '全球銀行',
    en: 'Banks - Global'
  },
  'Insurance - Diversified': {
    zh: '綜合保險',
    en: 'Insurance - Diversified'
  },
  'Healthcare': {
    zh: '醫療保健',
    en: 'Healthcare'
  },
  'Drug Manufacturers - General': {
    zh: '製藥',
    en: 'Drug Manufacturers - General'
  },
  'Consumer Defensive': {
    zh: '防禦性消費',
    en: 'Consumer Defensive'
  },
  'Beverages - Non-Alcoholic': {
    zh: '非酒精飲料',
    en: 'Beverages - Non-Alcoholic'
  },
  'Household & Personal Products': {
    zh: '家用與個人用品',
    en: 'Household & Personal Products'
  },
  'Discount Stores': {
    zh: '折扣商店',
    en: 'Discount Stores'
  },
  'Energy': {
    zh: '能源',
    en: 'Energy'
  },
  'Oil & Gas Integrated': {
    zh: '綜合石油天然氣',
    en: 'Oil & Gas Integrated'
  },
  'Industrials': {
    zh: '工業',
    en: 'Industrials'
  },
  'Aerospace & Defense': {
    zh: '航太與國防',
    en: 'Aerospace & Defense'
  },
  'Specialty Industrial Machinery': {
    zh: '專業工業機械',
    en: 'Specialty Industrial Machinery'
  },
  'Communication Services': {
    zh: '通訊服務',
    en: 'Communication Services'
  },
  'Telecom Services': {
    zh: '電信服務',
    en: 'Telecom Services'
  },
  'Real Estate': {
    zh: '房地產',
    en: 'Real Estate'
  },
  'Basic Materials': {
    zh: '基礎材料',
    en: 'Basic Materials'
  },
  'Utilities': {
    zh: '公用事業',
    en: 'Utilities'
  }
};

  // 台股產業映射
  export const TW_INDUSTRY_MAPPING: IndustryMapping = {
    '01': {
      zh: '水泥工業',
      en: 'Cement Industry'
    },
    '02': {
      zh: '食品工業',
      en: 'Food Industry'
    },
    '03': {
      zh: '塑膠工業',
      en: 'Plastic Industry'
    },
    '04': {
      zh: '紡織纖維',
      en: 'Textile & Fiber'
    },
    '05': {
      zh: '電機機械',
      en: 'Electrical & Machinery'
    },
    '06': {
      zh: '電器電纜',
      en: 'Electrical & Cable'
    },
    '07': {
      zh: '化學生技醫療',
      en: 'Chemical, Biotech & Medical'
    },
    '08': {
      zh: '玻璃陶瓷',
      en: 'Glass & Ceramics'
    },
    '09': {
      zh: '造紙工業',
      en: 'Paper Industry'
    },
    '10': {
      zh: '鋼鐵工業',
      en: 'Steel Industry'
    },
    '11': {
      zh: '橡膠工業',
      en: 'Rubber Industry'
    },
    '12': {
      zh: '汽車工業',
      en: 'Automotive Industry'
    },
    '13': {
      zh: '電子工業',
      en: 'Electronics Industry'
    },
    '14': {
      zh: '建材營造',
      en: 'Building Materials & Construction'
    },
    '15': {
      zh: '航運業',
      en: 'Shipping Industry'
    },
    '16': {
      zh: '觀光事業',
      en: 'Tourism Industry'
    },
    '17': {
      zh: '金融保險',
      en: 'Finance & Insurance'
    },
    '18': {
      zh: '貿易百貨',
      en: 'Trading & Department Stores'
    },
    '19': {
      zh: '綜合',
      en: 'Conglomerate'
    },
    '20': {
      zh: '其他',
      en: 'Others'
    },
    // 添加英文產業名稱的映射
    'Basic Materials': {
      zh: '基礎材料',
      en: 'Basic Materials'
    },
    'Building Materials': {
      zh: '建材',
      en: 'Building Materials'
    },
    'Consumer Defensive': {
      zh: '防禦性消費',
      en: 'Consumer Defensive'
    },
    'Packaged Foods': {
      zh: '包裝食品',
      en: 'Packaged Foods'
    }
  };

/**
 * 獲取產業的中英文顯示名稱
 */
export function getIndustryDisplayName(sector: string, industry: string, market: string): string {
  if (!sector || sector === 'Unknown' || sector === '不能評定') {
    return '不能評定';
  }

  const mapping = market === 'US' ? US_INDUSTRY_MAPPING : TW_INDUSTRY_MAPPING;
  
  // 先嘗試匹配完整的產業名稱
  if (mapping[industry]) {
    return `${mapping[industry].zh} (${mapping[industry].en})`;
  }
  
  // 再嘗試匹配產業分類
  if (mapping[sector]) {
    return `${mapping[sector].zh} (${mapping[sector].en})`;
  }
  
  // 如果都沒有匹配到，返回原始名稱
  return `${sector} (${industry})`;
}
