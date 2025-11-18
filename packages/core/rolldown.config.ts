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
      file: "dist/index.js",
      format: "esm",
      sourcemap: false,
      keepNames: false,
      minify: true,
      minifyInternalExports: true,
      legalComments: "none",
      cleanDir: true,
    },
  ],
  external: external,
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    manualPureFunctions: ["pipe", "flow", "compose"],
  },
});
