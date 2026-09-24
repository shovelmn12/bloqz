import { describe, it, expect, vi, afterEach } from "vitest";
import { EMPTY, Subject, firstValueFrom, of, throwError, toArray } from "rxjs";
import { createPipeBloc } from "../src/utils/create.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createPipeBloc with synchronously finishing sources", () => {
  it("closes and keeps the last value when the source completes synchronously (of)", () => {
    const bloc = createPipeBloc<unknown, number>({ source$: of(1) });
    expect(bloc.isClosed).toBe(true);
    expect(bloc.state).toBe(1);
  });

  it("closes when the source is EMPTY", () => {
    const bloc = createPipeBloc<unknown, number>({
      source$: EMPTY,
      initialState: 7,
    });
    expect(bloc.isClosed).toBe(true);
    expect(bloc.state).toBe(7);
  });

  it("closes when the source errors synchronously", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("sync boom");
    let bloc: ReturnType<typeof createPipeBloc<unknown, number>> | undefined;
    expect(() => {
      bloc = createPipeBloc<unknown, number>({
        source$: throwError(() => err),
      });
    }).not.toThrow();
    expect(bloc!.isClosed).toBe(true);
  });

  it("completes state$ for late subscribers after a synchronous completion", async () => {
    const bloc = createPipeBloc<unknown, number>({ source$: of(1, 2) });
    await expect(firstValueFrom(bloc.state$.pipe(toArray()))).resolves.toEqual(
      []
    );
    expect(bloc.state).toBe(2);
  });
});

describe("createPipeBloc errors$", () => {
  it("emits { event: undefined, error } when the source errors, then completes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const source$ = new Subject<number>();
    const bloc = createPipeBloc<unknown, number>({ source$, initialState: 0 });

    const errorsPromise = firstValueFrom(bloc.errors$.pipe(toArray()));
    const err = new Error("async boom");
    source$.error(err);

    const errors = await errorsPromise;
    expect(errors).toEqual([{ event: undefined, error: err }]);
    expect(bloc.isClosed).toBe(true);
  });

  it("completes errors$ on close without emitting", async () => {
    const source$ = new Subject<number>();
    const bloc = createPipeBloc<unknown, number>({ source$, initialState: 0 });
    const errorsPromise = firstValueFrom(bloc.errors$.pipe(toArray()));
    bloc.close();
    await expect(errorsPromise).resolves.toEqual([]);
  });
});
