import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  outputFileTracingRoot: projectRoot,
  allowedDevOrigins: ['.monkeycode-ai.live'],
  experimental: {
    allowedHosts: ['.monkeycode-ai.live'],
  },
}
export default nextConfig
