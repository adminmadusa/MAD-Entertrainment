import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@mad/shared': resolve(__dirname, '../../packages/shared/src'),
      '@mad/types': resolve(__dirname, '../../packages/types/src'),
      '@mad/ui': resolve(__dirname, '../../packages/ui/src'),
      '@mad/utils': resolve(__dirname, '../../packages/utils/src'),
      '@mad/validations': resolve(__dirname, '../../packages/validations/src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  oxc: false,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, './vitest.setup.ts')],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
