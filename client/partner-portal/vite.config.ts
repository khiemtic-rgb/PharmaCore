import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['dayjs', 'react', 'react-dom'],
  },
  server: {
    port: 5177,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5290',
        changeOrigin: true,
      },
    },
  },
});
