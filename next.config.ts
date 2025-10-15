import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
