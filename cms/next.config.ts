import type { NextConfig } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

if (!BACKEND_URL) {
  throw new Error(
    'CMS backend URL is not configured. Set BACKEND_URL (or NEXT_PUBLIC_API_URL) in the environment.',
  );
}

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        // Proxy all /api/proxy/* requests to the backend, stripping /api/proxy prefix
        source: '/api/proxy/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
