const path = require('node:path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ['.monkeycode-ai.live'],
  experimental: {
    allowedHosts: ['.monkeycode-ai.live'],
  },
}
module.exports = nextConfig
