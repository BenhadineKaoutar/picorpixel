import { defineConfig } from 'vite';
import tailwind from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  build: {
    outDir: '../../dist/client',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    target: 'es2020',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        sourcemapFileNames: '[name].js.map',
      },
    },
    chunkSizeWarningLimit: 1000, // 1MB warning limit
  },
});
