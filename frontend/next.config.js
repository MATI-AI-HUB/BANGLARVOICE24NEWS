const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // আপনার আগের যেকোনো config এখানে থাকবে
  reactStrictMode: true, 
};

module.exports = withSentryConfig(
  nextConfig,
  {
    org: "banglarvoice", // Sentry dashboard-এ আপনার org name দিন
    project: "frontend",
    silent: true, // Build logs পরিষ্কার রাখতে
    hideSourceMaps: true,
    disableLogger: true,
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
  }
);
