import React, { StrictMode, useState } from "react";
import { describe, it, expect } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { BehaviorSubject } from "rxjs";
import type { Bloc } from "@bloqz/core";
import { useCreateBloc } from "../src/utils/create.js";

type CounterEvent = { type: "increment" };
type CounterState = { count: number };

const counterProps = () => ({
  initialState: { count: 0 },
  handlers: {
    increment: (
      _: CounterEvent,
      { update }: { update: (fn: (s: CounterState) => CounterState) => void }
    ) => update((s) => ({ count: s.count + 1 })),
  },
});

describe("useCreateBloc", () => {
  it("should create a bloc and close it on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useCreateBloc({
        initialState: { count: 0 },
        handlers: {},
      })
    );

    const bloc = result.current;
    expect(bloc.isClosed).toBe(false);

    unmount();
    expect(bloc.isClosed).toBe(true);
  });

  it("keeps the same bloc (and its state) across re-renders with inline props", async () => {
    const { result, rerender } = renderHook(() =>
      // Inline props: a new object on every render.
      useCreateBloc<CounterEvent, CounterState>(counterProps())
    );

    const first = result.current;
    act(() => first.add({ type: "increment" }));
    await waitFor(() => expect(first.state.count).toBe(1));

    rerender();
    rerender();

    expect(result.current).toBe(first);
    expect(result.current.isClosed).toBe(false);
    expect(result.current.state.count).toBe(1);
  });

  it("keeps state when the parent component re-renders", async () => {
    const seen: Bloc<CounterEvent, CounterState>[] = [];

    function Child() {
      const bloc = useCreateBloc<CounterEvent, CounterState>(counterProps());
      seen.push(bloc);
      return null;
    }

    let bumpParent = () => {};
    function Parent() {
      const [n, setN] = useState(0);
      bumpParent = () => setN((x) => x + 1);
      return (
        <div data-n={n}>
          <Child />
        </div>
      );
    }

    render(<Parent />);
    const bloc = seen[seen.length - 1];
    act(() => bloc.add({ type: "increment" }));
    await waitFor(() => expect(bloc.state.count).toBe(1));

    act(() => bumpParent());
    act(() => bumpParent());

    const latest = seen[seen.length - 1];
    expect(latest).toBe(bloc);
    expect(latest.isClosed).toBe(false);
    expect(latest.state.count).toBe(1);
  });

  it("closes the bloc exactly once on unmount (no StrictMode)", () => {
    let closes = 0;
    const { result, unmount } = renderHook(() =>
      useCreateBloc<CounterEvent, CounterState>(counterProps())
    );
    const bloc = result.current;
    const original = bloc.close;
    (bloc as { close: () => void }).close = () => {
      closes++;
      original();
    };

    expect(bloc.isClosed).toBe(false);
    unmount();
    expect(bloc.isClosed).toBe(true);
    expect(closes).toBe(1);
  });

  it("is open and working after mount under StrictMode, and closed after unmount", async () => {
    const all: Bloc<CounterEvent, CounterState>[] = [];
    const { result, unmount } = renderHook(
      () => {
        const bloc = useCreateBloc<CounterEvent, CounterState>(counterProps());
        all.push(bloc);
        return bloc;
      },
      { wrapper: StrictMode }
    );

    const bloc = result.current;
    expect(bloc.isClosed).toBe(false);

    act(() => bloc.add({ type: "increment" }));
    await waitFor(() => expect(result.current.state.count).toBe(1));
    expect(result.current).toBe(bloc);

    unmount();
    expect(bloc.isClosed).toBe(true);
    // Every bloc ever created by the hook must be closed after unmount.
    for (const b of all) expect(b.isClosed).toBe(true);
  });

  it("never renders with a closed bloc under StrictMode", () => {
    const closedAtRender: boolean[] = [];
    renderHook(
      () => {
        const bloc = useCreateBloc<CounterEvent, CounterState>(counterProps());
        closedAtRender.push(bloc.isClosed);
        return bloc;
      },
      { wrapper: StrictMode }
    );
    expect(closedAtRender.every((c) => c === false)).toBe(true);
  });

  it("supports createPipeBloc props with inline props and StrictMode", () => {
    const source$ = new BehaviorSubject({ value: 1 });
    const { result, rerender, unmount } = renderHook(
      () => useCreateBloc<{ value: number }, never>({ source$ }),
      { wrapper: StrictMode }
    );

    const bloc = result.current;
    expect(bloc.isClosed).toBe(false);
    expect(bloc.state).toEqual({ value: 1 });

    act(() => source$.next({ value: 2 }));
    rerender();

    expect(result.current).toBe(bloc);
    expect(result.current.isClosed).toBe(false);
    expect(result.current.state).toEqual({ value: 2 });

    unmount();
    expect(bloc.isClosed).toBe(true);
  });

  it("closes the pipe bloc on unmount without StrictMode", () => {
    const source$ = new BehaviorSubject({ value: 1 });
    const { result, unmount } = renderHook(() =>
      useCreateBloc<{ value: number }, never>({ source$ })
    );
    const bloc = result.current;
    expect(bloc.isClosed).toBe(false);
    unmount();
    expect(bloc.isClosed).toBe(true);
  });

  it("recreates the bloc when deps change, closing the previous one", async () => {
    const { result, rerender, unmount } = renderHook(
      ({ start }) =>
        useCreateBloc<CounterEvent, CounterState>(
          { ...counterProps(), initialState: { count: start } },
          [start]
        ),
      { initialProps: { start: 10 } }
    );

    const first = result.current;
    expect(first.state.count).toBe(10);

    rerender({ start: 10 });
    expect(result.current).toBe(first);

    rerender({ start: 20 });
    const second = result.current;
    expect(second).not.toBe(first);
    expect(first.isClosed).toBe(true);
    expect(second.isClosed).toBe(false);
    expect(second.state.count).toBe(20);

    act(() => second.add({ type: "increment" }));
    await waitFor(() => expect(second.state.count).toBe(21));

    unmount();
    expect(second.isClosed).toBe(true);
  });

  it("recreates the bloc on deps change under StrictMode and ends open", () => {
    const { result, rerender, unmount } = renderHook(
      ({ start }) =>
        useCreateBloc<CounterEvent, CounterState>(
          { ...counterProps(), initialState: { count: start } },
          [start]
        ),
      { initialProps: { start: 1 }, wrapper: StrictMode }
    );
    const first = result.current;
    expect(first.isClosed).toBe(false);

    rerender({ start: 2 });
    const second = result.current;
    expect(second).not.toBe(first);
    expect(first.isClosed).toBe(true);
    expect(second.isClosed).toBe(false);
    expect(second.state.count).toBe(2);

    unmount();
    expect(second.isClosed).toBe(true);
  });
});
