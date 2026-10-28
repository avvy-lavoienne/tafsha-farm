import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  // MATI: cache navigasi menyimpan hasil redirect /masuk saat masih tamu
  // (prefetch bottom nav jalan sebelum login), lalu disajikan lagi
  // setelah login → dikira sesi hilang / loginform muncul lagi.
  cacheOnFrontEndNav: false,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    runtimeCaching: [
      // API Supabase (REST): bisa dibuka offline di kunjungan kedua.
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
        handler: "NetworkFirst",
        method: "GET",
        options: {
          cacheName: "tafsha-supabase-rest",
          expiration: { maxEntries: 64, maxAgeSeconds: 5 * 60 },
          networkTimeoutSeconds: 8,
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Foto kebun dari storage: tampil dari cache saat offline.
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/kebun-foto\/.*/i,
        handler: "CacheFirst",
        method: "GET",
        options: {
          cacheName: "tafsha-kebun-foto",
          expiration: { maxEntries: 120, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

export default pwaConfig(nextConfig);
