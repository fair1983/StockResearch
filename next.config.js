/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/ohlc',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  // 生產環境自動移除 console.log/info/debug，保留 error/warn
  compiler: isProd ? { removeConsole: { exclude: ['error', 'warn'] } } : {},
}

module.exports = nextConfig
