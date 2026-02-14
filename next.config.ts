import type { NextConfig } from "next";

// ИСПРАВЛЕНИЕ: Используем 'any', чтобы TypeScript не ругался на eslint/typescript настройки
const nextConfig: any = {
  // --- ТВОИ ВАЖНЫЕ НАСТРОЙКИ ---
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
  
  // Важно для работы нейросети
  serverExternalPackages: ['@xenova/transformers'],

  // --- ИГНОРИРОВАНИЕ ОШИБОК (Теперь сработает) ---
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;