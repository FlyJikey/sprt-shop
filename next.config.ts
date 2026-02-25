import type { NextConfig } from "next";
import path from "path";
import CopyPlugin from "copy-webpack-plugin";

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

  turbopack: {},

  // Настройка Webpack для Vercel: копируем бинарники ONNX напрямую в сборку сервера
  webpack: (config, { isServer, dev }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // Игнорируем модули, чтобы Webpack их не транспилировал, а загружал нативно
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
    });

    if (isServer && !dev) {
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(__dirname, 'node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so.1.14.0'),
              to: path.join(__dirname, '.next/server/chunks/libonnxruntime.so.1.14.0'),
              noErrorOnMissing: true,
            },
            {
              from: path.join(__dirname, 'node_modules/onnxruntime-node/bin/napi-v3/linux/x64/onnxruntime_binding.node'),
              to: path.join(__dirname, '.next/server/chunks/onnxruntime_binding.node'),
              noErrorOnMissing: true,
            }
          ],
        })
      );
    }

    return config;
  },
};

export default nextConfig;