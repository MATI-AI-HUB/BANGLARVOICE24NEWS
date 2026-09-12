/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8090';
    return [
      { source: '/api/backend/:path*', destination: `${api}/api/:path*` },
    ];
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
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['/**', '!**/Banglarvoice-apps/**', '!**/frontend/**'],
      };
    }
    return config;
  },
  allowedDevOrigins: ['192.168.0.106', '10.83.106.238'],
};
module.exports = nextConfig;
