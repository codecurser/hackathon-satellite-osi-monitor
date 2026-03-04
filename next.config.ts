import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'recharts', 'zustand'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
    unoptimized: true,
  },
  turbopack: {
    rules: {
      // Add any Turbopack-specific rules here if needed
    },
  },
  webpack: (config, { isServer, dev }) => {
    // Handle cesium module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      'cesium': require.resolve('cesium'),
    };
    
    // Only apply webpack config when using webpack, not turbopack
    if (dev && process.env.NEXT_WEBPACK_USE === 'true') {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
        };
      }
    }
    return config;
  },
  // Transpile packages that aren't published as ES modules
  transpilePackages: ['cesium'],
};

export default nextConfig;
