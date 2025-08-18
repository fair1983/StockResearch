import axios from 'axios';
import { AlphaVantageResponse, Candle } from '@/types';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

export class AlphaVantageService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALPHAVANTAGE_API_KEY || '';
  }

  private async makeRequest(symbol: string): Promise<AlphaVantageResponse> {
    if (!this.apiKey) {
      throw new Error('Alpha Vantage API key is required');
    }

    try {
      const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'TIME_SERIES_DAILY_ADJUSTED',
          symbol,
          apikey: this.apiKey,
          outputsize: 'full',
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Alpha Vantage API error: ${error.message}`);
      }
      throw error;
    }
  }

  public async getDailyData(symbol: string): Promise<Candle[]> {
    const data = await this.makeRequest(symbol);
    
    // 檢查是否有錯誤訊息
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
    }

    // 檢查是否觸發 rate limit
    if (data['Note']) {
      throw new Error(`Alpha Vantage rate limit: ${data['Note']}`);
    }

    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('No data available from Alpha Vantage');
    }

    const candles: Candle[] = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      candles.push({
        time: date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['6. volume']),
        adj_close: parseFloat(values['5. adjusted close']),
      });
    }

    // 按日期排序（最新的在前）
    return candles.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  public isAvailable(): boolean {
    return !!this.apiKey;
  }
}
