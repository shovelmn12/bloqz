import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@bloqz/relay': new URL(
        '../relay/src/index.ts',
        import.meta.url
      ).pathname,
    },
  },
});
