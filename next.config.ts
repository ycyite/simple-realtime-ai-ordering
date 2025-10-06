import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All API routes are now in Next.js - no proxy needed
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle ws for server-side (keep it external)
      config.externals = [...(config.externals || []), 'ws', 'bufferutil', 'utf-8-validate'];
    }
    return config;
  },
};

export default nextConfig;
