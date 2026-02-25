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
  serverExternalPackages: ['@xenova/transformers'],

  typescript: {
    ignoreBuildErrors: true,
  },

  turbopack: {},

  // Отключаем попытки Vercel искать С++ бинарники ONNX, заставляя использовать WASM
  webpack: (config, { isServer }) => {
    // Решает ошибку: Module not found: Can't resolve 'onnxruntime-node'
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // Игнорируем бинарные модули onnx, заставляя библиотеку использовать wasm:
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
    });

    return config;
  },
};

export default nextConfig;