/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  outputFileTracingRoot: '/data/data/com.termux/files/home/automation-king-/frontend',
  webpack: (config) => {
    config.watchOptions = { ignored: ['/data/data/**', '/data/**'] }
    return config
  },
}
export default nextConfig
