/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),   // ← এটা যোগ হলো
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async rewrites() {
    const legacy =
      process.env.ENABLE_LEGACY_POCKETBASE === 'true' &&
      process.env.NODE_ENV !== 'production'
    const api = process.env.NEXT_PUBLIC_API_URL || ''
    if (!legacy || !api) return []
    return [
      { source: '/api/backend/:path*', destination: `${api}/api/:path*` },
    ]
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['/**', '!**/Banglarvoice-apps/**', '!**/frontend/**'],
      }
      config.cache = false   // ← Termux এর webpack cache warning বন্ধ করবে
    }
    return config
  },
  allowedDevOrigins: ['192.168.0.106', '10.83.106.238'],
}

module.exports = nextConfig
