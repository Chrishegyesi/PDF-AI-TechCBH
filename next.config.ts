import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Configuration for PDF.js
  webpack: (config) => {
    // Handle PDF.js worker
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    
    config.module.rules.push({
      test: /\.pdf$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/files/',
          outputPath: 'static/files/',
        },
      },
    });

    return config;
  },
  
  // Environment variables for PDF.js
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
};

export default nextConfig;
