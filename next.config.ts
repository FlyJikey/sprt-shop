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

  // Жестко заставляем Vercel упаковать внешние модули в Serverless функции
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node'],

  typescript: {
    ignoreBuildErrors: true,
  },

  turbopack: {},

  // Принудительно включаем бинарники ONNXRuntime в итоговую сборку роута /api
  // Это 100% официальный workaround от Vercel для бинарников Next.js
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/**/*.so', './node_modules/**/*.node'],
    '/(.*)': ['./node_modules/**/*.so', './node_modules/**/*.node'],
  },
};

export default nextConfig;