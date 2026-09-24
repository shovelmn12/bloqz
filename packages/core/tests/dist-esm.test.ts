import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

// Smoke test: the built package must be importable by plain Node ESM.
// This test does not build anything; it is skipped when `dist` is missing.
const distEntry = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const hasDist = existsSync(distEntry);

describe.skipIf(!hasDist)("dist ESM import", () => {
  it("imports dist/index.js with plain Node ESM", () => {
    const url = pathToFileURL(distEntry).href;
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `const m = await import(${JSON.stringify(url)}); if (typeof m.createBloc !== "function") process.exit(2);`,
      ],
      { encoding: "utf8" }
    );
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });
});
