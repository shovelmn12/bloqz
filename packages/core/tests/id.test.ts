import { describe, it, expect } from "vitest";
import { generateShortID } from "../src/utils/id.js";

describe("generateShortID", () => {
  it("should generate a string ID with a length of 10", () => {
    const id = generateShortID();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(10);
  });
});
