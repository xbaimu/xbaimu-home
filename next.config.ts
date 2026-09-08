import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingExcludes: { '/*': ['./.env', './.env.*'] },
};

export default nextConfig;
