import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['dayjs', 'react', 'react-dom'],
  },
  server: {
    port: 5174,
    host: true,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5290',
        changeOrigin: true,
      },
    },
  },
});
