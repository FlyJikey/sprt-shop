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

  // В Next.js 16 эта настройка переехала в корень (убрали experimental)
  // Это говорит Next.js: "Не пытайся собрать эту библиотеку, просто используй её как есть"
  serverExternalPackages: ['@xenova/transformers'],
};

export default nextConfig;