import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase/supabase-js')) {
                return 'vendor-supabase';
              }

              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }

              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }

              if (
                id.includes('react-router-dom')
                || id.includes('react-dom')
                || id.includes('/react/')
              ) {
                return 'vendor-react';
              }
            }
          },
        },
      },
    },
    server: {
      proxy: {
        '/api/shipping': 'http://127.0.0.1:4000',
        '/api/store': 'http://127.0.0.1:4000',
        '/uploads': 'http://127.0.0.1:4000',
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
