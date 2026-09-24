import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    typecheck: {
      enabled: true,
      include: ["tests/**/*.test-d.ts", "tests/**/*.test-d.tsx"],
      tsconfig: "./tsconfig.test.json",
    },
  },
  resolve: {
    alias: {
      "@bloqz/relay": new URL(
        "../relay/src/index.ts",
        import.meta.url
      ).pathname,
    },
  },
});
