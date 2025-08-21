import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
      ok: (options?.status || 200) < 400,
    })),
  },
  NextRequest: class MockNextRequest {
    constructor(url) {
      this.url = url;
    }
    json() {
      return Promise.resolve({});
    }
  },
}))

// Mock fetch
global.fetch = jest.fn()

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    api: {
      request: jest.fn(),
      response: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      timing: jest.fn(),
    },
    yahooFinance: {
      request: jest.fn(),
      response: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      dataRange: jest.fn(),
    },
    frontend: {
      dataFetch: jest.fn(),
      chartRender: jest.fn(),
      error: jest.fn(),
    },
    system: {
      cache: jest.fn(),
      performance: jest.fn(),
    },
    stockMetadata: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    ai: {
      analysis: jest.fn(),
      error: jest.fn(),
    },
    configuration: {
      info: jest.fn(),
      error: jest.fn(),
    },
    monitor: {
      info: jest.fn(),
      progress: jest.fn(),
      complete: jest.fn(),
    },
    scheduler: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      complete: jest.fn(),
    },
    dataCollection: {
      start: jest.fn(),
      progress: jest.fn(),
      complete: jest.fn(),
      error: jest.fn(),
      request: jest.fn(),
      success: jest.fn(),
      info: jest.fn(),
    },
    stockList: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    updateConfig: jest.fn(),
    getConfig: jest.fn(),
    resetConfig: jest.fn(),
    getLogs: jest.fn(() => []),
    clearLogs: jest.fn(),
    exportLogs: jest.fn(() => '[]'),
  },
}))



// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Performance monitoring mock
global.performance = {
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  now: jest.fn(() => Date.now()),
}

// Mock performance.now for Node.js environment
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  };
}
