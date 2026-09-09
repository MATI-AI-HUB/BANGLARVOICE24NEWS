/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8090';
    return [{ source: '/api/backend/:path*', destination: `${api}/api/:path*` }];
  },
};

module.exports = nextConfig;
