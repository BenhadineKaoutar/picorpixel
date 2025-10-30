import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    emptyOutDir: false,
    ssr: 'index.ts',
    outDir: '../../dist/server',
    target: 'node22',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    rollupOptions: {
      external: [...builtinModules],
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug'] : [],
      },
      mangle: {
        keep_classnames: true, // Keep class names for better error reporting
        keep_fnames: true, // Keep function names for debugging
      },
    },
  },
});
