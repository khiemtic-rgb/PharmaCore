import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

function staffAppVersionJson() {
  return {
    name: 'staff-app-version-json',
    closeBundle() {
      const outDir = fileURLToPath(new URL('./dist', import.meta.url));
      const build = process.env.VITE_APP_BUILD || new Date().toISOString();
      writeFileSync(`${outDir}/version.json`, JSON.stringify({ build }));
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    staffAppVersionJson(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-512.png', 'icon-192.png', 'apple-touch-icon.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Novixa Quầy',
        short_name: 'Novixa Quầy',
        description: 'POS mobile cho nhân viên quầy thuốc',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'vi',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      injectRegister: 'auto',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5175,
    host: true,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:5290', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5290', changeOrigin: true },
    },
  },
});
