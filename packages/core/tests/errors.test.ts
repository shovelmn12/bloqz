import { describe, it, expect, expectTypeOf, vi, afterEach } from "vitest";
import { firstValueFrom, map, toArray } from "rxjs";
import { createBloc } from "../src/utils/create.js";
import type { Bloc, ErrorHandler } from "../src/index.js";

type Ev = { type: "BREAK" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pipeline-level errors", () => {
  it("reports pipeline errors with event undefined and closes the bloc", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn<ErrorHandler<Ev>>();
    const boom = new Error("pipeline boom");

    const bloc = createBloc<Ev, number>({
      initialState: 0,
      handlers: {
        BREAK: {
          handler: () => {},
          // A broken transformer: throws inside the operator chain itself,
          // outside of the per-handler error boundary.
          transformer: () => (source) =>
            source.pipe(
              map(() => {
                throw boom;
              })
            ),
        },
      },
      onError,
    });

    const errorsPromise = firstValueFrom(bloc.errors$.pipe(toArray()));
    bloc.add({ type: "BREAK" });

    const errors = await errorsPromise;
    expect(errors).toEqual([{ event: undefined, error: boom }]);
    expect(onError).toHaveBeenCalledWith(boom, undefined);
    expect(bloc.isClosed).toBe(true);
  });

  it("types errors$ events and onError events as possibly undefined", () => {
    expectTypeOf<Bloc<Ev, number>["errors$"]>().toEqualTypeOf<
      import("rxjs").Observable<{ event: Ev | undefined; error: unknown }>
    >();
    expectTypeOf<Parameters<ErrorHandler<Ev>>[1]>().toEqualTypeOf<
      Ev | undefined
    >();
  });
});
