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
    },
    build: {
        sourcemap: true,
    },
});
