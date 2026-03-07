/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'alooy.me',
      },
      {
        protocol: 'https',
        hostname: 'api.dfkz.xo.je',
      }
    ],
  },
};

module.exports = nextConfig;
