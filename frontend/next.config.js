/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    allowedHosts: ['.monkeycode-ai.live'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.banglarvoice24news.com' },
      { protocol: 'https', hostname: 'banglarvoice24news.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'commons.wikimedia.org' },
      { protocol: 'https', hostname: 'images.openverse.org' },
      { protocol: 'https', hostname: 'api.openverse.org' },
      { protocol: 'https', hostname: '**.bbc.co.uk' },
      { protocol: 'https', hostname: '**.bbc.com' },
      { protocol: 'https', hostname: '**.prothomalo.com' },
      { protocol: 'https', hostname: '**.bdnews24.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**' },
    ],
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
