import { describe, it, expect } from "vitest";
import { firstValueFrom, toArray } from "rxjs";
import { EMPTY } from "../src/index.js";
import type { Bloc } from "../src/index.js";

describe("EMPTY bloc", () => {
  it("is a closed, inert placeholder", async () => {
    expect(EMPTY.id).toBe("EMPTY");
    expect(EMPTY.isClosed).toBe(true);
    expect(() => EMPTY.add(undefined as never)).not.toThrow();
    expect(() => EMPTY.close()).not.toThrow();
    await expect(firstValueFrom(EMPTY.state$.pipe(toArray()))).resolves.toEqual([]);
    await expect(firstValueFrom(EMPTY.errors$.pipe(toArray()))).resolves.toEqual([]);
  });

  it("can be used as a placeholder for a typed bloc", () => {
    // Compile-time check: EMPTY stays assignable where it was before.
    type Ev = { type: "A" };
    const placeholder: Bloc<Ev, {}> = EMPTY;
    const asNever: Bloc<never, unknown> = EMPTY;
    expect(placeholder).toBe(asNever);
  });
});
