/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    VALKEY_URL: process.env.VALKEY_URL || 'redis://localhost:6379',
  },
};

module.exports = nextConfig;