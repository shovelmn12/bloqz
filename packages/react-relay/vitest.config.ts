/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname in an ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      // Correctly resolve the path to the local @bloqz/relay package
      '@bloqz/relay': path.resolve(__dirname, '../relay/src'),
      '@bloqz/core': path.resolve(__dirname, '../core/src'),
    },
  },
});
