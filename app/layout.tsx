import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '股票研究圖表系統',
  description: '提供美股和台股的延遲/歷史K線研究圖表，支援日K線分析',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  股票研究圖表系統
                </h1>
                <nav className="flex space-x-4">
                  <a href="/" className="text-gray-600 hover:text-gray-900">
                    首頁
                  </a>
                </nav>
              </div>
            </div>
          </header>
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          
          <footer className="bg-white border-t mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="text-center text-sm text-gray-600 space-y-2">
                <p>本系統僅提供延遲/歷史研究資料，非即時報價，僅供研究用途</p>
                <p>資料來源：Alpha Vantage / TWSE；使用請遵守資料來源條款</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
