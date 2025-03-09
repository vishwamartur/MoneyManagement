/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: { unoptimized: true },
  output: 'standalone'
};

module.exports = nextConfig;
