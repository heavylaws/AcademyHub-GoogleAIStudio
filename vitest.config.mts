import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'transform',
  },
  test: {
    environment: 'node',
    globals: true,
    deps: {
      optimizer: {
        web: {
          enabled: false,
        },
      },
    },
  },
  oxc: false,
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './'),
    },
  },
});
