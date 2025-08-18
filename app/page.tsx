import Link from 'next/link';
import StockSearch from '@/components/StockSearch';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 標題區域 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              股票研究系統
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              專業的股票技術分析和基本面研究工具
            </p>
          </div>

          {/* 快速導航 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Link href="/stocks" className="group">
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">股票列表</h3>
                    <p className="text-sm text-gray-600">瀏覽所有股票和金融商品</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/TW/2330" className="group">
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">台積電</h3>
                    <p className="text-sm text-gray-600">查看台積電 (2330) 走勢</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/US/AAPL" className="group">
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600">Apple</h3>
                    <p className="text-sm text-gray-600">查看 Apple (AAPL) 走勢</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/US/TSLA" className="group">
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600">Tesla</h3>
                    <p className="text-sm text-gray-600">查看 Tesla (TSLA) 走勢</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* 搜尋區域 */}
          <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              快速搜尋股票
            </h2>
            <div className="max-w-2xl mx-auto">
              <StockSearch 
                placeholder="輸入股票代碼或名稱，例如：2330、台積電、AAPL..."
                className="mb-4"
              />
              <p className="text-sm text-gray-500 text-center">
                支援台股和美股搜尋，可輸入股票代碼或公司名稱
              </p>
            </div>
          </div>

          {/* 熱門股票 */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* 台股熱門 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-6 bg-blue-500 rounded mr-3"></span>
                台股熱門
              </h3>
              <div className="space-y-3">
                <Link href="/TW/2330" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">2330 台積電</div>
                      <div className="text-sm text-gray-500">台灣積體電路製造</div>
                    </div>
                    <div className="text-blue-500">→</div>
                  </div>
                </Link>
                <Link href="/TW/2317" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">2317 鴻海</div>
                      <div className="text-sm text-gray-500">鴻海精密工業</div>
                    </div>
                    <div className="text-blue-500">→</div>
                  </div>
                </Link>
                <Link href="/TW/0050" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">0050 元大台灣50</div>
                      <div className="text-sm text-gray-500">ETF</div>
                    </div>
                    <div className="text-blue-500">→</div>
                  </div>
                </Link>
                <Link href="/TW/3138" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">3138 耀登</div>
                      <div className="text-sm text-gray-500">耀登科技</div>
                    </div>
                    <div className="text-blue-500">→</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* 美股熱門 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-6 bg-green-500 rounded mr-3"></span>
                美股熱門
              </h3>
              <div className="space-y-3">
                <Link href="/US/AAPL" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">AAPL Apple Inc.</div>
                      <div className="text-sm text-gray-500">蘋果公司</div>
                    </div>
                    <div className="text-blue-500">→</div>
                  </div>
                </Link>
                <Link href="/US/GOOGL" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">GOOGL Alphabet Inc.</div>
                      <div className="text-sm text-gray-500">谷歌母公司</div>
                    </div>
                    <div className="text-blue-500">→</div>
                  </div>
                </Link>
                <Link href="/US/MSFT" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">MSFT Microsoft</div>
                      <div className="text-sm text-gray-500">微軟公司</div>
                    </div>
                    <div className="text-blue-500">→</div>
                  </div>
                </Link>
                <Link href="/US/TSLA" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">TSLA Tesla Inc.</div>
                      <div className="text-sm text-gray-500">特斯拉</div>
                    </div>
                    <div className="text-blue-500">→</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* 功能特色 */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              系統特色
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">技術分析</h4>
                <p className="text-gray-600 text-sm">
                  支援多種技術指標，包括 MA、EMA、MACD、RSI、BOLL、KDJ 等
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">即時資料</h4>
                <p className="text-gray-600 text-sm">
                  提供即時股價資料，支援日K、週K、月K 等多種時間框架
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">智能搜尋</h4>
                <p className="text-gray-600 text-sm">
                  支援股票代碼和名稱搜尋，快速找到目標股票
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
