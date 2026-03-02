import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
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

  // Убрали transpilePackages, так как отказались от dynamicIconImports (было жутко медленно)

  typescript: {
    ignoreBuildErrors: true,
  },

  // turbopack: {},

  // Принудительно включаем бинарники ONNXRuntime ТОЛЬКО в API-роуты (ИИ)
  // Раньше паттерн /(.*)  включал их во ВСЕ страницы — это вызывало огромные cold starts
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/onnxruntime-node/bin/napi-v3/**/*.so', './node_modules/onnxruntime-node/bin/napi-v3/**/*.node'],
  },
};

export default nextConfig;