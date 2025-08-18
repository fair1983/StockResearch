import Link from 'next/link';

export default function Home() {
  const sampleStocks = [
    { market: 'US', symbol: 'TSLA', name: 'Tesla' },
    { market: 'US', symbol: 'AAPL', name: 'Apple' },
    { market: 'US', symbol: 'MSFT', name: 'Microsoft' },
    { market: 'TW', symbol: '2330', name: '台積電' },
    { market: 'TW', symbol: '2317', name: '鴻海' },
    { market: 'TW', symbol: '0050', name: '元大台灣50' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          股票研究圖表系統
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          提供美股和台股的延遲/歷史K線研究圖表，支援日K線分析
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">美股 (US)</h2>
          <p className="text-gray-600 mb-4">
            透過 Alpha Vantage API 取得美股歷史資料
          </p>
          <div className="space-y-2">
            {sampleStocks.filter(stock => stock.market === 'US').map(stock => (
              <Link
                key={stock.symbol}
                href={`/${stock.market}/${stock.symbol}`}
                className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              >
                <div className="font-medium text-blue-900">{stock.symbol}</div>
                <div className="text-sm text-blue-700">{stock.name}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">台股 (TW)</h2>
          <p className="text-gray-600 mb-4">
            透過 Alpha Vantage 或 TWSE 取得台股歷史資料
          </p>
          <div className="space-y-2">
            {sampleStocks.filter(stock => stock.market === 'TW').map(stock => (
              <Link
                key={stock.symbol}
                href={`/${stock.market}/${stock.symbol}`}
                className="block p-3 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
              >
                <div className="font-medium text-green-900">{stock.symbol}</div>
                <div className="text-sm text-green-700">{stock.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">功能特色</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">K線圖表</h3>
            <p className="text-sm text-gray-600">專業的日K線圖表顯示</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">多市場支援</h3>
            <p className="text-sm text-gray-600">美股和台股資料來源</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">歷史資料</h3>
            <p className="text-sm text-gray-600">延遲/歷史資料研究用途</p>
          </div>
        </div>
      </div>
    </div>
  );
}
