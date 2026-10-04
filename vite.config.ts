import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable on an Android or iPhone home screen, works offline, updates
    // without a store review. Capacitor can wrap this build later if the app
    // stores are ever needed — see CLAUDE.md.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Tiffin Week',
        short_name: 'Tiffin Week',
        description: 'Weekly meal and tiffin planner — routines, shopping list and prep plan.',
        theme_color: '#F1F0EC',
        background_color: '#F1F0EC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Google sign-in returns to /__/auth/handler (proxied to Firebase in
        // public/_redirects). The SPA fallback must not answer it with index.html.
        navigateFallbackDenylist: [/^\/__\//],
        // The Firebase chunk is only for signed-in users: not precached, so
        // signed-out installs never download it; cached on first use for offline.
        globIgnores: ['**/cloud-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/cloud-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'firebase-sdk', expiration: { maxEntries: 2 } },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, '.') } },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
