const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Security Headers & Caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=90',
          },
        ],
      },
    ];
  },

  // Image Optimization (for faster loading)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all remote images for now, restrict later if needed
      },
    ],
  },
};

module.exports = withSentryConfig(
  nextConfig,
  {
    org: "banglarvoice",
    project: "frontend",
    silent: true,
    hideSourceMaps: true,
    disableLogger: true,
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
  }
);
