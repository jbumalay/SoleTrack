import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: true },
        manifest: {
          name: 'SoleTrack — Bicol Heritage Footwear',
          short_name: 'SoleTrack',
          description: 'Authentic Filipino and Bicol footwear featuring local artisan craftsmanship.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
          screenshots: [
            { src: '/screenshot-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
            { src: '/screenshot-narrow.png', sizes: '720x1280', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          navigateFallback: '/index.html',
          // NOTE: shop data (products/categories/sizes/stores) must stay fresh —
          // CacheFirst here risks serving stale prices/stock for up to 24h.
          // NetworkFirst falls back to cache only when offline.
          runtimeCaching: [
            {
              urlPattern: /^\/api\/products/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'product-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
                networkTimeoutSeconds: 10,
              },
            },
            {
              urlPattern: /^\/api\/categories/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'category-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
                networkTimeoutSeconds: 10,
              },
            },
            {
              urlPattern: /^\/api\/sizes/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'size-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
                networkTimeoutSeconds: 10,
              },
            },
            {
              urlPattern: /^\/api\/stores/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'store-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-recharts': ['recharts'],
            'vendor-lucide': ['lucide-react'],
            'vendor-motion': ['motion'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
});
