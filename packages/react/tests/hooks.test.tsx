import React, { FC, PropsWithChildren, createContext } from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createBloc, Bloc, CreateBlocProps } from "@bloqz/core";
import { map } from "rxjs/operators";

import { useCreateBloc, useBloc, select, get, observe, add, close } from "../src/index.js";

// --- Test Setup ---

interface CounterState {
  count: number;
  name: string;
}

type CounterEvent = { type: "INCREMENT" } | { type: "DECREMENT" } | { type: "SET_NAME", name: string };

const createCounterBloc = (
  props: CreateBlocProps<CounterEvent, CounterState>
) => {
  return createBloc<CounterEvent, CounterState>({
    ...props,
    handlers: {
      INCREMENT: (_, { update }) =>
        update((s) => ({ ...s, count: s.count + 1 })),
      DECREMENT: (_, { update }) =>
        update((s) => ({ ...s, count: s.count - 1 })),
      // @ts-ignore
      SET_NAME: (event, { update }) => update((s) => ({ ...s, name: event.name })),
      ...props.handlers,
    },
  });
};

const BlocContext = createContext<Bloc<CounterEvent, CounterState> | null>(
  null
);

const wrapper: FC<
  PropsWithChildren<{ bloc: Bloc<CounterEvent, CounterState> }>
> = ({ children, bloc }) => (
  // @ts-ignore
  <BlocContext.Provider value={bloc}>{children}</BlocContext.Provider>
);

// --- Tests ---

describe("React Hooks", () => {
  describe("useCreateBloc", () => {
    it("should create a bloc and close it on unmount", () => {
      const { result, unmount } = renderHook(() =>
        useCreateBloc({
          initialState: { count: 0, name: "test" },
          handlers: {}, // Add handlers to ensure createBloc is called
        })
      );

      const bloc = result.current;
      const closeSpy = vi.spyOn(bloc, "close");

      expect(bloc).toBeDefined();
      expect(bloc.state.count).toBe(0);

      unmount();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("useBloc (Default)", () => {
    it("should return the bloc from context", () => {
      const bloc = createCounterBloc({ initialState: { count: 1, name: "" } });
      const { result } = renderHook(() => useBloc(BlocContext as any), {
        wrapper: (props) => wrapper({ ...props, bloc }),
      });

      expect(result.current).toBe(bloc);
      bloc.close();
    });

    it("should throw if used outside a provider", () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderHook(() => useBloc(BlocContext as any))).toThrow(
        "useBloc must be used within a BlocContext.Provider"
      );
      errSpy.mockRestore();
    });
  });

  describe("useBloc (Select Strategy)", () => {
    it("should return the selected state and re-render on change", async () => {
      const bloc = createCounterBloc({ initialState: { count: 5, name: "" } });
      const { result } = renderHook(
        () => useBloc(BlocContext as any, select((s: CounterState) => s.count)),
        {
          wrapper: (props) => wrapper({ ...props, bloc }),
        }
      );

      expect(result.current).toBe(5);

      act(() => {
        bloc.add({ type: "INCREMENT" });
      });

      await waitFor(() => {
        expect(result.current).toBe(6);
      });

      bloc.close();
    });

    it("should only re-render when the selected state changes", () => {
      const bloc = createCounterBloc({
        initialState: { count: 0, name: "initial" },
      });
      // @ts-ignore
      const selector = select((state: CounterState) => state.name);

      const { result } = renderHook(() => useBloc(BlocContext as any, selector), {
        wrapper: (props) => wrapper({ ...props, bloc }),
      });

      expect(result.current).toBe("initial");

      act(() => {
        bloc.add({ type: "INCREMENT" });
      });

      // Count changed, but name (selected) did not.
      expect(result.current).toBe("initial");

      bloc.close();
    });

    it("should handle dynamic selectors correctly", async () => {
      const bloc = createCounterBloc({ initialState: { count: 0, name: "A" } });

      const { result, rerender } = renderHook(
        ({ propName }) => useBloc(
            BlocContext as any,
            select((s: CounterState) => s.name === propName)
        ),
        {
          wrapper: (props) => wrapper({ ...props, bloc }),
          initialProps: { propName: "A" }
        }
      );

      // Initially "A" === "A" -> true
      expect(result.current).toBe(true);

      // Change state to "B"
      act(() => {
        // @ts-ignore
        bloc.add({ type: "SET_NAME", name: "B" });
      });
      await waitFor(() => expect(result.current).toBe(false));

      // Change prop to "B" -> selector changes logic -> should become true
      rerender({ propName: "B" });

      expect(result.current).toBe(true);

      bloc.close();
    });
  });

  describe("useBloc (Get Strategy)", () => {
    it("should return a static value from the bloc", async () => {
      const bloc = createCounterBloc({ initialState: { count: 10, name: "" } });
      const { result } = renderHook(
        () => useBloc(BlocContext as any, get((b: Bloc<any, any>) => b.state.count)),
        {
          wrapper: (props) => wrapper({ ...props, bloc }),
        }
      );

      expect(result.current).toBe(10);

      act(() => {
        bloc.add({ type: "INCREMENT" });
      });

      // Should NOT update because it's a static get
      expect(result.current).toBe(10);
      // Verify bloc actually updated, waiting for it to ensure async processing is done
      await waitFor(() => {
        expect(bloc.state.count).toBe(11);
      });

      bloc.close();
    });

    it("should return a method reference", () => {
        const bloc = createCounterBloc({ initialState: { count: 0, name: "" } });
        const { result } = renderHook(
          () => useBloc(BlocContext as any, get((b: Bloc<any, any>) => b.add)),
          {
            wrapper: (props) => wrapper({ ...props, bloc }),
          }
        );

        expect(typeof result.current).toBe("function");
        expect(result.current).toBe(bloc.add);

        bloc.close();
      });
  });

  describe("useBloc (Convenience Strategies)", () => {
    it("should return the add method via add()", async () => {
      const bloc = createCounterBloc({ initialState: { count: 0, name: "" } });
      const { result } = renderHook(
        () => useBloc(BlocContext as any, add()),
        {
          wrapper: (props) => wrapper({ ...props, bloc }),
        }
      );

      expect(typeof result.current).toBe("function");
      expect(result.current).toBe(bloc.add);

      // Verify it works
      act(() => {
        result.current({ type: "INCREMENT" });
      });

      await waitFor(() => {
        expect(bloc.state.count).toBe(1);
      });

      bloc.close();
    });

    it("should return the close method via close()", () => {
      const bloc = createCounterBloc({ initialState: { count: 0, name: "" } });
      const { result } = renderHook(
        () => useBloc(BlocContext as any, close()),
        {
          wrapper: (props) => wrapper({ ...props, bloc }),
        }
      );

      expect(typeof result.current).toBe("function");
      expect(result.current).toBe(bloc.close);

      // Verify it works
      act(() => {
        result.current();
      });
      expect(bloc.isClosed).toBe(true);
    });
  });

  describe("useBloc (Observe Strategy)", () => {
    it("should return an observable", async () => {
      const bloc = createCounterBloc({ initialState: { count: 100, name: "" } });
      const { result } = renderHook(
        () => useBloc(BlocContext as any, observe(($) => $.pipe(map((s: CounterState) => s.count)))),
        {
          wrapper: (props) => wrapper({ ...props, bloc }),
        }
      );

      // Should be an observable
      expect(result.current.subscribe).toBeDefined();

      let value: number | undefined;
      const sub = result.current.subscribe((v) => { value = v; });

      expect(value).toBe(100);

      act(() => {
        bloc.add({ type: "INCREMENT" });
      });

      await waitFor(() => {
        expect(value).toBe(101);
      });

      sub.unsubscribe();
      bloc.close();
    });
  });
});
