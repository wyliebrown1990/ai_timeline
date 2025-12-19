import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

/**
 * Vite configuration for AI Timeline
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [
    react(),
    // Bundle visualizer - generates dist/stats.html for analysis
    // Only enabled when ANALYZE=true
    process.env.ANALYZE === 'true' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
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
    // Disable source maps in production for smaller build
    sourcemap: false,
    rollupOptions: {
      // Explicitly disable sourcemaps in rollup
      output: {
        sourcemap: false,
        // Function-based manual chunks for better code splitting
        manualChunks(id) {
          // Vendor chunks - split node_modules by package
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Form handling
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'vendor-forms';
            }
            // Zod validation
            if (id.includes('/zod/')) {
              return 'vendor-zod';
            }
            // UI libraries
            if (id.includes('@headlessui') || id.includes('@heroicons') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            // Markdown
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('unified') || id.includes('mdast') || id.includes('hast') || id.includes('micromark')) {
              return 'vendor-markdown';
            }
          }
          return undefined;
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
  },
});
