// Mock lightweight-charts
const mockChart = {
  addCandlestickSeries: jest.fn(() => ({
    setData: jest.fn(),
    update: jest.fn(),
  })),
  addLineSeries: jest.fn(() => ({
    setData: jest.fn(),
    update: jest.fn(),
  })),
  addHistogramSeries: jest.fn(() => ({
    setData: jest.fn(),
    update: jest.fn(),
  })),
  subscribeCrosshairMove: jest.fn(),
  unsubscribeCrosshairMove: jest.fn(),
  applyOptions: jest.fn(),
  remove: jest.fn(),
  resize: jest.fn(),
  timeScale: {
    setVisibleRange: jest.fn(),
    setVisibleLogicalRange: jest.fn(),
    subscribeVisibleTimeRangeChange: jest.fn(),
    unsubscribeVisibleTimeRangeChange: jest.fn(),
  },
  priceScale: {
    applyOptions: jest.fn(),
  },
};

const mockSeries = {
  setData: jest.fn(),
  update: jest.fn(),
  setMarkers: jest.fn(),
};

module.exports = {
  createChart: jest.fn(() => mockChart),
  CandlestickSeries: 'CandlestickSeries',
  LineSeries: 'LineSeries',
  HistogramSeries: 'HistogramSeries',
  ColorType: {
    Solid: 'solid',
  },
  CrosshairMode: {
    Normal: 'normal',
  },
  LineType: {
    Simple: 'simple',
  },
  PriceScaleMode: {
    Normal: 'normal',
  },
  Time: {
    UTC: jest.fn((timestamp) => timestamp),
  },
};
