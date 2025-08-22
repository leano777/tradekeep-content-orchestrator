/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false, // Disable SWC minification to speed up builds
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;