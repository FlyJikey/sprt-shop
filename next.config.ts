import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vzkrdedngnnneudksypj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Важно для работы нейросети на Vercel (чтобы бинарники ONNX паковались)
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node'],

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;