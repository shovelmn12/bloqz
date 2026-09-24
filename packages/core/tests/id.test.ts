import { describe, it, expect, vi, afterEach } from "vitest";
import { generateShortID } from "../src/utils/id.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateShortID", () => {
  it("generates a string ID of at least 16 characters", () => {
    const id = generateShortID();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThanOrEqual(16);
  });

  it("uses crypto.randomUUID when available", () => {
    const uuid = "123e4567-e89b-42d3-a456-426614174000";
    vi.stubGlobal("crypto", { randomUUID: () => uuid });
    expect(generateShortID()).toBe(uuid);
  });

  it("generates 10,000 unique IDs", () => {
    const ids = new Set(Array.from({ length: 10_000 }, generateShortID));
    expect(ids.size).toBe(10_000);
  });

  it("falls back to a non-crypto ID of at least 16 chars that is still unique", () => {
    vi.stubGlobal("crypto", undefined);
    const ids = Array.from({ length: 10_000 }, generateShortID);
    expect(new Set(ids).size).toBe(10_000);
    for (const id of ids) {
      expect(id.length).toBeGreaterThanOrEqual(16);
    }
  });
});
