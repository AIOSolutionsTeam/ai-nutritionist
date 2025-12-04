import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'www.vigaia.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/temp/:path*',
        destination: '/api/temp/:path*',
      },
    ];
  },
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
