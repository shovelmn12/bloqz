import React, { createContext, FC, PropsWithChildren, StrictMode } from "react";
import { describe, it, expect } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { createBloc, Bloc } from "@bloqz/core";
import { useBloc, select, get, observe, add, close } from "../src/index.js";

type S = { count: number; name: string; tags: string[] };
type E =
  | { type: "inc" }
  | { type: "rename"; name: string }
  | { type: "retag"; tags: string[] };

const makeBloc = () =>
  createBloc<E, S>({
    initialState: { count: 0, name: "a", tags: ["x"] },
    handlers: {
      inc: (_, { update }) => update((s) => ({ ...s, count: s.count + 1 })),
      rename: (e, { update }) => update((s) => ({ ...s, name: e.name })),
      retag: (e, { update }) => update((s) => ({ ...s, tags: e.tags })),
    },
  });

/** Wraps a bloc so we can count subscriptions to its state$. */
const withSubscriptionCounter = (bloc: Bloc<E, S>) => {
  const counter = { subscribes: 0, active: 0 };
  const state$ = new Observable<S>((o) => {
    counter.subscribes++;
    counter.active++;
    const sub = bloc.state$.subscribe(o);
    return () => {
      counter.active--;
      sub.unsubscribe();
    };
  });
  const wrapped: Bloc<E, S> = {
    get id() {
      return bloc.id;
    },
    state$,
    get state() {
      return bloc.state;
    },
    errors$: bloc.errors$,
    add: bloc.add,
    close: bloc.close,
    get isClosed() {
      return bloc.isClosed;
    },
  };
  return { bloc: wrapped, counter };
};

const Ctx = createContext<Bloc<E, S> | undefined>(undefined);

const providerFor =
  (bloc: Bloc<E, S>): FC<PropsWithChildren> =>
  ({ children }) =>
    <Ctx.Provider value={bloc}>{children}</Ctx.Provider>;

describe("useBloc select: inline selectors", () => {
  it("renders an inline object-returning selector without looping", async () => {
    const bloc = makeBloc();
    let renders = 0;

    const { result } = renderHook(
      () => {
        renders++;
        return useBloc(Ctx, select((s: S) => ({ count: s.count })));
      },
      { wrapper: providerFor(bloc) }
    );

    expect(result.current).toEqual({ count: 0 });
    expect(renders).toBeLessThanOrEqual(2);

    act(() => bloc.add({ type: "inc" }));
    await waitFor(() => expect(result.current).toEqual({ count: 1 }));
    expect(renders).toBeLessThanOrEqual(4);

    bloc.close();
  });

  it("re-renders only when the selected value changes deeply", async () => {
    const bloc = makeBloc();
    let renders = 0;

    const { result } = renderHook(
      () => {
        renders++;
        return useBloc(Ctx, select((s: S) => ({ tags: s.tags })));
      },
      { wrapper: providerFor(bloc) }
    );

    const first = result.current;
    const baseline = renders;

    // Unrelated state change: no re-render, same reference.
    act(() => bloc.add({ type: "inc" }));
    await waitFor(() => expect(bloc.state.count).toBe(1));
    expect(renders).toBe(baseline);
    expect(result.current).toBe(first);

    // Deeply-equal but new array: no re-render, same reference.
    act(() => bloc.add({ type: "retag", tags: ["x"] }));
    await waitFor(() => expect(bloc.state.tags).not.toBe(first.tags));
    expect(renders).toBe(baseline);
    expect(result.current).toBe(first);

    // Real change: re-render with new value.
    act(() => bloc.add({ type: "retag", tags: ["y"] }));
    await waitFor(() => expect(result.current).toEqual({ tags: ["y"] }));
    expect(renders).toBe(baseline + 1);

    bloc.close();
  });

  it("returns the same reference across parent re-renders for equal selections", () => {
    const bloc = makeBloc();
    const { result, rerender } = renderHook(
      () => useBloc(Ctx, select((s: S) => ({ name: s.name }))),
      { wrapper: providerFor(bloc) }
    );
    const first = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(first);
    bloc.close();
  });

  it("works with an inline primitive selector", async () => {
    const bloc = makeBloc();
    let renders = 0;
    const { result, rerender } = renderHook(
      () => {
        renders++;
        return useBloc(Ctx, select((s: S) => s.count * 10));
      },
      { wrapper: providerFor(bloc) }
    );

    expect(result.current).toBe(0);
    act(() => bloc.add({ type: "inc" }));
    await waitFor(() => expect(result.current).toBe(10));
    rerender();
    expect(result.current).toBe(10);
    expect(renders).toBeLessThanOrEqual(4);
    bloc.close();
  });

  it("does not re-subscribe on every render with an inline selector", () => {
    const { bloc, counter } = withSubscriptionCounter(makeBloc());
    const { rerender, unmount } = renderHook(
      () => useBloc(Ctx, select((s: S) => ({ count: s.count }))),
      { wrapper: providerFor(bloc) }
    );

    const afterMount = counter.subscribes;
    rerender();
    rerender();
    rerender();
    expect(counter.subscribes).toBe(afterMount);
    expect(counter.active).toBe(1);

    unmount();
    expect(counter.active).toBe(0);
    bloc.close();
  });

  it("reflects a changed selector on the next render", async () => {
    const bloc = makeBloc();
    const { result, rerender } = renderHook(
      ({ key }: { key: "count" | "name" }) =>
        useBloc(Ctx, select((s: S) => ({ v: s[key] }))),
      { wrapper: providerFor(bloc), initialProps: { key: "count" as const } as { key: "count" | "name" } }
    );

    expect(result.current).toEqual({ v: 0 });
    rerender({ key: "name" });
    expect(result.current).toEqual({ v: "a" });

    // And it keeps reacting to state with the new selector.
    act(() => bloc.add({ type: "rename", name: "b" }));
    await waitFor(() => expect(result.current).toEqual({ v: "b" }));
    bloc.close();
  });

  it("keeps render counts bounded in a component tree under StrictMode", async () => {
    const bloc = makeBloc();
    let renders = 0;
    function View() {
      renders++;
      const v = useBloc(Ctx, select((s: S) => ({ count: s.count, name: s.name })));
      return (
        <span>
          {v.count}-{v.name}
        </span>
      );
    }
    const Wrapper = providerFor(bloc);
    const { container } = render(
      <StrictMode>
        <Wrapper>
          <View />
        </Wrapper>
      </StrictMode>
    );
    expect(container.textContent).toBe("0-a");
    const afterMount = renders;
    expect(afterMount).toBeLessThanOrEqual(4);

    act(() => bloc.add({ type: "inc" }));
    await waitFor(() => expect(container.textContent).toBe("1-a"));
    // StrictMode double-renders; one update => at most 2 extra renders.
    expect(renders - afterMount).toBeLessThanOrEqual(2);
    bloc.close();
  });
});

describe("useBloc non-reactive strategies", () => {
  it("get/add/close/default do not subscribe to state$", () => {
    const { bloc, counter } = withSubscriptionCounter(makeBloc());
    const { result } = renderHook(
      () => ({
        b: useBloc(Ctx),
        g: useBloc(Ctx, get((b: Bloc<E, S>) => b.state.count)),
        a: useBloc(Ctx, add()),
        c: useBloc(Ctx, close()),
      }),
      { wrapper: providerFor(bloc) }
    );
    expect(result.current.b).toBe(bloc);
    expect(result.current.g).toBe(0);
    expect(result.current.a).toBe(bloc.add);
    expect(result.current.c).toBe(bloc.close);
    expect(counter.subscribes).toBe(0);
    bloc.close();
  });

  it("observe returns the same Observable across renders for a stable selector", () => {
    const bloc = makeBloc();
    const toCount = (s$: Observable<S>) => s$.pipe(map((s) => s.count));
    const { result, rerender } = renderHook(
      () => useBloc(Ctx, observe(toCount)),
      { wrapper: providerFor(bloc) }
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    bloc.close();
  });
});
