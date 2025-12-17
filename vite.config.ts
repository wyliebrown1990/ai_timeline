import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite configuration for AI Timeline
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Path alias for cleaner imports: import { Button } from '@/components/Button'
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('Proxying:', req.method, req.url);
          });
        },
      },
    },
  },
  build: {
    sourcemap: true,
  },
});
