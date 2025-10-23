import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@bloqz/core': new URL(
        '../core/src/index.ts',
        import.meta.url
      ).pathname,
    },
  },
});
