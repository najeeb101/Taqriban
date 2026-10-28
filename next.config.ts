import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the Turbopack root to this repo (a stray lockfile higher up the tree otherwise confuses detection).
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
