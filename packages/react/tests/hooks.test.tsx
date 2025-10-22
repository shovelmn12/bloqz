import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React, { FC, PropsWithChildren, createContext } from "react";
import { createBloc, Bloc, CreateBlocProps } from "@bloqz/core";
import {
  useCreateBloc,
  useBloc,
  useBlocState,
  useBlocSelectState,
} from "../src/index.js";

// --- Test Setup ---

interface CounterState {
  count: number;
  name: string;
}

type CounterEvent = { type: "INCREMENT" } | { type: "DECREMENT" };

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
      ...props.handlers,
    },
  });
};

const BlocContext = createContext<Bloc<CounterEvent, CounterState> | null>(
  null
);

const wrapper: FC<PropsWithChildren<{ bloc: Bloc<CounterEvent, CounterState> }>> =
  ({ children, bloc }) => (
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

  describe("useBloc", () => {
    it("should return the bloc from context", () => {
      const bloc = createCounterBloc({ initialState: { count: 1, name: "" } });
      const { result } = renderHook(() => useBloc(BlocContext), {
        wrapper: (props) => wrapper({ ...props, bloc }),
      });

      expect(result.current).toBe(bloc);
      bloc.close();
    });

    it("should throw if used outside a provider", () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderHook(() => useBloc(BlocContext))).toThrow(
        "useBloc must be used within a BlocContext.Provider"
      );
      errSpy.mockRestore();
    });
  });

  describe("useBlocState", () => {
    it("should return the current state and re-render on change", async () => {
      const bloc = createCounterBloc({ initialState: { count: 5, name: "" } });
      const { result } = renderHook(() => useBlocState(BlocContext), {
        wrapper: (props) => wrapper({ ...props, bloc }),
      });

      expect(result.current.count).toBe(5);

      act(() => {
        bloc.add({ type: "INCREMENT" });
      });

      await waitFor(() => {
        expect(result.current.count).toBe(6);
      });

      bloc.close();
    });
  });

  describe("useBlocSelectState", () => {
    it("should return the selected state", () => {
      const bloc = createCounterBloc({
        initialState: { count: 10, name: "selector" },
      });
      const { result } = renderHook(
        () => useBlocSelectState(BlocContext, (state) => state.name),
        {
          wrapper: (props) => wrapper({ ...props, bloc }),
        }
      );

      expect(result.current).toBe("selector");
      bloc.close();
    });

    it("should only re-render when the selected state changes", () => {
      const bloc = createCounterBloc({
        initialState: { count: 0, name: "initial" },
      });
      const selector = (state: CounterState) => state.name;

      const { result } = renderHook(
        () => useBlocSelectState(BlocContext, selector),
        {
          wrapper: (props) => wrapper({ ...props, bloc }),
        }
      );

      const initialName = result.current;
      expect(initialName).toBe("initial");

      act(() => {
        bloc.add({ type: "INCREMENT" });
      });

      // After an action that does not affect the selected state,
      // the hook's return value should remain the same.
      expect(result.current).toBe("initial");

      bloc.close();
    });
  });
});
