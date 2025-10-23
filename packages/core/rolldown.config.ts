import { defineConfig } from "rolldown";

import pkg from "./package.json" assert { type: "json" };

// Get all keys from "dependencies" in package.json
const external = Object.keys(pkg.dependencies || {});

/**
 * @type {import('rolldown').Config}
 */
export default defineConfig({
  input: "src/index.ts",
  output: [
    {
      format: "es",
      file: pkg.exports.main,
      sourcemap: true,
    },
    {
      format: "cjs",
      file: pkg.exports.main,
      sourcemap: true,
    },
  ],
  external: external,
});
